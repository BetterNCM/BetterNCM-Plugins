const RNPVB_ID = "rnp-video-background";
const RNPVB_VIDEO_ID = "rnpvb-video";
const RNPVB_STYLE_ID = "rnpvb-style";
const RNPVB_LOAD_TIMEOUT_MS = 15000;
const RNPVB_JOB_TIMEOUT_MS = 30 * 60 * 1000;
const RNPVB_TOOL_DIR = `${plugin.pluginPath}/tools`;
const RNPVB_DATA_DIR_NAME = "rnp-video-background-tools";
const RNPVB_LAUNCHER_PATH = `${RNPVB_TOOL_DIR}/launcher.vbs`;
const RNPVB_FILTER = "视频文件 (*.mp4;*.webm)\0*.mp4;*.webm\0所有文件 (*.*)\0*.*\0";
const RNPVB_OFFLINE_FILTER = "离线组件包 (*.zip)\0*.zip\0所有文件 (*.*)\0*.*\0";
const RNPVB_DEFAULTS = Object.freeze({
  enabled: true,
  filePath: "",
  fileName: "",
  lastDirectory: "",
  fit: "cover",
  brightness: 0.65,
  videoAudioEnabled: false,
  videoVolume: 0.35,
  syncWithMusicPlayback: true,
  autoConvert: true
});

function rnpvbClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rnpvbBaseName(filePath) {
  return String(filePath || "").split(/[\\/]/).pop() || "";
}

function rnpvbDirectoryName(filePath) {
  const value = String(filePath || "");
  const index = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
  return index > 0 ? value.slice(0, index) : "";
}

function rnpvbIsSupportedVideoPath(filePath) {
  return /\.(mp4|webm)$/i.test(String(filePath || "").trim());
}

function rnpvbNormalizeSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const numericBrightness = Number(input.brightness);
  const numericVolume = Number(input.videoVolume);
  return {
    enabled: input.enabled === undefined ? RNPVB_DEFAULTS.enabled : Boolean(input.enabled),
    filePath: typeof input.filePath === "string" ? input.filePath : "",
    fileName: typeof input.fileName === "string" ? input.fileName : "",
    lastDirectory: typeof input.lastDirectory === "string" ? input.lastDirectory : "",
    fit: input.fit === "contain" ? "contain" : "cover",
    brightness: Number.isFinite(numericBrightness)
      ? rnpvbClamp(numericBrightness, 0.15, 1)
      : RNPVB_DEFAULTS.brightness,
    videoAudioEnabled: input.videoAudioEnabled === true,
    videoVolume: Number.isFinite(numericVolume)
      ? rnpvbClamp(numericVolume, 0, 1)
      : RNPVB_DEFAULTS.videoVolume,
    syncWithMusicPlayback: input.syncWithMusicPlayback === undefined
      ? RNPVB_DEFAULTS.syncWithMusicPlayback
      : input.syncWithMusicPlayback === true,
    autoConvert: input.autoConvert === undefined
      ? RNPVB_DEFAULTS.autoConvert
      : input.autoConvert === true
  };
}

function rnpvbParseFrameRate(value) {
  const text = String(value || "0");
  const parts = text.split("/");
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1] || 1);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : 0;
}

function rnpvbAnalyzeMedia(probe) {
  const streams = Array.isArray(probe && probe.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video") || {};
  const audio = streams.find((stream) => stream.codec_type === "audio") || null;
  const formatNames = String(probe && probe.format && probe.format.format_name || "")
    .toLowerCase().split(",");
  const codec = String(video.codec_name || "").toLowerCase();
  const pixelFormat = String(video.pix_fmt || "").toLowerCase();
  const width = Number(video.width) || 0;
  const height = Number(video.height) || 0;
  const frameRate = rnpvbParseFrameRate(video.avg_frame_rate || video.r_frame_rate);
  const compatibleContainer = formatNames.some((name) =>
    ["mov", "mp4", "m4a", "3gp", "3g2", "mj2", "matroska", "webm"].includes(name)
  );
  const compatibleCodec = ["h264", "vp8", "vp9"].includes(codec);
  const compatiblePixel = ["yuv420p", "yuvj420p"].includes(pixelFormat) || codec === "vp8" || codec === "vp9";
  const reasons = [];
  if (!compatibleContainer) reasons.push("容器格式不兼容");
  if (!compatibleCodec) reasons.push(`视频编码 ${codec || "未知"} 不兼容`);
  if (!compatiblePixel) reasons.push(`像素格式 ${pixelFormat || "未知"} 不兼容`);
  if (width > 1920 || height > 1080) reasons.push(`分辨率 ${width}×${height} 超过 1080p`);
  if (frameRate > 60.01) reasons.push(`帧率 ${frameRate.toFixed(1)}fps 过高`);
  if (!video.codec_name) reasons.push("未检测到视频轨");
  return {
    compatible: reasons.length === 0,
    reasons,
    codec,
    pixelFormat,
    width,
    height,
    frameRate,
    hasAudio: Boolean(audio),
    audioCodec: audio ? String(audio.codec_name || "") : "",
    duration: Number(probe && probe.format && probe.format.duration) || 0,
    size: Number(probe && probe.format && probe.format.size) || 0
  };
}

const rnpvbState = {
  settings: rnpvbNormalizeSettings(plugin.getConfig("settings", RNPVB_DEFAULTS)),
  observer: null,
  syncTimer: null,
  destroyed: false,
  styleElement: null,
  videoElement: null,
  sourcePath: "",
  sourceUrl: "",
  mountToken: 0,
  loadTimer: null,
  failedSourcePath: "",
  convertingSourcePath: "",
  retryPlayHandler: null,
  playbackTimer: null,
  jobPollTimer: null,
  activeJob: null,
  componentReady: false,
  componentChecked: false,
  mediaInfo: null,
  workerPaths: null,
  configRoots: new Set(),
  status: {
    kind: "idle",
    message: "请选择一个 MP4 或 WebM 视频。"
  }
};

function rnpvbSetStatus(message, kind) {
  rnpvbState.status = {
    message: String(message || ""),
    kind: kind || "idle"
  };
  rnpvbRefreshConfigViews();
  if (kind === "error") {
    console.warn(`[${RNPVB_ID}] ${message}`);
  }
}

function rnpvbSaveSettings(nextSettings) {
  rnpvbState.settings = rnpvbNormalizeSettings(nextSettings);
  plugin.setConfig("settings", rnpvbState.settings);
  rnpvbRefreshConfigViews();
}

function rnpvbUpdateSettings(patch, options) {
  const previousPath = rnpvbState.settings.filePath;
  rnpvbSaveSettings(Object.assign({}, rnpvbState.settings, patch));
  if ((options && options.reloadSource) || previousPath !== rnpvbState.settings.filePath) {
    rnpvbClearMountedSource();
  }
  rnpvbApplyVisualSettings();
  rnpvbScheduleSync();
}

function rnpvbApplyVisualSettings() {
  const body = document.body;
  if (!body) return;
  body.style.setProperty("--rnpvb-fit", rnpvbState.settings.fit);
  body.style.setProperty("--rnpvb-brightness", String(rnpvbState.settings.brightness));
  const video = rnpvbState.videoElement;
  if (video) {
    video.muted = !rnpvbState.settings.videoAudioEnabled;
    video.defaultMuted = !rnpvbState.settings.videoAudioEnabled;
    video.volume = rnpvbState.settings.videoVolume;
  }
}

function rnpvbSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rnpvbJobId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function rnpvbReadJson(filePath) {
  if (typeof betterncm.fs.exists === "function" && !(await betterncm.fs.exists(filePath))) {
    return null;
  }
  try {
    const text = await betterncm.fs.readFileText(filePath);
    return text ? JSON.parse(String(text).replace(/^\uFEFF/, "")) : null;
  } catch (_error) {
    return null;
  }
}

async function rnpvbWriteJson(filePath, value) {
  await betterncm.fs.writeFileText(filePath, JSON.stringify(value));
}

async function rnpvbWorkerPaths() {
  if (rnpvbState.workerPaths) return rnpvbState.workerPaths;
  const dataRoot = String(await betterncm.app.getDataPath()).replace(/[\\/]+$/, "");
  const dataDir = `${dataRoot}/${RNPVB_DATA_DIR_NAME}`;
  rnpvbState.workerPaths = {
    dataDir,
    jobPath: `${dataDir}/job.json`,
    statusPath: `${dataDir}/status.json`,
    cancelPath: `${dataDir}/cancel.json`
  };
  return rnpvbState.workerPaths;
}

async function rnpvbRunWorker(command, parameters, options) {
  if (rnpvbState.activeJob) throw new Error("已有组件任务正在运行");
  const job = Object.assign({ protocol: 1, id: rnpvbJobId(), command }, parameters || {});
  const timeoutMs = options && options.timeoutMs || RNPVB_JOB_TIMEOUT_MS;
  const startedAt = Date.now();
  rnpvbState.activeJob = job;
  const paths = await rnpvbWorkerPaths();
  if (typeof betterncm.fs.mkdir === "function") await betterncm.fs.mkdir(paths.dataDir);
  if (typeof betterncm.fs.remove === "function") {
    try {
      if (await betterncm.fs.exists(paths.statusPath)) await betterncm.fs.remove(paths.statusPath);
    } catch (_error) {}
  }
  await rnpvbWriteJson(paths.jobPath, job);
  const launcher = RNPVB_LAUNCHER_PATH.replace(/\//g, "\\");
  await betterncm.app.exec(`wscript.exe "${launcher}" "${paths.jobPath.replace(/\//g, "\\")}"`);

  try {
    while (Date.now() - startedAt < timeoutMs) {
      await rnpvbSleep(500);
      const status = await rnpvbReadJson(paths.statusPath);
      if (!status || status.jobId !== job.id) continue;
      if (status.componentReady !== undefined) {
        rnpvbState.componentReady = Boolean(status.componentReady);
        rnpvbState.componentChecked = true;
      }
      if (status.state === "installing" || status.state === "transcoding" || status.state === "running") {
        rnpvbSetStatus(status.message || "正在处理…", "loading");
      }
      if (status.state === "completed") return status;
      if (status.state === "cancelled") throw new Error("任务已取消");
      if (status.state === "error") throw new Error(status.message || "组件任务失败");
    }
    throw new Error("组件任务等待超时");
  } finally {
    rnpvbState.activeJob = null;
    rnpvbRefreshConfigViews();
  }
}

async function rnpvbCheckComponent() {
  try {
    const result = await rnpvbRunWorker("doctor", {}, { timeoutMs: 30000 });
    rnpvbState.componentReady = Boolean(result.componentReady);
  } catch (_error) {
    rnpvbState.componentReady = false;
  }
  rnpvbState.componentChecked = true;
  rnpvbRefreshConfigViews();
  return rnpvbState.componentReady;
}

async function rnpvbInstallComponent() {
  rnpvbSetStatus("正在安装并校验 FFmpeg 6.1.1 组件…", "loading");
  const result = await rnpvbRunWorker("install");
  rnpvbState.componentReady = true;
  rnpvbState.componentChecked = true;
  rnpvbSetStatus(result.message || "转换组件安装完成。", "ok");
  if (rnpvbState.settings.filePath) await rnpvbInspectAndConvert(rnpvbState.settings.filePath);
}

async function rnpvbInstallOfflineComponent() {
  const archivePath = await betterncm.app.openFileDialog(RNPVB_OFFLINE_FILTER, rnpvbState.settings.lastDirectory || "");
  if (!archivePath) return;
  const result = await rnpvbRunWorker("installOffline", { archivePath });
  rnpvbState.componentReady = true;
  rnpvbState.componentChecked = true;
  rnpvbSetStatus(result.message || "离线组件安装完成。", "ok");
  if (rnpvbState.settings.filePath) await rnpvbInspectAndConvert(rnpvbState.settings.filePath);
}

async function rnpvbCancelWorker() {
  if (!rnpvbState.activeJob) return;
  const paths = await rnpvbWorkerPaths();
  await rnpvbWriteJson(paths.cancelPath, { jobId: rnpvbState.activeJob.id });
  rnpvbSetStatus("正在取消任务…", "loading");
}

async function rnpvbProbeVideo(filePath) {
  const result = await rnpvbRunWorker("probe", { inputPath: filePath }, { timeoutMs: 60000 });
  const analysis = rnpvbAnalyzeMedia(result.media);
  rnpvbState.mediaInfo = analysis;
  rnpvbRefreshConfigViews();
  return analysis;
}

async function rnpvbConvertVideo(filePath, force) {
  if (!rnpvbState.componentReady) throw new Error("请先安装转换组件");
  rnpvbState.convertingSourcePath = filePath;
  rnpvbSetStatus(force ? "正在压缩当前视频…" : "检测到不兼容视频，正在自动转换…", "loading");
  try {
    const result = await rnpvbRunWorker("transcode", {
      inputPath: filePath,
      keepAudio: rnpvbState.settings.videoAudioEnabled
    });
    rnpvbUpdateSettings({
      enabled: true,
      filePath: result.outputPath,
      fileName: rnpvbBaseName(result.outputPath),
      lastDirectory: rnpvbDirectoryName(result.outputPath)
    }, { reloadSource: true });
    rnpvbState.mediaInfo = rnpvbAnalyzeMedia(result.media);
    rnpvbSetStatus(`转换完成，已切换到 ${rnpvbBaseName(result.outputPath)}`, "ok");
    rnpvbScheduleSync();
    return result.outputPath;
  } finally {
    rnpvbState.convertingSourcePath = "";
  }
}

async function rnpvbInspectAndConvert(filePath) {
  if (!rnpvbState.settings.autoConvert) return null;
  if (!rnpvbState.componentChecked) await rnpvbCheckComponent();
  if (!rnpvbState.componentReady) {
    rnpvbSetStatus("视频已选择。安装 FFmpeg 组件后可自动检测和转换；当前仍会先尝试直接播放。", "idle");
    return null;
  }
  const analysis = await rnpvbProbeVideo(filePath);
  if (!analysis.compatible) return rnpvbConvertVideo(filePath, false);
  rnpvbSetStatus(`检测完成：${analysis.codec.toUpperCase()} ${analysis.width}×${analysis.height}，可直接播放。`, "ok");
  return filePath;
}

function rnpvbMusicIsPlaying() {
  const playButton = document.querySelector('.am-music-play[aria-label]');
  if (playButton) return playButton.getAttribute("aria-label") === "Pause";
  const nativeButton = document.querySelector('#main-player [aria-label="Pause"], #main-player .btn-pause, #main-player .pause');
  if (nativeButton) return true;
  const audio = document.querySelector("audio");
  if (audio) return !audio.paused;
  return true;
}

function rnpvbSyncPlayback() {
  const video = rnpvbState.videoElement;
  if (!video || !document.body || !document.body.classList.contains("mq-playing")) return;
  if (!rnpvbState.settings.syncWithMusicPlayback || rnpvbMusicIsPlaying()) {
    if (video.paused && video.readyState >= 2) rnpvbAttemptPlay(video);
  } else if (!video.paused) {
    video.pause();
  }
}

function rnpvbClearLoadTimer() {
  if (!rnpvbState.loadTimer) return;
  clearTimeout(rnpvbState.loadTimer);
  rnpvbState.loadTimer = null;
}

function rnpvbSetPagePhase(phase) {
  const body = document.body;
  if (!body) return;
  body.classList.remove(
    "rnpvb-active",
    "rnpvb-has-source",
    "rnpvb-loading",
    "rnpvb-ready"
  );
  if (phase === "loading") {
    body.classList.add("rnpvb-active", "rnpvb-has-source", "rnpvb-loading");
  } else if (phase === "ready") {
    body.classList.add("rnpvb-active", "rnpvb-has-source", "rnpvb-ready");
  }
}

async function rnpvbInjectStyles() {
  const previous = document.getElementById(RNPVB_STYLE_ID);
  if (previous) previous.remove();

  const style = document.createElement("style");
  style.id = RNPVB_STYLE_ID;
  try {
    const cssPath = `${plugin.pluginPath}/style.css`;
    const cssText = await betterncm.fs.readFileText(cssPath);
    if (!cssText || !String(cssText).includes(`#${RNPVB_VIDEO_ID}`)) {
      throw new Error("style.css 内容为空或不完整");
    }
    style.textContent = String(cssText);
  } catch (error) {
    style.textContent = `#${RNPVB_VIDEO_ID}{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:2;opacity:0}`;
    rnpvbSetStatus(`样式文件加载失败：${error.message || error}`, "error");
  }
  document.head.appendChild(style);
  rnpvbState.styleElement = style;
}

function rnpvbClearMountedSource() {
  rnpvbState.mountToken += 1;
  rnpvbClearLoadTimer();
  rnpvbState.failedSourcePath = "";
  rnpvbState.sourcePath = "";
  rnpvbState.sourceUrl = "";
  rnpvbSetPagePhase("idle");
  const video = rnpvbState.videoElement;
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

async function rnpvbMountSource(filePath) {
  if (!rnpvbIsSupportedVideoPath(filePath)) {
    throw new Error("仅支持 MP4 或 WebM 文件");
  }

  if (typeof betterncm.fs.exists === "function") {
    const exists = await betterncm.fs.exists(filePath);
    if (!exists) throw new Error("视频文件不存在，请重新选择");
  }

  const mountedUrl = await betterncm.fs.mountFile(filePath);
  const normalizedUrl = String(mountedUrl || "").trim();
  if (!normalizedUrl) throw new Error("BetterNCM 未能挂载该视频文件");
  return normalizedUrl;
}

async function rnpvbEnsureMountedSource() {
  const filePath = rnpvbState.settings.filePath;
  if (rnpvbState.sourcePath === filePath && rnpvbState.sourceUrl) {
    return rnpvbState.sourceUrl;
  }

  const token = ++rnpvbState.mountToken;
  rnpvbSetStatus(`正在加载 ${rnpvbState.settings.fileName || rnpvbBaseName(filePath)}…`, "loading");
  const mountedUrl = await rnpvbMountSource(filePath);
  if (token !== rnpvbState.mountToken) return "";
  rnpvbState.sourcePath = filePath;
  rnpvbState.sourceUrl = mountedUrl;
  return mountedUrl;
}

function rnpvbMediaErrorMessage(mediaError) {
  const code = Number(mediaError && mediaError.code);
  if (code === 1) return "视频加载已取消，请点击“重新加载”再试。";
  if (code === 2) return "视频文件读取失败，请确认文件仍然存在且可访问。";
  if (code === 3) {
    return "视频解码失败。建议使用 MP4（H.264/AVC + AAC，yuv420p）或 WebM（VP8/VP9）。";
  }
  if (code === 4) {
    return "视频编码或封装格式不受支持。建议转换为 MP4（H.264/AVC + AAC，yuv420p）。";
  }
  return "视频无法播放，请确认文件有效；推荐使用 MP4（H.264/AVC + AAC）。";
}

function rnpvbIsCurrentVideo(video) {
  return Boolean(
    video &&
    video === rnpvbState.videoElement &&
    video.dataset.rnpvbMountToken === String(rnpvbState.mountToken)
  );
}

function rnpvbFailVideo(video, message) {
  if (!rnpvbIsCurrentVideo(video)) return;
  rnpvbClearLoadTimer();
  rnpvbState.failedSourcePath = rnpvbState.settings.filePath;
  rnpvbDeactivate(true);
  rnpvbSetStatus(message || rnpvbMediaErrorMessage(video.error), "error");
  if (rnpvbState.settings.autoConvert && rnpvbState.componentReady) {
    const failedPath = rnpvbState.settings.filePath;
    if (rnpvbState.convertingSourcePath === failedPath) return;
    rnpvbConvertVideo(failedPath, false).catch((error) => {
      rnpvbSetStatus(error.message || String(error), "error");
    });
  }
}

function rnpvbMarkVideoReady(video) {
  if (!rnpvbIsCurrentVideo(video)) return;
  const body = document.body;
  if (
    !body ||
    !body.classList.contains("mq-playing") ||
    !video.parentElement ||
    !video.parentElement.classList.contains("rnp-bg")
  ) return;

  rnpvbClearLoadTimer();
  rnpvbSetPagePhase("ready");
  rnpvbSetStatus(`正在播放 ${rnpvbState.settings.fileName || "本地视频"}`, "ok");
}

function rnpvbBeginVideoLoad(video) {
  if (!rnpvbIsCurrentVideo(video)) return;
  rnpvbSetPagePhase("loading");
  rnpvbClearLoadTimer();
  const expectedToken = rnpvbState.mountToken;
  rnpvbState.loadTimer = setTimeout(() => {
    rnpvbState.loadTimer = null;
    if (
      expectedToken === rnpvbState.mountToken &&
      rnpvbIsCurrentVideo(video) &&
      video.readyState < 2
    ) {
      rnpvbFailVideo(
        video,
        "视频加载超时，已恢复原背景。请重新加载，或转换为 H.264/AVC 格式。"
      );
    }
  }, RNPVB_LOAD_TIMEOUT_MS);
}

function rnpvbBindVideoEvents(video) {
  if (video.dataset.rnpvbBound === "1") return;
  video.dataset.rnpvbBound = "1";
  video.addEventListener("loadeddata", () => rnpvbMarkVideoReady(video));
  video.addEventListener("canplay", () => rnpvbMarkVideoReady(video));
  video.addEventListener("error", () => {
    rnpvbFailVideo(video, rnpvbMediaErrorMessage(video.error));
  });
}

function rnpvbEnsureVideo(backgroundContainer, sourceUrl) {
  let video = document.getElementById(RNPVB_VIDEO_ID);
  if (!video) {
    video = document.createElement("video");
    video.id = RNPVB_VIDEO_ID;
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("playsinline", "");
    video.autoplay = true;
    video.loop = true;
    video.muted = !rnpvbState.settings.videoAudioEnabled;
    video.defaultMuted = !rnpvbState.settings.videoAudioEnabled;
    video.volume = rnpvbState.settings.videoVolume;
    video.preload = "auto";
    rnpvbBindVideoEvents(video);
  }

  if (video.parentElement !== backgroundContainer) {
    backgroundContainer.appendChild(video);
  }

  rnpvbState.videoElement = video;
  video.dataset.rnpvbMountToken = String(rnpvbState.mountToken);

  if (video.getAttribute("src") !== sourceUrl) {
    rnpvbBeginVideoLoad(video);
    video.src = sourceUrl;
    video.load();
  } else if (video.readyState >= 2) {
    rnpvbMarkVideoReady(video);
  } else if (!rnpvbState.loadTimer) {
    rnpvbBeginVideoLoad(video);
  }

  return video;
}

async function rnpvbAttemptPlay(video) {
  try {
    const playResult = video.play();
    if (playResult && typeof playResult.then === "function") await playResult;
  } catch (error) {
    if (error && error.name !== "NotAllowedError") {
      if (error.name !== "AbortError") {
        rnpvbFailVideo(video, rnpvbMediaErrorMessage(video.error));
      }
      return;
    }
    rnpvbSetStatus("自动播放被拦截；在播放页点击一次即可继续。", "error");
    if (rnpvbState.retryPlayHandler) {
      document.removeEventListener("pointerdown", rnpvbState.retryPlayHandler, true);
    }
    rnpvbState.retryPlayHandler = () => {
      video.muted = !rnpvbState.settings.videoAudioEnabled;
      video.volume = rnpvbState.settings.videoVolume;
      video.play().catch((retryError) => {
        if (retryError && retryError.name === "NotAllowedError") {
          rnpvbSetStatus("仍无法自动播放，请在插件设置中点击“重新加载”。", "error");
        } else {
          rnpvbFailVideo(video, rnpvbMediaErrorMessage(video.error));
        }
      });
      rnpvbState.retryPlayHandler = null;
    };
    document.addEventListener("pointerdown", rnpvbState.retryPlayHandler, {
      once: true,
      capture: true
    });
  }
}

function rnpvbDeactivate(removeVideo) {
  rnpvbClearLoadTimer();
  rnpvbSetPagePhase("idle");
  const video = rnpvbState.videoElement || document.getElementById(RNPVB_VIDEO_ID);
  if (video) {
    video.pause();
    if (removeVideo) video.remove();
  }
  if (removeVideo) rnpvbState.videoElement = null;
}

async function rnpvbSyncPage() {
  if (rnpvbState.destroyed) return;
  const body = document.body;
  const pageContainer = document.querySelector(".g-single");
  const onRefinedNowPlaying = Boolean(
    body &&
    pageContainer &&
    body.classList.contains("refined-now-playing") &&
    body.classList.contains("mq-playing")
  );

  if (!rnpvbState.settings.enabled || !rnpvbState.settings.filePath) {
    rnpvbDeactivate(true);
    return;
  }

  if (!onRefinedNowPlaying) {
    rnpvbDeactivate(false);
    return;
  }

  if (rnpvbState.failedSourcePath === rnpvbState.settings.filePath) {
    return;
  }

  const backgroundContainer =
    document.querySelector("#rnp-view .g-single > .rnp-bg") ||
    document.querySelector(".g-single > .rnp-bg");
  if (!backgroundContainer) {
    rnpvbDeactivate(false);
    rnpvbSetStatus("正在等待 RefinedNowPlaying Next 背景层…", "loading");
    return;
  }

  try {
    const sourceUrl = await rnpvbEnsureMountedSource();
    if (!sourceUrl || rnpvbState.destroyed) return;
    const currentBackground =
      document.querySelector("#rnp-view .g-single > .rnp-bg") ||
      document.querySelector(".g-single > .rnp-bg");
    if (!currentBackground || !document.body.classList.contains("mq-playing")) return;

    const video = rnpvbEnsureVideo(currentBackground, sourceUrl);
    rnpvbApplyVisualSettings();
    rnpvbSyncPlayback();
  } catch (error) {
    rnpvbState.failedSourcePath = rnpvbState.settings.filePath;
    rnpvbDeactivate(true);
    rnpvbSetStatus(error.message || String(error), "error");
  }
}

function rnpvbScheduleSync() {
  if (rnpvbState.destroyed) return;
  if (rnpvbState.syncTimer) clearTimeout(rnpvbState.syncTimer);
  rnpvbState.syncTimer = setTimeout(() => {
    rnpvbState.syncTimer = null;
    rnpvbSyncPage();
  }, 80);
}

function rnpvbCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  Object.entries(attributes || {}).forEach(([key, value]) => {
    if (key === "className") element.className = value;
    else if (key === "textContent") element.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  });
  (children || []).forEach((child) => {
    element.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return element;
}

function rnpvbConfigRow(label, control) {
  return rnpvbCreateElement("div", { className: "rnpvb-row" }, [
    rnpvbCreateElement("div", { textContent: label }),
    rnpvbCreateElement("div", { className: "rnpvb-control" }, [control])
  ]);
}

async function rnpvbChooseVideo(button) {
  if (button) button.disabled = true;
  try {
    const filePath = await betterncm.app.openFileDialog(
      RNPVB_FILTER,
      rnpvbState.settings.lastDirectory || ""
    );
    if (!filePath) {
      rnpvbSetStatus("未更改视频。", "idle");
      return;
    }
    if (!rnpvbIsSupportedVideoPath(filePath)) {
      throw new Error("请选择扩展名为 .mp4 或 .webm 的视频文件");
    }
    rnpvbUpdateSettings({
      enabled: true,
      filePath,
      fileName: rnpvbBaseName(filePath),
      lastDirectory: rnpvbDirectoryName(filePath)
    }, { reloadSource: true });
    rnpvbSetStatus("视频已选择，正在自动检测兼容性…", "loading");
    await rnpvbInspectAndConvert(filePath);
  } catch (error) {
    rnpvbSetStatus(error.message || String(error), "error");
  } finally {
    if (button) button.disabled = false;
  }
}

function rnpvbRefreshConfigViews() {
  rnpvbState.configRoots.forEach((root) => {
    if (!root) return;
    const enabled = root.querySelector('[data-rnpvb-field="enabled"]');
    const fit = root.querySelector('[data-rnpvb-field="fit"]');
    const brightness = root.querySelector('[data-rnpvb-field="brightness"]');
    const brightnessValue = root.querySelector('[data-rnpvb-field="brightness-value"]');
    const videoAudioEnabled = root.querySelector('[data-rnpvb-field="video-audio-enabled"]');
    const videoVolume = root.querySelector('[data-rnpvb-field="video-volume"]');
    const videoVolumeValue = root.querySelector('[data-rnpvb-field="video-volume-value"]');
    const syncPlayback = root.querySelector('[data-rnpvb-field="sync-playback"]');
    const autoConvert = root.querySelector('[data-rnpvb-field="auto-convert"]');
    const component = root.querySelector('[data-rnpvb-field="component"]');
    const media = root.querySelector('[data-rnpvb-field="media"]');
    const cancelButton = root.querySelector('[data-rnpvb-action="cancel"]');
    const fileName = root.querySelector('[data-rnpvb-field="file-name"]');
    const status = root.querySelector('[data-rnpvb-field="status"]');
    const dependency = root.querySelector('[data-rnpvb-field="dependency"]');

    if (enabled) enabled.checked = rnpvbState.settings.enabled;
    if (fit) fit.value = rnpvbState.settings.fit;
    if (brightness) brightness.value = String(rnpvbState.settings.brightness);
    if (brightnessValue) brightnessValue.textContent = `${Math.round(rnpvbState.settings.brightness * 100)}%`;
    if (videoAudioEnabled) videoAudioEnabled.checked = rnpvbState.settings.videoAudioEnabled;
    if (videoVolume) {
      videoVolume.value = String(rnpvbState.settings.videoVolume);
      videoVolume.disabled = !rnpvbState.settings.videoAudioEnabled;
    }
    if (videoVolumeValue) videoVolumeValue.textContent = `${Math.round(rnpvbState.settings.videoVolume * 100)}%`;
    if (syncPlayback) syncPlayback.checked = rnpvbState.settings.syncWithMusicPlayback;
    if (autoConvert) autoConvert.checked = rnpvbState.settings.autoConvert;
    if (component) {
      component.textContent = !rnpvbState.componentChecked
        ? "尚未检测"
        : rnpvbState.componentReady ? "FFmpeg 6.1.1 已安装并通过校验" : "未安装";
    }
    if (media) {
      const info = rnpvbState.mediaInfo;
      media.textContent = !info ? "尚未检测" :
        `${info.codec.toUpperCase() || "未知"} · ${info.width}×${info.height} · ${info.frameRate.toFixed(1)}fps · ${info.compatible ? "兼容" : info.reasons.join("；")}`;
    }
    if (cancelButton) cancelButton.hidden = !rnpvbState.activeJob;
    if (fileName) fileName.textContent = rnpvbState.settings.fileName || "尚未选择";
    if (status) {
      status.textContent = rnpvbState.status.message;
      status.dataset.kind = rnpvbState.status.kind;
    }
    if (dependency) {
      const ready = Boolean(window.loadedPlugins && window.loadedPlugins.RefinedNowPlayingNext);
      dependency.textContent = ready
        ? "RefinedNowPlaying Next 已加载"
        : "未检测到 RefinedNowPlaying Next";
    }
  });
}

function rnpvbCreateConfigView() {
  const root = rnpvbCreateElement("div", { className: "rnpvb-config" });
  rnpvbState.configRoots.add(root);

  const title = rnpvbCreateElement("h2", { textContent: "RNP Video Background" });
  const lead = rnpvbCreateElement("p", {
    className: "rnpvb-lead",
    textContent: "在 RefinedNowPlaying Next 中循环播放本地视频；可自动检测并转换不兼容或过重的视频。"
  });

  const enabledInput = rnpvbCreateElement("input", {
    type: "checkbox",
    "data-rnpvb-field": "enabled",
    onchange: (event) => rnpvbUpdateSettings({ enabled: event.target.checked })
  });

  const fileName = rnpvbCreateElement("span", {
    className: "rnpvb-file-name",
    "data-rnpvb-field": "file-name"
  });
  const chooseButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "选择 MP4/WebM"
  });
  chooseButton.addEventListener("click", () => rnpvbChooseVideo(chooseButton));
  const fileControl = rnpvbCreateElement("div", { className: "rnpvb-control" }, [
    fileName,
    chooseButton
  ]);

  const fitSelect = rnpvbCreateElement("select", {
    "data-rnpvb-field": "fit",
    onchange: (event) => rnpvbUpdateSettings({ fit: event.target.value })
  }, [
    rnpvbCreateElement("option", { value: "cover", textContent: "裁切铺满" }),
    rnpvbCreateElement("option", { value: "contain", textContent: "完整显示" })
  ]);

  const brightnessInput = rnpvbCreateElement("input", {
    type: "range",
    min: "0.15",
    max: "1",
    step: "0.05",
    "data-rnpvb-field": "brightness",
    oninput: (event) => rnpvbUpdateSettings({ brightness: Number(event.target.value) })
  });
  const brightnessValue = rnpvbCreateElement("span", {
    className: "rnpvb-range-value",
    "data-rnpvb-field": "brightness-value"
  });
  const brightnessControl = rnpvbCreateElement("div", { className: "rnpvb-control" }, [
    brightnessInput,
    brightnessValue
  ]);

  const videoAudioInput = rnpvbCreateElement("input", {
    type: "checkbox", "data-rnpvb-field": "video-audio-enabled",
    onchange: (event) => rnpvbUpdateSettings({ videoAudioEnabled: event.target.checked })
  });
  const videoVolumeInput = rnpvbCreateElement("input", {
    type: "range", min: "0", max: "1", step: "0.05", "data-rnpvb-field": "video-volume",
    oninput: (event) => rnpvbUpdateSettings({ videoVolume: Number(event.target.value) })
  });
  const videoVolumeValue = rnpvbCreateElement("span", {
    className: "rnpvb-range-value", "data-rnpvb-field": "video-volume-value"
  });
  const videoVolumeControl = rnpvbCreateElement("div", { className: "rnpvb-control" }, [
    videoVolumeInput, videoVolumeValue
  ]);
  const syncPlaybackInput = rnpvbCreateElement("input", {
    type: "checkbox", "data-rnpvb-field": "sync-playback",
    onchange: (event) => rnpvbUpdateSettings({ syncWithMusicPlayback: event.target.checked })
  });
  const autoConvertInput = rnpvbCreateElement("input", {
    type: "checkbox", "data-rnpvb-field": "auto-convert",
    onchange: (event) => rnpvbUpdateSettings({ autoConvert: event.target.checked })
  });
  const component = rnpvbCreateElement("span", { "data-rnpvb-field": "component" });
  const media = rnpvbCreateElement("span", {
    "data-rnpvb-field": "media", className: "rnpvb-file-name"
  });

  const dependency = rnpvbCreateElement("span", {
    "data-rnpvb-field": "dependency"
  });

  const card = rnpvbCreateElement("div", { className: "rnpvb-card" }, [
    rnpvbConfigRow("启用视频背景", enabledInput),
    rnpvbCreateElement("div", { className: "rnpvb-row" }, [
      rnpvbCreateElement("div", { textContent: "本地视频" }),
      fileControl
    ]),
    rnpvbConfigRow("填充方式", fitSelect),
    rnpvbCreateElement("div", { className: "rnpvb-row" }, [
      rnpvbCreateElement("div", { textContent: "背景亮度" }),
      brightnessControl
    ]),
    rnpvbConfigRow("播放视频声音", videoAudioInput),
    rnpvbCreateElement("div", { className: "rnpvb-row" }, [
      rnpvbCreateElement("div", { textContent: "视频音量" }), videoVolumeControl
    ]),
    rnpvbConfigRow("与音乐同步暂停/继续", syncPlaybackInput),
    rnpvbConfigRow("自动检测并转换", autoConvertInput),
    rnpvbConfigRow("转换组件", component),
    rnpvbConfigRow("当前媒体", media),
    rnpvbConfigRow("依赖状态", dependency)
  ]);

  const installButton = rnpvbCreateElement("button", {
    type: "button", textContent: "安装转换组件",
    onclick: () => rnpvbInstallComponent().catch((error) => rnpvbSetStatus(error.message || String(error), "error"))
  });
  const offlineButton = rnpvbCreateElement("button", {
    type: "button", textContent: "导入离线组件包",
    onclick: () => rnpvbInstallOfflineComponent().catch((error) => rnpvbSetStatus(error.message || String(error), "error"))
  });
  const compressButton = rnpvbCreateElement("button", {
    type: "button", textContent: "重新压缩当前视频",
    onclick: () => {
      if (!rnpvbState.settings.filePath) return rnpvbSetStatus("请先选择视频。", "error");
      rnpvbConvertVideo(rnpvbState.settings.filePath, true)
        .catch((error) => rnpvbSetStatus(error.message || String(error), "error"));
    }
  });
  const cancelButton = rnpvbCreateElement("button", {
    type: "button", textContent: "取消当前任务", "data-rnpvb-action": "cancel",
    onclick: () => rnpvbCancelWorker().catch((error) => rnpvbSetStatus(error.message || String(error), "error"))
  });

  const reloadButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "重新加载",
    onclick: () => {
      rnpvbClearMountedSource();
      rnpvbSetStatus("正在重新加载视频…", "loading");
      rnpvbScheduleSync();
    }
  });
  const clearButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "清除视频",
    onclick: () => {
      rnpvbUpdateSettings({ filePath: "", fileName: "" }, { reloadSource: true });
      rnpvbSetStatus("视频已清除，RefinedNowPlaying Next 原界面已恢复。", "idle");
    }
  });
  const resetButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "恢复显示默认值",
    onclick: () => {
      rnpvbUpdateSettings({
        enabled: RNPVB_DEFAULTS.enabled,
        fit: RNPVB_DEFAULTS.fit,
        brightness: RNPVB_DEFAULTS.brightness,
        videoAudioEnabled: RNPVB_DEFAULTS.videoAudioEnabled,
        videoVolume: RNPVB_DEFAULTS.videoVolume,
        syncWithMusicPlayback: RNPVB_DEFAULTS.syncWithMusicPlayback,
        autoConvert: RNPVB_DEFAULTS.autoConvert
      });
      rnpvbSetStatus("显示设置已恢复；当前视频保留。", "ok");
    }
  });

  const actions = rnpvbCreateElement("div", { className: "rnpvb-actions" }, [
    installButton,
    offlineButton,
    compressButton,
    cancelButton,
    reloadButton,
    clearButton,
    resetButton
  ]);
  const status = rnpvbCreateElement("div", {
    className: "rnpvb-status",
    "data-rnpvb-field": "status"
  });
  const note = rnpvbCreateElement("p", {
    className: "rnpvb-note",
    textContent: "转换组件约需下载 56 MB，来源依次为 npmmirror 与 GitHub，并固定校验 SHA-256。输出为 H.264 1080p30 MP4，原视频永不覆盖。视频声音默认关闭；关闭时转换输出会移除音轨。插件不会切换歌词 Overview/复制模式或修改 RNP 歌词设置。"
  });

  root.append(title, lead, card, actions, status, note);
  rnpvbRefreshConfigViews();
  return root;
}

function rnpvbDestroy() {
  rnpvbState.destroyed = true;
  if (rnpvbState.syncTimer) clearTimeout(rnpvbState.syncTimer);
  if (rnpvbState.observer) rnpvbState.observer.disconnect();
  if (rnpvbState.playbackTimer) clearInterval(rnpvbState.playbackTimer);
  if (rnpvbState.retryPlayHandler) {
    document.removeEventListener("pointerdown", rnpvbState.retryPlayHandler, true);
  }
  rnpvbDeactivate(true);
  rnpvbClearMountedSource();
  if (rnpvbState.styleElement) rnpvbState.styleElement.remove();
  if (document.body) {
    document.body.style.removeProperty("--rnpvb-fit");
    document.body.style.removeProperty("--rnpvb-brightness");
  }
}

async function rnpvbBootstrap(selfPlugin) {
  if (window.__RNPVB_RUNTIME__ && typeof window.__RNPVB_RUNTIME__.destroy === "function") {
    window.__RNPVB_RUNTIME__.destroy();
  }
  rnpvbState.destroyed = false;
  await rnpvbInjectStyles();
  rnpvbApplyVisualSettings();

  rnpvbState.observer = new MutationObserver(rnpvbScheduleSync);
  rnpvbState.observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true
  });
  rnpvbState.playbackTimer = setInterval(rnpvbSyncPlayback, 500);
  window.addEventListener("hashchange", rnpvbScheduleSync);

  const runtime = {
    destroy: () => {
      window.removeEventListener("hashchange", rnpvbScheduleSync);
      rnpvbDestroy();
    },
    reload: () => {
      rnpvbClearMountedSource();
      rnpvbScheduleSync();
    },
    getStatus: () => Object.assign({}, rnpvbState.status)
  };
  window.__RNPVB_RUNTIME__ = runtime;
  selfPlugin.rnpVideoBackground = runtime;
  rnpvbCheckComponent().catch(() => {});
  rnpvbScheduleSync();
}

if (globalThis.__RNPVB_TESTING__) {
  globalThis.__RNPVB_TEST_API__ = {
    baseName: rnpvbBaseName,
    directoryName: rnpvbDirectoryName,
    isSupportedVideoPath: rnpvbIsSupportedVideoPath,
    normalizeSettings: rnpvbNormalizeSettings,
    mediaErrorMessage: rnpvbMediaErrorMessage,
    parseFrameRate: rnpvbParseFrameRate,
    analyzeMedia: rnpvbAnalyzeMedia
  };
}

plugin.onLoad((selfPlugin) => {
  rnpvbBootstrap(selfPlugin).catch((error) => {
    rnpvbSetStatus(`插件初始化失败：${error.message || error}`, "error");
  });
});

plugin.onAllPluginsLoaded(() => {
  rnpvbScheduleSync();
  rnpvbRefreshConfigViews();
});

plugin.onConfig(() => rnpvbCreateConfigView());

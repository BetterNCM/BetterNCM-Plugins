const RNPVB_ID = "rnp-video-background";
const RNPVB_VIDEO_ID = "rnpvb-video";
const RNPVB_STYLE_ID = "rnpvb-style";
const RNPVB_LOAD_TIMEOUT_MS = 15000;
const RNPVB_FILTER = "视频文件 (*.mp4;*.webm)\0*.mp4;*.webm\0所有文件 (*.*)\0*.*\0";
const RNPVB_DEFAULTS = Object.freeze({
  enabled: true,
  filePath: "",
  fileName: "",
  lastDirectory: "",
  fit: "cover",
  brightness: 0.65,
  compactControls: false
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
  return {
    enabled: input.enabled === undefined ? RNPVB_DEFAULTS.enabled : Boolean(input.enabled),
    filePath: typeof input.filePath === "string" ? input.filePath : "",
    fileName: typeof input.fileName === "string" ? input.fileName : "",
    lastDirectory: typeof input.lastDirectory === "string" ? input.lastDirectory : "",
    fit: input.fit === "contain" ? "contain" : "cover",
    brightness: Number.isFinite(numericBrightness)
      ? rnpvbClamp(numericBrightness, 0.15, 1)
      : RNPVB_DEFAULTS.brightness,
    compactControls: input.compactControls === true
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
  retryPlayHandler: null,
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
  body.classList.toggle("rnpvb-compact-controls", rnpvbState.settings.compactControls);
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
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
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
      video.muted = true;
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
    await rnpvbAttemptPlay(video);
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
    rnpvbSetStatus("视频已选择，进入 RefinedNowPlaying Next 播放页即可查看。", "ok");
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
    const compactControls = root.querySelector('[data-rnpvb-field="compact-controls"]');
    const fileName = root.querySelector('[data-rnpvb-field="file-name"]');
    const status = root.querySelector('[data-rnpvb-field="status"]');
    const dependency = root.querySelector('[data-rnpvb-field="dependency"]');

    if (enabled) enabled.checked = rnpvbState.settings.enabled;
    if (fit) fit.value = rnpvbState.settings.fit;
    if (brightness) brightness.value = String(rnpvbState.settings.brightness);
    if (brightnessValue) brightnessValue.textContent = `${Math.round(rnpvbState.settings.brightness * 100)}%`;
    if (compactControls) compactControls.checked = rnpvbState.settings.compactControls;
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
    textContent: "在 RefinedNowPlaying Next 中循环静音播放本地视频；可选择是否精简底部播放控件。"
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

  const compactControlsInput = rnpvbCreateElement("input", {
    type: "checkbox",
    "data-rnpvb-field": "compact-controls",
    onchange: (event) => rnpvbUpdateSettings({ compactControls: event.target.checked })
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
    rnpvbConfigRow("精简播放控件", compactControlsInput),
    rnpvbConfigRow("依赖状态", dependency)
  ]);

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
        compactControls: RNPVB_DEFAULTS.compactControls
      });
      rnpvbSetStatus("显示设置已恢复；当前视频保留。", "ok");
    }
  });

  const actions = rnpvbCreateElement("div", { className: "rnpvb-actions" }, [
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
    textContent: "“精简播放控件”默认关闭；开启后仅隐藏底部播放栏、进度条、音量和 v3 控件，RNP 设置与歌词功能仍会保留。推荐格式：MP4（H.264/AVC + AAC）或 WebM（VP8/VP9）。HEVC/H.265 可能无法播放。文件路径仅保存在本机。"
  });

  root.append(title, lead, card, actions, status, note);
  rnpvbRefreshConfigViews();
  return root;
}

function rnpvbDestroy() {
  rnpvbState.destroyed = true;
  if (rnpvbState.syncTimer) clearTimeout(rnpvbState.syncTimer);
  if (rnpvbState.observer) rnpvbState.observer.disconnect();
  if (rnpvbState.retryPlayHandler) {
    document.removeEventListener("pointerdown", rnpvbState.retryPlayHandler, true);
  }
  rnpvbDeactivate(true);
  rnpvbClearMountedSource();
  if (rnpvbState.styleElement) rnpvbState.styleElement.remove();
  if (document.body) {
    document.body.style.removeProperty("--rnpvb-fit");
    document.body.style.removeProperty("--rnpvb-brightness");
    document.body.classList.remove("rnpvb-compact-controls");
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
  rnpvbScheduleSync();
}

if (globalThis.__RNPVB_TESTING__) {
  globalThis.__RNPVB_TEST_API__ = {
    baseName: rnpvbBaseName,
    directoryName: rnpvbDirectoryName,
    isSupportedVideoPath: rnpvbIsSupportedVideoPath,
    normalizeSettings: rnpvbNormalizeSettings,
    mediaErrorMessage: rnpvbMediaErrorMessage
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

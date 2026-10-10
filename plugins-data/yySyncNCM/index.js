/* global plugin, betterncm, betterncm_native */
(() => {
  window.__yySyncNcmPlugin?.stop();
  const root = document.createElement("div");
  root.className = "yysync-settings";
  let state = null;
  let pollTimer;
  let initialized = false;
  let populated = false;
  let fatal = "";
  const controls = {};

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const style = element("style");
  style.textContent = `
    .yysync-settings{--ys-card:#fff;--ys-text:#28282d;--ys-muted:#77777f;--ys-border:#d4d4da;--ys-blue:#147bde;color:var(--ys-text);padding:24px 20px 40px;font-size:15px;max-width:1280px}
    .yysync-settings *{box-sizing:border-box}
    .yysync-settings h2{font-size:28px;margin:0 0 28px;font-weight:650}
    .yysync-settings h3{font-size:16px;font-weight:400;color:var(--ys-muted);margin:30px 8px 14px}
    .yysync-settings .ys-card{display:flex;align-items:center;gap:24px;min-height:96px;padding:24px 30px;background:var(--ys-card);border-radius:14px;margin:0 0 14px}
    .yysync-settings .ys-icon{width:34px;flex:0 0 34px;text-align:center;font-size:23px;color:var(--ys-muted)}
    .yysync-settings .ys-copy{flex:1;min-width:0}
    .yysync-settings .ys-title{font-size:17px;line-height:1.5}
    .yysync-settings .ys-detail{color:var(--ys-muted);font-size:14px;line-height:1.6;margin-top:5px;overflow-wrap:anywhere}
    .yysync-settings input:not([type=checkbox]),.yysync-settings select{border:1px solid var(--ys-border);border-radius:6px;background:var(--ys-card);color:var(--ys-text);padding:11px 13px;font-size:15px;min-width:170px;max-width:100%}
    .yysync-settings input:focus,.yysync-settings select:focus{outline:2px solid #147bde55;outline-offset:2px}
    .yysync-settings input[type=checkbox]{appearance:none;width:46px;height:25px;background:#a6a6ad;border-radius:20px;position:relative;cursor:pointer;flex:none}
    .yysync-settings input[type=checkbox]:before{content:"";position:absolute;left:1px;top:1px;width:23px;height:23px;background:#fff;border-radius:50%;box-shadow:0 1px 3px #0003;transition:transform .15s}
    .yysync-settings input[type=checkbox]:checked{background:#84b7ec}
    .yysync-settings input[type=checkbox]:checked:before{background:var(--ys-blue);transform:translateX(21px)}
    .yysync-settings button{font-size:14px;border:1px solid var(--ys-border);border-radius:7px;background:var(--ys-card);color:var(--ys-text);padding:10px 16px;cursor:pointer}
    .yysync-settings button.ys-primary{background:var(--ys-blue);border-color:var(--ys-blue);color:#fff}
    .yysync-settings button:disabled{opacity:.5;cursor:default}
    .yysync-settings .ys-fields{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
    .yysync-settings .ys-fields input{flex:1;min-width:190px}
    .yysync-settings .ys-account{align-items:flex-start}
    .yysync-settings .ys-account .ys-copy{width:100%}
    .yysync-settings .ys-note{margin:14px 0 0;color:var(--ys-muted);font-size:13px;line-height:1.7}
    .yysync-settings .ys-error{color:#c94343;white-space:pre-wrap;margin-top:12px}
    .yysync-settings .ys-status{color:var(--ys-muted)}
    .yysync-settings .ys-status[data-connected=true]{color:#258351}
    .yysync-settings .ys-preview{font-size:17px;overflow-wrap:anywhere}
    .yysync-settings a{color:var(--ys-blue);cursor:pointer;text-decoration:none}
    .yysync-settings [hidden]{display:none!important}
    @media(prefers-color-scheme:dark){.yysync-settings{--ys-card:#29292f;--ys-text:#eee;--ys-muted:#aaaab4;--ys-border:#505059}}
    @media(max-width:700px){.yysync-settings .ys-card{padding:20px 16px;gap:12px;flex-wrap:wrap}.yysync-settings input:not([type=checkbox]),.yysync-settings select{min-width:130px}}
  `;
  root.append(style, element("h2", "yySync-NCM 设置"));

  const card = (icon, title, detail, control) => {
    const row = element("div", null, "ys-card");
    const copy = element("div", null, "ys-copy");
    copy.append(element("div", title, "ys-title"), element("div", detail, "ys-detail"));
    row.append(element("div", icon, "ys-icon"), copy);
    if (control) row.append(control);
    root.append(row);
    return copy;
  };
  const section = (name) => root.append(element("h3", name));
  const button = (text, handler, primary = false) => {
    const node = element("button", text, primary ? "ys-primary" : "");
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  };
  const call = (request) => {
    const native = betterncm_native.native_plugin;
    const registered = native.getRegisteredAPIs?.();
    if (Array.isArray(registered) && !registered.includes("yysync.dispatch")) {
      throw new Error("原生接口未注册。请安装包含 x86/x64 后端的 0.2.1 或更新插件包，彻底退出网易云后重启；仍失败时查看 BetterNCM 的 log.log 中 yySyncNCM 加载错误");
    }
    const result = native.call("yysync.dispatch", [JSON.stringify(request)]);
    const response = typeof result === "string" ? JSON.parse(result) : result;
    if (!response?.ok) throw new Error(response?.error || "原生组件未返回有效数据");
    return response;
  };
  const apply = (request) => {
    try { state = call(request); render(); }
    catch (error) { errorText.textContent = String(error.message || error); }
  };
  const toggle = (name, title, detail, icon) => {
    const input = element("input");
    input.type = "checkbox";
    input.setAttribute("aria-label", title);
    input.addEventListener("change", () => apply({ type: "configure", settings: { [name]: input.checked } }));
    controls[name] = input;
    card(icon, title, detail, input);
  };
  const link = (text, url) => {
    const node = element("a", text);
    node.href = url;
    node.addEventListener("click", (event) => { event.preventDefault(); betterncm.ncm.openUrl(url); });
    return node;
  };

  section("Steam 账号");
  const account = card("◎", "Steam 登录", "保存授权后，重启会自动复用登录凭据。密码不会保存。");
  account.parentElement.classList.add("ys-account");
  const accountStatus = element("div", "正在初始化", "ys-detail ys-status");
  const errorText = element("div", null, "ys-error");
  const form = element("form", null, "ys-fields");
  const username = element("input");
  username.type = "text"; username.placeholder = "Steam 用户名"; username.autocomplete = "username";
  username.setAttribute("aria-label", "Steam 用户名");
  const password = element("input");
  password.type = "password"; password.placeholder = "密码"; password.autocomplete = "current-password";
  password.setAttribute("aria-label", "Steam 密码");
  const login = element("button", "登录", "ys-primary"); login.type = "submit";
  form.append(username, password, login);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    apply({ type: "login", username: username.value, password: password.value });
    password.value = "";
  });
  const actions = element("div", null, "ys-fields");
  const retry = button("重试自动登录", () => {
    if (initialized) apply({ type: "retry" }); else initialize();
  });
  const logout = button("退出登录", () => apply({ type: "logout" }));
  actions.append(retry, logout);
  const guardText = element("p", null, "ys-detail");
  const guardForm = element("form", null, "ys-fields");
  const guardCode = element("input");
  guardCode.placeholder = "Steam Guard 验证码"; guardCode.autocomplete = "one-time-code";
  guardCode.setAttribute("aria-label", "Steam Guard 验证码");
  const submitGuard = element("button", "提交验证码", "ys-primary"); submitGuard.type = "submit";
  guardForm.append(guardCode, submitGuard); guardForm.hidden = true;
  guardForm.addEventListener("submit", (event) => {
    event.preventDefault(); apply({ type: "guard", code: guardCode.value }); guardCode.value = "";
  });
  account.append(accountStatus, form, guardText, guardForm, actions, errorText,
    element("p", "首次登录或 Steam 撤销授权时可能需要手机确认。连接失败时会保留已有凭据，可稍后重试。", "ys-note"));

  section("Steam 状态");
  toggle("enableSteamSync", "启用 Steam 同步", "将当前歌曲显示在 Steam 好友列表中。", "◉");
  toggle("showArtistName", "显示歌手", "在歌曲名后显示歌手信息。", "♫");
  toggle("showProgressBar", "显示播放进度", "显示进度条和播放时间，每秒更新。", "▤");
  toggle("showPausedStatus", "暂停时显示状态", "保留歌曲信息并显示暂停标记；关闭后暂停会清空状态。", "Ⅱ");

  section("显示格式");
  toggle("enableCustomPrefix", "使用自定义前缀", "在歌曲信息前添加自定义文字。", "✎");
  const prefix = element("input");
  prefix.type = "text"; prefix.maxLength = 128; prefix.placeholder = "例如：正在听 ";
  prefix.setAttribute("aria-label", "自定义前缀");
  prefix.addEventListener("change", () => apply({ type: "configure", settings: { customPrefix: prefix.value } }));
  controls.customPrefix = prefix;
  card("✎", "自定义前缀", "前缀计入 Steam 状态的长度限制。", prefix);
  const priority = element("select");
  priority.setAttribute("aria-label", "长度不足时优先保留");
  for (const [value, text] of [["Artist", "歌手信息"], ["ProgressBar", "播放进度"]]) {
    const option = element("option", text); option.value = value; priority.append(option);
  }
  priority.addEventListener("change", () => apply({ type: "configure", settings: { statusPriority: priority.value } }));
  controls.statusPriority = priority;
  card("≡", "长度不足时优先保留", "Steam 状态最长 63 字节，超出时会自动精简。", priority);
  const preview = element("div", "等待播放歌曲", "ys-preview");
  const previewCard = card("▷", "状态预览", "显示当前歌曲按上述设置生成的文字。");
  previewCard.append(preview);
  const footer = element("p", null, "ys-note");
  footer.append(link("源代码", "https://github.com/Yanxxxi/yySync-NCM"),
    document.createTextNode(" · "),
    link("问题反馈", "https://github.com/Yanxxxi/yySync-NCM/issues"));
  root.append(footer);

  function render() {
    if (!state) {
      accountStatus.textContent = "原生组件尚未就绪";
      errorText.textContent = fatal;
      login.disabled = true; logout.disabled = true; retry.disabled = false;
      retry.textContent = "重试加载组件";
      for (const input of Object.values(controls)) input.disabled = true;
      return;
    }
    retry.textContent = "重试自动登录";
    for (const input of Object.values(controls)) input.disabled = false;
    if (!populated) {
      for (const [name, input] of Object.entries(controls)) {
        if (input.type === "checkbox") input.checked = !!state.settings[name];
        else input.value = state.settings[name] ?? "";
      }
      username.value = state.username || "";
      populated = true;
    }
    prefix.disabled = !controls.enableCustomPrefix.checked;
    accountStatus.textContent = state.loggedOn ? `已登录：${state.username}` :
      state.busy ? "正在登录 Steam…" : state.hasToken ? "已保存授权，可重试自动登录" : "尚未登录 Steam";
    accountStatus.dataset.connected = String(!!state.loggedOn);
    errorText.textContent = fatal || state.error || "";
    login.disabled = !!state.busy;
    retry.disabled = !!state.busy || (initialized && !state.hasToken);
    logout.disabled = !state.hasToken && !state.busy && !state.loggedOn;
    const challenge = state.guard;
    guardText.hidden = !challenge;
    guardForm.hidden = !challenge || challenge.kind === "confirmation";
    guardText.textContent = !challenge ? "" : challenge.kind === "confirmation" ?
      "请在 Steam 手机应用中确认这次登录。" :
      `${challenge.previousCodeIncorrect ? "验证码不正确，请重新输入。" : ""}${challenge.kind === "emailCode" ? "请输入邮件中的验证码。" : "请输入 Steam 手机应用中的动态验证码。"}`;
    preview.textContent = state.preview || "等待播放歌曲";
  }

  function initialize() {
    try {
      state = call({ type: "initialize" });
      initialized = true; fatal = ""; render();
    } catch (error) {
      initialized = false;
      fatal = `无法加载 yySync 原生组件：${error.message || error}。请安装完整插件包后彻底退出并重启网易云。支持网易云 2.10.13 和 3.x，需要 InfLink-rs。`;
      render();
    }
  }
  const poll = () => {
    if (!initialized) return;
    try {
      const api = window.InfLinkApi;
      const song = api?.getCurrentSong();
      const timeline = api?.getTimeline();
      state = call({
        type: "playback",
        song: song ? { title: song.songName || "", artists: song.authorName || "" } : null,
        paused: !api || api.getPlaybackStatus() !== "Playing",
        currentTimeMs: timeline?.currentTime || 0,
        durationMs: timeline?.totalTime || song?.duration || 0
      });
      render();
    } catch (error) { errorText.textContent = String(error.message || error); }
  };
  const stop = () => {
    if (pollTimer) clearInterval(pollTimer);
    window.removeEventListener("beforeunload", stop);
    if (initialized) {
      try { call({ type: "shutdown" }); } catch (_) { }
    }
    initialized = false;
  };
  window.__yySyncNcmPlugin = { stop };
  plugin.onLoad(() => {
    initialize();
    poll();
    pollTimer = setInterval(poll, 1000);
    window.addEventListener("beforeunload", stop);
  });
  plugin.onConfig(() => root);
  plugin.onAllPluginsLoaded?.(() => { if (!initialized) { initialize(); poll(); } });
})();

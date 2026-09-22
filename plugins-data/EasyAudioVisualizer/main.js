(() => {
  // src/config.js
  var PREFIX = "easyav.";
  var DEFAULTS = {
    sampleRate: "",
    // '' = 自动取 AudioContext 采样率
    fftSize: "1024",
    startFrequency: "50",
    endFrequency: "9000",
    outBandsQty: "300",
    tWeight: "0",
    aWeight: "0",
    filterOn: "0",
    sigma: "1",
    radius: "2",
    multiFFT: "1",
    // 多分辨率分体
    maxHeight: "200",
    // 柱形条群最大高度 px
    colorMode: "white",
    // 'white' 白色半透明 | 'progress' 进度条颜色 | 'color' 彩色
    opacity: "0.85",
    // 柱形条不透明度 0.05~1
    volumeComp: "1",
    // LFP 音量电平补偿开关
    playPageOnly: "1",
    // 仅在播放页显示频谱
    yOffset: "8",
    // 垂直微调 px（正数下移）
    mfLowMid: "330",
    // 低/中频分界线 Hz
    mfMidHigh: "1300",
    // 中/高频分界线 Hz
    mfLowFft: "8192",
    // 低频段支路 fftSize
    mfMidFft: "2048",
    // 中频段支路 fftSize
    mfHighFft: "512"
    // 高频段支路 fftSize
  };
  async function readConf(key) {
    try {
      const v = await betterncm.app.readConfig(PREFIX + key, DEFAULTS[key]);
      return v === void 0 || v === null || v === "" ? DEFAULTS[key] : String(v);
    } catch (e) {
      return DEFAULTS[key];
    }
  }
  async function loadConfig() {
    const cfg2 = {};
    const keys = Object.keys(DEFAULTS);
    await Promise.all(keys.map(async (k) => {
      cfg2[k] = await readConf(k);
    }));
    return cfg2;
  }
  function saveConfig(cfg2, key) {
    try {
      betterncm.app.writeConfig(PREFIX + key, String(cfg2[key]));
    } catch (e) {
      console.error("[EasyAudioVisualizer] writeConfig failed", key, e);
    }
  }
  function el(tag, style, text) {
    const node = document.createElement(tag);
    if (style)
      node.setAttribute("style", style);
    if (text !== void 0)
      node.textContent = text;
    return node;
  }
  function row(labelText, title, control) {
    const wrap = el("div", "margin:9px 0;");
    const r = el("div", "display:flex;align-items:center;gap:8px;");
    const label = el("label", "flex:0 0 190px;font-size:13px;opacity:.9;", labelText);
    r.appendChild(label);
    r.appendChild(control);
    wrap.appendChild(r);
    if (title) {
      wrap.appendChild(el("div", "font-size:11px;opacity:.5;line-height:1.5;margin-top:3px;", title));
    }
    return wrap;
  }
  function styledInput() {
    return {
      flex: "1",
      minWidth: "0",
      padding: "4px 8px",
      fontSize: "13px",
      background: "rgba(255,255,255,.08)",
      color: "inherit",
      border: "1px solid rgba(255,255,255,.2)",
      borderRadius: "4px"
    };
  }
  function input(value, attrs, onChange) {
    const inp = el("input");
    inp.value = value;
    Object.assign(inp.style, styledInput());
    Object.entries(attrs || {}).forEach(([k, v]) => inp.setAttribute(k, v));
    inp.addEventListener("change", () => onChange(inp.value));
    return inp;
  }
  function rangeInput(value, attrs, onChange) {
    const inp = el("input");
    inp.type = "range";
    inp.value = value;
    inp.style.flex = "1";
    inp.style.minWidth = "0";
    Object.entries(attrs || {}).forEach(([k, v]) => inp.setAttribute(k, v));
    inp.addEventListener("input", () => onChange(inp.value));
    return inp;
  }
  function checkbox(checked, onChange) {
    let on = checked === "1" || checked === true;
    let disabled = false;
    const box = el("div");
    Object.assign(box.style, {
      flex: "0 0 auto",
      width: "38px",
      height: "20px",
      borderRadius: "10px",
      cursor: "pointer",
      position: "relative",
      transition: "background .15s, opacity .15s",
      background: on ? "rgba(90,200,130,.9)" : "rgba(255,255,255,.18)"
    });
    const knob = el("div");
    Object.assign(knob.style, {
      position: "absolute",
      top: "2px",
      left: on ? "20px" : "2px",
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      background: "#fff",
      transition: "left .15s"
    });
    box.appendChild(knob);
    box._setDisabled = (d) => {
      disabled = d;
      box.style.opacity = d ? ".35" : "1";
      box.style.cursor = d ? "not-allowed" : "pointer";
    };
    box.addEventListener("click", () => {
      if (disabled)
        return;
      on = !on;
      box.style.background = on ? "rgba(90,200,130,.9)" : "rgba(255,255,255,.18)";
      knob.style.left = on ? "20px" : "2px";
      onChange(on ? "1" : "0");
    });
    return box;
  }
  function select(value, options, onChange) {
    const sel = el("select");
    Object.assign(sel.style, styledInput());
    options.forEach((op) => {
      const o = el("option", "", op);
      o.value = op;
      if (String(op) === String(value))
        o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => onChange(sel.value));
    return sel;
  }
  function addSteppers(inp, step, min, max, onCommit) {
    const cur = () => parseFloat(inp.value) || 0;
    const clamp = (n) => {
      if (min !== void 0 && n < min)
        n = min;
      if (max !== void 0 && n > max)
        n = max;
      return Math.round(n * 1e3) / 1e3;
    };
    const mk = (delta) => {
      const b = el(
        "button",
        "flex:0 0 22px;padding:0;font-size:14px;cursor:pointer;background:rgba(255,255,255,.1);color:inherit;border:1px solid rgba(255,255,255,.2);border-radius:4px;line-height:1;",
        delta > 0 ? "+" : "\u2212"
      );
      b.addEventListener("click", () => {
        const n = clamp(cur() + delta * step);
        inp.value = String(n);
        onCommit(String(n));
      });
      return b;
    };
    const wrap = el("div", "display:flex;gap:4px;flex:1;min-width:0;align-items:stretch;");
    wrap.appendChild(mk(-1));
    wrap.appendChild(inp);
    wrap.appendChild(mk(1));
    return wrap;
  }
  function numInput(cfg2, key, attrs, viz2) {
    const inp = input(cfg2[key], attrs, (v) => {
      cfg2[key] = v;
      saveConfig(cfg2, key);
      viz2.rebuild();
    });
    return addSteppers(
      inp,
      parseFloat(attrs && attrs.step) || 1,
      attrs && attrs.min !== void 0 ? parseFloat(attrs.min) : void 0,
      attrs && attrs.max !== void 0 ? parseFloat(attrs.max) : void 0,
      (v) => {
        cfg2[key] = v;
        saveConfig(cfg2, key);
        viz2.rebuild();
      }
    );
  }
  function checkInput(cfg2, key, viz2, after) {
    return checkbox(cfg2[key], (v) => {
      cfg2[key] = v;
      saveConfig(cfg2, key);
      viz2.rebuild();
      if (after)
        after();
    });
  }
  function buildPanel(cfg2, viz2) {
    const root = el("div", "padding:12px;max-width:560px;");
    root.className = "eav-panel";
    const style = el("style");
    style.textContent = ".eav-panel input[type=number]::-webkit-inner-spin-button,.eav-panel input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}";
    root.appendChild(style);
    root.appendChild(el("div", "font-size:15px;font-weight:600;margin-bottom:8px;", "EasyAudioVisualizer \u8BBE\u7F6E"));
    root.appendChild(el(
      "div",
      "font-size:12px;opacity:.6;margin-bottom:10px;",
      "\u6240\u6709\u53C2\u6570\u5373\u65F6\u751F\u6548\uFF08\u91CD\u5EFA\u5904\u7406\u5668\uFF0C\u4E0D\u5F71\u54CD\u64AD\u653E\uFF09\u3002\u97F3\u9891\u6570\u636E\u6765\u81EA LibFrontendPlay \u63D2\u4EF6\uFF0C\u8BF7\u786E\u4FDD\u5DF2\u5B89\u88C5\u5E76\u542F\u7528\u3002"
    ));
    const statsBox = el(
      "pre",
      "font-size:11px;line-height:1.6;background:rgba(0,0,0,.55);color:#fff;padding:8px 10px;border-radius:6px;white-space:pre-wrap;margin:0 0 10px;"
    );
    root.appendChild(statsBox);
    const statsTimer = setInterval(() => {
      if (!root.isConnected) {
        clearInterval(statsTimer);
        return;
      }
      try {
        const s = viz2.getStats();
        const srcName = s.source === "lfp" ? "LibFrontendPlay" : "\u7B49\u5F85 LibFrontendPlay";
        const lines = [
          "\u6570\u636E\u6E90: " + srcName + "    \u951A\u70B9: " + (s.anchorMode || "-") + "    \u7ED8\u5236\u5E27\u6570: " + s.frames,
          "\u751F\u6548\u91C7\u6837\u7387: " + (s.sampleRate || "-") + " Hz    fftSize: " + (s.fftSize || (s.multiFFT ? "\u6309\u652F\u8DEF" : "-")) + "    \u5E26\u5BBD: " + (s.bandwidth ? s.bandwidth.toFixed(2) + " Hz/\u70B9" : "-"),
          "\u9891\u6BB5: " + cfg2.startFrequency + " ~ " + cfg2.endFrequency + " Hz    \u8F93\u51FA\u9891\u5E26: " + s.outBandsQty + "    \u500D\u9891\u7A0B\u500D\u7387: " + (s.sampleRate && s.outBandsQty ? Math.pow(2, Math.log2(Math.max(20, parseFloat(cfg2.endFrequency)) / Math.max(20, parseFloat(cfg2.startFrequency))) / s.outBandsQty).toFixed(4) : "-"),
          "\u9AD8\u65AF\u6EE4\u6CE2: " + s.filter + "    \u65F6\u95F4\u8BA1\u6743: " + (cfg2.tWeight === "1" ? "\u5F00" : "\u5173") + "    A\u8BA1\u6743: " + (cfg2.aWeight === "1" ? "\u5F00" : "\u5173") + "    \u67F1\u9AD8\u4E0A\u9650: " + s.maxHeight + "px"
        ];
        if (s.multiFFT) {
          lines.push("multiFFT \u652F\u8DEF: " + s.tiers.join(" / ") + "    \u4EA4\u53C9\u70B9: " + s.crossings.join(" / "));
        }
        if (s.lfpVolume !== void 0) {
          lines.push("LFP \u64AD\u653E\u5668\u97F3\u91CF: " + s.lfpVolume.toFixed(2) + "    \u5206\u6790\u589E\u76CA\u8865\u507F: \xD7" + (s.compGain || 1));
        }
        if (s.accent) {
          lines.push("\u8FDB\u5EA6\u6761\u53D6\u8272: " + s.accent);
        }
        if (cfg2.sampleRate) {
          lines.push("\u26A0 \u624B\u52A8 sampleRate=" + cfg2.sampleRate + "\uFF08\u7559\u7A7A\u53EF\u81EA\u52A8\u5339\u914D\u771F\u5B9E\u91C7\u6837\u7387\uFF09");
        }
        statsBox.textContent = lines.join("\n");
      } catch (e) {
        statsBox.textContent = "\u7EDF\u8BA1\u5931\u8D25: " + e;
      }
    }, 1e3);
    root.appendChild(row(
      "sampleRate \u91C7\u6837\u7387",
      "\u97F3\u9891\u91C7\u6837\u7387\uFF08Hz\uFF09\uFF0C\u53C2\u4E0E\u9891\u70B9\u5E26\u5BBD\u4E0E\u500D\u9891\u7A0B\u7D22\u5F15\u7684\u8BA1\u7B97\u3002\u7559\u7A7A\u81EA\u52A8\u8BFB\u53D6 AudioContext \u7684\u771F\u5B9E\u91C7\u6837\u7387\uFF08\u63A8\u8350\uFF09\uFF1B\u8BBE\u7F6E\u9519\u8BEF\u4F1A\u8BA9\u9891\u8C31\u6574\u4F53\u504F\u79FB\uFF0C\u4EC5\u5728\u81EA\u52A8\u503C\u5F02\u5E38\u65F6\u624B\u52A8\u6307\u5B9A\u3002",
      numInput(cfg2, "sampleRate", { type: "number", min: "8000", max: "192000", step: "100", placeholder: "\u7559\u7A7A\u81EA\u52A8" }, viz2)
    ));
    const fftRow = row(
      "fftSize",
      "FFT \u7A97\u53E3\u5927\u5C0F\uFF1A\u8D8A\u5927\u9891\u7387\u5206\u8FA8\u7387\u8D8A\u9AD8\uFF08\u4F4E\u9891\u66F4\u7EC6\u817B\uFF09\uFF0C\u4F46\u65F6\u95F4\u54CD\u5E94\u8D8A\u6162\uFF08\u9F13\u70B9\u77AC\u6001\u66F4\u949D\uFF09\u3002multiFFT \u5F00\u542F\u65F6\u6B64\u9879\u4E0E\u9AD8\u65AF\u6EE4\u6CE2\u5747\u4E0D\u53C2\u4E0E\u3002",
      select(cfg2.fftSize, ["256", "512", "1024", "2048", "4096", "8192"], (v) => {
        cfg2.fftSize = v;
        saveConfig(cfg2, "fftSize");
        viz2.rebuild();
      })
    );
    root.appendChild(fftRow);
    root.appendChild(row(
      "startFrequency (Hz)",
      "\u5206\u6790\u7684\u6700\u4F4E\u9891\u7387\uFF0C\u500D\u9891\u7A0B\u4ECE\u6B64\u5904\u5F00\u59CB\u5212\u5206\u3002\u8BBE\u4E3A 0 \u4F1A\u7834\u574F\u500D\u9891\u7A0B\u8BA1\u7B97\uFF08\u5185\u90E8\u81EA\u52A8\u94B3\u5230 20Hz\uFF09\uFF0C\u5EFA\u8BAE 20~60\u3002",
      numInput(cfg2, "startFrequency", { type: "number", min: "0", step: "10" }, viz2)
    ));
    root.appendChild(row(
      "endFrequency (Hz)",
      "\u5206\u6790\u7684\u6700\u9AD8\u9891\u7387\u3002\u8D8A\u9AD8\u5305\u542B\u7684\u9AD8\u9891\u7EC6\u8282\u8D8A\u591A\uFF1B\u4E00\u822C\u97F3\u4E50\u5EFA\u8BAE 9000~10000\uFF0C\u8D85\u8FC7\u97F3\u6E90\u5B9E\u9645\u9891\u8C31\u7684\u90E8\u5206\u6CA1\u6709\u5185\u5BB9\u3002",
      numInput(cfg2, "endFrequency", { type: "number", min: "1", step: "100" }, viz2)
    ));
    root.appendChild(row(
      "outBandsQty \u8F93\u51FA\u9891\u5E26\u6570",
      "\u53EF\u89C6\u5316\u67F1\u5F62\u6761\u6570\u91CF\uFF0C\u6574\u4E2A\u9891\u6BB5\u6309\u500D\u9891\u7A0B\u5747\u5206\u6210\u8FD9\u4E48\u591A\u5E26\u3002\u8D8A\u5927\u7EC6\u8282\u8D8A\u4E30\u5BCC\uFF0C\u4F46\u5355\u5E26\u8D8A\u7A84\u3001\u8BFB\u6570\u8D8A\u6296\uFF1B300 \u4E0A\u4E0B\u9002\u5408\u9AD8\u5206\u8FA8\u7387\u89C2\u611F\u3002",
      numInput(cfg2, "outBandsQty", { type: "number", min: "1", max: "512", step: "1" }, viz2)
    ));
    root.appendChild(el("hr", "border:none;border-top:1px solid rgba(255,255,255,.15);margin:10px 0;"));
    root.appendChild(row(
      "tWeight \u65F6\u95F4\u8BA1\u6743",
      "\u5BF9\u6700\u8FD1 5 \u5E27\u9891\u8C31\u53D6\u5E73\u5747\uFF0C\u6291\u5236\u5E27\u95F4\u7A81\u53D8\u3002\u5F00\u542F\u540E\u6CE2\u5F62\u66F4\u5E73\u6ED1\u3001\u6709\u62D6\u5C3E\u4E0E\u547C\u5438\u611F\uFF0C\u9F13\u70B9\u77AC\u6001\u88AB\u67D4\u5316\uFF0C\u9002\u5408\u7F13\u6162\u5F8B\u52A8\u7684\u89C6\u89C9\u98CE\u683C\uFF1B\u5173\u95ED\u5219\u9010\u5E27\u5FE0\u5B9E\u8FD8\u539F\uFF0C\u8DF3\u52A8\u66F4\u786C\u6717\u3001\u66F4\u5E26\u611F\u3002",
      checkInput(cfg2, "tWeight", viz2)
    ));
    root.appendChild(row(
      "aWeight A\u8BA1\u6743",
      "\u6A21\u62DF\u4EBA\u8033\u7684\u7B49\u54CD\u654F\u611F\u5EA6\uFF1A\u538B\u4F4E\u9891\u3001\u7A81\u51FA\u4E2D\u9891\uFF08\u4EBA\u58F0\u533A\uFF09\u3002\u5F00\u542F\u540E\u9891\u8C31\u91CD\u5FC3\u66F4\u63A5\u8FD1\u542C\u611F\u2014\u2014\u4EBA\u58F0\u66F4\u7A81\u51FA\uFF0C\u4F4E\u9891\u9686\u9686\u58F0\u88AB\u538B\u4F4E\uFF1B\u5173\u95ED\u5219\u6309\u7269\u7406\u80FD\u91CF\u663E\u793A\u3002",
      checkInput(cfg2, "aWeight", viz2)
    ));
    root.appendChild(row(
      "multiFFT \u591A\u5206\u8FA8\u7387\u5206\u4F53",
      "\u7528\u4E09\u6761\u4E0D\u540C\u7A97\u957F\u7684 FFT \u652F\u8DEF\u5E76\u884C\u5206\u6790\uFF1A\u4F4E\u9891\u6BB5\u8D70\u5927\u7A97\uFF08\u9891\u7387\u7EC6\uFF09\u3001\u9AD8\u9891\u6BB5\u8D70\u5C0F\u7A97\uFF08\u54CD\u5E94\u5FEB\uFF09\uFF0C\u8FD1\u4F3C\u6052Q\u6548\u679C\u3002\u5F00\u542F\u540E\u5FFD\u7565\u4E0A\u65B9 fftSize \u4E0E\u9AD8\u65AF\u6EE4\u6CE2\u3002\u5206\u754C\u7EBF\u4E0E\u5404\u652F\u8DEF\u7A97\u957F\u5728\u4E0B\u65B9\u300CmultiFFT \u5B9A\u5236\u300D\u533A\u8C03\u6574\u3002",
      checkInput(cfg2, "multiFFT", viz2, () => {
        fftRow.querySelector("select").disabled = cfg2.multiFFT === "1";
        syncFilter();
      })
    ));
    root.appendChild(row(
      "volumeComp \u97F3\u91CF\u7535\u5E73\u8865\u507F",
      "LFP \u64AD\u653E\u5668\u97F3\u91CF\u4F1A\u76F4\u63A5\u8870\u51CF\u5206\u6790\u4FE1\u53F7\uFF08\u97F3\u91CF\u8D8A\u4F4E\u9891\u8C31\u8D8A\u77EE\u8D8A\u7CCA\uFF09\u3002\u5F00\u542F\u540E\u6309 1/\u97F3\u91CF \u81EA\u52A8\u8865\u507F\uFF0C\u8BA9\u9891\u8C31\u5F62\u6001\u4E0E\u97F3\u91CF\u8BBE\u7F6E\u65E0\u5173\uFF0C\u5BF9\u9F50\u7F51\u9875\u7248\u6548\u679C\uFF1B\u5173\u95ED\u5219\u53CD\u6620\u771F\u5B9E\u8F93\u51FA\u7535\u5E73\u3002",
      checkInput(cfg2, "volumeComp", viz2)
    ));
    root.appendChild(row(
      "playPageOnly \u4EC5\u64AD\u653E\u9875\u663E\u793A",
      "\u5F00\u542F\u540E\u9891\u8C31\u53EA\u5728\u64AD\u653E\u9875\uFF08\u9ED1\u80F6\u9875\uFF09\u8FDB\u5EA6\u6761\u4E0A\u65B9\u663E\u793A\uFF0C\u56DE\u5230\u5176\u4ED6\u9875\u9762\u81EA\u52A8\u9690\u85CF\uFF1B\u5173\u95ED\u5219\u5728\u6CA1\u6709\u64AD\u653E\u9875\u951A\u70B9\u65F6\u9000\u5230\u5E95\u90E8\u64AD\u653E\u680F\u4E0A\u6CBF\u6216\u89C6\u53E3\u5E95\u90E8\u663E\u793A\u3002",
      checkInput(cfg2, "playPageOnly", viz2)
    ));
    root.appendChild(row(
      "maxHeight \u6700\u5927\u9AD8\u5EA6 (px)",
      "\u67F1\u5F62\u6761\u7FA4\u7684\u6700\u5927\u663E\u793A\u9AD8\u5EA6\uFF0C\u62C9\u6EE1\u97F3\u91CF\u65F6\u67F1\u5B50\u5230\u8FD9\u4E2A\u9AD8\u5EA6\u3002\u5EFA\u8BAE 200 \u4EE5\u4E0A\u83B7\u5F97\u66F4\u597D\u7684\u5C42\u6B21\u611F\u3002",
      addSteppers(
        input(cfg2.maxHeight, { type: "number", min: "40", max: "400", step: "4" }, (v) => {
          cfg2.maxHeight = v;
          saveConfig(cfg2, "maxHeight");
          viz2.setMaxHeight(parseFloat(v) || 120);
        }),
        4,
        40,
        400,
        (v) => {
          cfg2.maxHeight = v;
          saveConfig(cfg2, "maxHeight");
          viz2.setMaxHeight(parseFloat(v) || 120);
        }
      )
    ));
    root.appendChild(row(
      "yOffset \u5782\u76F4\u5FAE\u8C03 (px)",
      "\u9891\u8C31\u5E95\u8FB9\u76F8\u5BF9\u8FDB\u5EA6\u6761\u9876\u8FB9\u7684\u504F\u79FB\uFF1A\u6B63\u6570\u5411\u4E0B\u79FB\u3001\u8D1F\u6570\u5411\u4E0A\u79FB\u3002\u7528\u4E8E\u6D88\u9664\u5207\u6362\u64AD\u653E\u9875\u6216\u8FDB\u5EA6\u6761\u5BB9\u5668\u5185\u8FB9\u8DDD\u5E26\u6765\u7684\u51E0\u50CF\u7D20\u504F\u5DEE\u3002\u5373\u65F6\u751F\u6548\u3002",
      addSteppers(
        input(cfg2.yOffset, { type: "number", min: "-40", max: "200", step: "1" }, (v) => {
          cfg2.yOffset = v;
          saveConfig(cfg2, "yOffset");
        }),
        1,
        -40,
        200,
        (v) => {
          cfg2.yOffset = v;
          saveConfig(cfg2, "yOffset");
        }
      )
    ));
    const colorSel = el("select");
    Object.assign(colorSel.style, styledInput());
    [["white", "\u767D\u8272\u534A\u900F\u660E\uFF08\u9ED8\u8BA4\uFF09"], ["progress", "\u8FDB\u5EA6\u6761\u989C\u8272"], ["color", "\u5F69\u8272"]].forEach(([v, label]) => {
      const o = el("option", "", label);
      o.value = v;
      if (cfg2.colorMode === v)
        o.selected = true;
      colorSel.appendChild(o);
    });
    colorSel.addEventListener("change", () => {
      cfg2.colorMode = colorSel.value;
      saveConfig(cfg2, "colorMode");
    });
    root.appendChild(row(
      "colorMode \u989C\u8272\u6A21\u5F0F",
      "\u767D\u8272\u534A\u900F\u660E\uFF1A\u67F1\u5F62\u4E3A\u767D\u8272\uFF0C\u4EAE\u5EA6\u968F\u54CD\u5EA6\u53D8\u5316\uFF08\u8F89\u5149\u611F\uFF09\uFF0C\u8D34\u5408\u4EFB\u4F55\u5C01\u9762\u80CC\u666F\uFF1B\u8FDB\u5EA6\u6761\u989C\u8272\uFF1A\u53EA\u8BFB\u64AD\u653E\u9875\u8FDB\u5EA6\u6761\u7684\u5C01\u9762\u884D\u751F\u586B\u5145\u8272\uFF0C\u968F\u6B4C\u66F2\u4E3B\u9898\u8054\u52A8\uFF08\u64AD\u653E\u9875\u5916\u6CBF\u7528\u6700\u540E\u4E00\u6B21\u989C\u8272\uFF09\uFF1B\u5F69\u8272\uFF1A\u84DD\u2192\u7D2B\u2192\u7EA2\u7684\u6E10\u53D8\u914D\u8272\uFF0C\u8272\u5F69\u968F\u9891\u7387\u4E0E\u54CD\u5EA6\u53D8\u5316\u3002",
      colorSel
    ));
    const opNorm = (v) => String(Math.min(1, Math.max(0.05, Math.round((parseFloat(v) || 0.85) * 100) / 100)));
    const opNum = input(cfg2.opacity, { type: "number", min: "0.05", max: "1", step: "0.01" }, (v) => {
      const n = opNorm(v);
      cfg2.opacity = n;
      saveConfig(cfg2, "opacity");
      opNum.value = n;
      opRange.value = n;
    });
    opNum.style.flex = "0 0 90px";
    const opRange = rangeInput(cfg2.opacity, { min: "0.05", max: "1", step: "0.01" }, (v) => {
      const n = opNorm(v);
      cfg2.opacity = n;
      saveConfig(cfg2, "opacity");
      opNum.value = n;
    });
    const opWrap = el("div", "display:flex;gap:8px;flex:1;min-width:0;");
    opWrap.appendChild(opNum);
    opWrap.appendChild(opRange);
    root.appendChild(row(
      "opacity \u900F\u660E\u5EA6",
      "\u67F1\u5F62\u6761\u4E0D\u900F\u660E\u5EA6\uFF1A\u8D8A\u4F4E\u8D8A\u901A\u900F\u3001\u8D8A\u9AD8\u8D8A\u5B9E\u3002\u767D\u8272\u6A21\u5F0F\u7684\u8F89\u5149\u4EAE\u5EA6\u4E5F\u5728\u6B64\u57FA\u7840\u4E0A\u968F\u54CD\u5EA6\u7F29\u653E\u3002\u5373\u65F6\u751F\u6548\uFF0C\u65E0\u9700\u91CD\u5EFA\u3002",
      opWrap
    ));
    root.appendChild(el("hr", "border:none;border-top:1px solid rgba(255,255,255,.15);margin:10px 0;"));
    const filterCtl = checkInput(cfg2, "filterOn", viz2);
    root.appendChild(row(
      "filterOn \u9AD8\u65AF\u6EE4\u6CE2",
      "\u5BF9\u9891\u8C31\u505A\u7A7A\u95F4\u57DF\u9AD8\u65AF\u5377\u79EF\u5E73\u6ED1\uFF1A\u62B9\u5E73\u76F8\u90BB\u9891\u70B9\u7684\u7A81\u523A\uFF0C\u8BA9\u67F1\u5F62\u7FA4\u66F4\u8FDE\u8D2F\u5706\u6DA6\u3002\u5173\u95ED\u5219\u4FDD\u7559\u9010\u5E26\u7684\u539F\u59CB\u8D77\u4F0F\uFF0C\u66F4\u9510\u5229\u3002multiFFT \u5F00\u542F\u65F6\u81EA\u52A8\u505C\u7528\u3002",
      filterCtl
    ));
    const sigmaNum = input(cfg2.sigma, { type: "number", min: "0.1", max: "250", step: "0.1" }, (v) => {
      cfg2.sigma = v;
      saveConfig(cfg2, "sigma");
      sigmaRange.value = v;
      viz2.rebuild();
    });
    sigmaNum.style.flex = "0 0 90px";
    const sigmaRange = rangeInput(cfg2.sigma, { min: "0.1", max: "250", step: "0.1" }, (v) => {
      cfg2.sigma = v;
      saveConfig(cfg2, "sigma");
      sigmaNum.value = v;
      viz2.rebuild();
    });
    const sigmaWrap = el("div", "display:flex;gap:8px;flex:1;min-width:0;");
    sigmaWrap.appendChild(sigmaNum);
    sigmaWrap.appendChild(sigmaRange);
    root.appendChild(row(
      "sigma",
      "\u9AD8\u65AF\u6838\u7684\u6807\u51C6\u5DEE \u03C3\uFF1A\u8D8A\u5927\u5E73\u6ED1\u8D8A\u5F3A\uFF0C\u6CE2\u5F62\u8D8A\u67D4\u548C\uFF1B\u8FC7\u5927\u4F1A\u628A\u7EC6\u8282\u548C\u5CF0\u90FD\u62B9\u5E73\u3002\u4EC5 filterOn \u5F00\u542F\u65F6\u751F\u6548\u3002",
      sigmaWrap
    ));
    root.appendChild(row(
      "radius \u6EE4\u6CE2\u534A\u5F84",
      "\u5377\u79EF\u6838\u534A\u5F84\uFF08\u6838\u957F = 2\xD7radius+1\uFF09\uFF1A\u51B3\u5B9A\u6BCF\u4E2A\u9891\u70B9\u5411\u4E24\u4FA7\u53D6\u591A\u5C11\u90BB\u5C45\u53C2\u4E0E\u5E73\u6ED1\uFF0C0 \u76F8\u5F53\u4E8E\u4E0D\u6EE4\u6CE2\u3002\u4EC5 filterOn \u5F00\u542F\u65F6\u751F\u6548\u3002",
      numInput(cfg2, "radius", { type: "number", min: "0", max: "20", step: "1" }, viz2)
    ));
    root.appendChild(el("hr", "border:none;border-top:1px solid rgba(255,255,255,.15);margin:10px 0;"));
    root.appendChild(el("div", "font-size:13px;font-weight:600;margin:4px 0 2px;", "multiFFT \u5B9A\u5236"));
    root.appendChild(row(
      "mfLowMid \u4F4E/\u4E2D\u5206\u754C\u7EBF (Hz)",
      "\u4F4E\u4E8E\u6B64\u9891\u7387\u7684\u9891\u5E26\u8D70\u4F4E\u9891\u652F\u8DEF\uFF08\u5927\u7A97\u3001\u9891\u7387\u7EC6\uFF09\uFF0C\u4ECB\u4E8E\u4E24\u6761\u5206\u754C\u7EBF\u4E4B\u95F4\u8D70\u4E2D\u9891\u652F\u8DEF\u3002\u7559\u7A7A\u6216\u975E\u6CD5\u503C\u65F6\u56DE\u9000\u4E3A\u6309\u5E26\u5BBD\u81EA\u52A8\u9009\u62E9\u652F\u8DEF\u3002",
      numInput(cfg2, "mfLowMid", { type: "number", min: "1", step: "10" }, viz2)
    ));
    root.appendChild(row(
      "mfMidHigh \u4E2D/\u9AD8\u5206\u754C\u7EBF (Hz)",
      "\u9AD8\u4E8E\u6B64\u9891\u7387\u7684\u9891\u5E26\u8D70\u9AD8\u9891\u652F\u8DEF\uFF08\u5C0F\u7A97\u3001\u54CD\u5E94\u5FEB\uFF09\u3002",
      numInput(cfg2, "mfMidHigh", { type: "number", min: "1", step: "50" }, viz2)
    ));
    const fftOptions = ["256", "512", "1024", "2048", "4096", "8192", "16384"];
    root.appendChild(row(
      "mfLowFft \u4F4E\u9891\u652F\u8DEF\u7A97\u957F",
      "\u4F4E\u9891\u6BB5\u4F7F\u7528\u7684 FFT \u7A97\u957F\u3002\u8D8A\u5927\u4F4E\u9891\u5206\u9694\u8D8A\u7EC6\uFF08\u5982 8192 \u5728 48kHz \u4E0B\u6BCF\u70B9\u7EA6 5.9Hz\uFF09\uFF0C\u4EE3\u4EF7\u662F\u4F4E\u9891\u54CD\u5E94\u7A0D\u6162\u3002\u9ED8\u8BA4 8192\u3002",
      select(cfg2.mfLowFft, fftOptions, (v) => {
        cfg2.mfLowFft = v;
        saveConfig(cfg2, "mfLowFft");
        viz2.rebuild();
      })
    ));
    root.appendChild(row(
      "mfMidFft \u4E2D\u9891\u652F\u8DEF\u7A97\u957F",
      "\u4E2D\u9891\u6BB5\u4F7F\u7528\u7684 FFT \u7A97\u957F\uFF0C\u517C\u987E\u5206\u8FA8\u7387\u4E0E\u54CD\u5E94\u901F\u5EA6\u3002\u9ED8\u8BA4 2048\u3002",
      select(cfg2.mfMidFft, fftOptions, (v) => {
        cfg2.mfMidFft = v;
        saveConfig(cfg2, "mfMidFft");
        viz2.rebuild();
      })
    ));
    root.appendChild(row(
      "mfHighFft \u9AD8\u9891\u652F\u8DEF\u7A97\u957F",
      "\u9AD8\u9891\u6BB5\u4F7F\u7528\u7684 FFT \u7A97\u957F\u3002\u8D8A\u5C0F\u77AC\u6001\u54CD\u5E94\u8D8A\u5FEB\uFF08\u9F13\u70B9\u5693\u58F0\u66F4\u8DDF\u624B\uFF09\uFF0C\u9AD8\u9891\u672C\u8EAB\u9891\u7387\u9AD8\u3001\u7528\u5C0F\u7A97\u5206\u8FA8\u7387\u4E5F\u591F\u3002\u9ED8\u8BA4 512\u3002",
      select(cfg2.mfHighFft, fftOptions, (v) => {
        cfg2.mfHighFft = v;
        saveConfig(cfg2, "mfHighFft");
        viz2.rebuild();
      })
    ));
    root.appendChild(el("hr", "border:none;border-top:1px solid rgba(255,255,255,.15);margin:10px 0;"));
    const resetBtn = el("button", "padding:5px 14px;font-size:13px;cursor:pointer;background:rgba(255,255,255,.1);color:inherit;border:1px solid rgba(255,255,255,.25);border-radius:4px;", "\u6062\u590D\u9ED8\u8BA4");
    resetBtn.addEventListener("click", () => {
      Object.keys(DEFAULTS).forEach((k) => {
        cfg2[k] = DEFAULTS[k];
        saveConfig(cfg2, k);
      });
      viz2.rebuild();
      viz2.setMaxHeight(parseFloat(cfg2.maxHeight) || 120);
      const fresh = buildPanel(cfg2, viz2);
      root.replaceWith(fresh);
    });
    root.appendChild(resetBtn);
    const syncFilter = () => {
      const multiOn = cfg2.multiFFT === "1";
      if (multiOn && cfg2.filterOn !== "0") {
        cfg2.filterOn = "0";
        saveConfig(cfg2, "filterOn");
      }
      try {
        filterCtl._setDisabled(multiOn);
      } catch (e) {
      }
    };
    syncFilter();
    try {
      fftRow.querySelector("select").disabled = cfg2.multiFFT === "1";
    } catch (e) {
    }
    return root;
  }

  // src/processor.js
  function aWeighting(f) {
    const f2 = f * f;
    return 1.2588966 * 14884e4 * f2 * f2 / ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 14884e4));
  }
  function gauss(x, sigma = 1, mu = 0) {
    return Math.pow(Math.E, -(Math.pow(x - mu, 2) / (2 * sigma * sigma)));
  }
  var SoundProcessor = class {
    constructor(options = {}) {
      const {
        filterParams,
        sampleRate,
        fftSize,
        endFrequency,
        startFrequency,
        outBandsQty,
        tWeight,
        aWeight
      } = options;
      if (!fftSize || !sampleRate || !outBandsQty) {
        throw new Error("need fftSize, sampleRate and outBandsQty");
      }
      this.sampleRate = sampleRate;
      this.fftSize = fftSize || 1024;
      this.bandsQty = Math.floor(fftSize / 2);
      this.outBandsQty = outBandsQty;
      this.bandwidth = sampleRate / fftSize;
      this.startFrequency = startFrequency || 0;
      this.endFrequency = endFrequency || 1e4;
      this.tWeight = !!tWeight;
      this.aWeight = aWeight === void 0 ? true : !!aWeight;
      if (filterParams) {
        this.filterParams = {
          mu: 0,
          // 固定为0
          sigma: filterParams.sigma || 1,
          filterRadius: filterParams.radius === void 0 ? 2 : Math.floor(filterParams.radius)
        };
      }
      this.aWeights = [];
      this.bands = [];
      this.gKernel = [];
      this.historyLimit = 5;
      this.history = [];
      this.initWeights();
      this.initBands();
      if (this.filterParams) {
        this.initGaussKernel();
      }
      this.process = this.process.bind(this);
    }
    initWeights() {
      const { bandwidth, bandsQty, aWeights } = this;
      for (let i = 0; i < bandsQty; i++) {
        aWeights.push(aWeighting(i * bandwidth));
      }
    }
    initBands() {
      const { endFrequency, startFrequency, outBandsQty, bands } = this;
      let n = Math.log2(endFrequency / startFrequency) / outBandsQty;
      n = Math.pow(2, n);
      const nextBand = {
        lowerFrequency: Math.max(startFrequency, 0),
        upperFrequency: 0
      };
      for (let i = 0; i < outBandsQty; i++) {
        const upperFrequency = nextBand.lowerFrequency * n;
        nextBand.upperFrequency = Math.min(upperFrequency, endFrequency);
        bands.push({
          lowerFrequency: nextBand.lowerFrequency,
          upperFrequency: nextBand.upperFrequency
        });
        nextBand.lowerFrequency = upperFrequency;
      }
    }
    initGaussKernel() {
      const { filterParams, gKernel } = this;
      const { mu, sigma, filterRadius } = filterParams;
      const radius = filterRadius;
      for (let i = -radius; i < 1; i++) {
        gKernel.push(gauss(i, sigma, mu));
      }
      for (let i = radius - 1; i > -1; i--) {
        gKernel.push(gKernel[i]);
      }
      this.gKernelSum = gKernel.reduce((prev, curr) => {
        return prev + curr;
      });
      this.filterRadius = filterRadius;
    }
    filter(frequencies) {
      const { gKernel, gKernelSum, filterRadius } = this;
      if (!filterRadius)
        return;
      for (let i = 0; i < frequencies.length; i++) {
        let count = 0;
        for (let j = i - filterRadius; j < i + filterRadius; j++) {
          const value = frequencies[j] !== void 0 ? frequencies[j] : 0;
          count += value * gKernel[j - i + filterRadius];
        }
        frequencies[i] = count / gKernelSum;
      }
    }
    aWeighting(frequencies) {
      const { aWeights } = this;
      for (let i = 0; i < frequencies.length; i++) {
        if (aWeights[i] !== void 0) {
          frequencies[i] = frequencies[i] * aWeights[i];
        }
      }
    }
    divide(frequencies) {
      const { outBandsQty, bandwidth, bands } = this;
      const temp = new Array(outBandsQty);
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        const startIndex = Math.floor(band.lowerFrequency / bandwidth);
        const endIndex = Math.min(
          Math.floor(band.upperFrequency / bandwidth),
          frequencies.length - 1
        );
        let count = 0;
        for (let j = startIndex; j <= endIndex; j++) {
          count += frequencies[j] * frequencies[j];
        }
        temp[i] = Math.sqrt(count / (endIndex + 1 - startIndex));
      }
      return temp;
    }
    timeWeighting(frequencies) {
      const { history, historyLimit } = this;
      if (history.length < 5) {
        history.push(frequencies.slice(0));
      } else {
        history.pop();
        history.unshift(frequencies.slice(0));
        for (let i = 0; i < frequencies.length; i++) {
          let count = 0;
          for (let j = 0; j < historyLimit; j++) {
            count += history[j][i] / historyLimit;
          }
          frequencies[i] = count;
        }
      }
    }
    process(frequencies) {
      if (this.filterParams) {
        this.filter(frequencies);
      }
      if (this.tWeight) {
        this.timeWeighting(frequencies);
      }
      if (this.aWeight) {
        this.aWeighting(frequencies);
      }
      return this.divide(frequencies);
    }
  };

  // src/multi-fft.js
  var BYTES_PER_DB = 255 / 70;
  var MultiResolutionFFT = class {
    constructor(options) {
      const {
        sampleRate,
        startFrequency,
        endFrequency,
        outBandsQty,
        tWeight = true,
        aWeight = true,
        tiers = [8192, 2048, 512],
        splits = null
        // [低/中分界, 中/高分界]：按频带中心频率指派支路；null 则按带宽自动选择
      } = options;
      if (!sampleRate || !outBandsQty) {
        throw new Error("sampleRate \u4E0E outBandsQty \u5FC5\u586B");
      }
      this.sampleRate = sampleRate;
      this.endFrequency = endFrequency;
      this.outBandsQty = outBandsQty;
      this.tWeight = tWeight;
      this.aWeight = aWeight;
      this.tiers = tiers;
      const start = Math.max(20, startFrequency || 20);
      const logSpan = Math.log2(endFrequency / start);
      if (!Number.isFinite(logSpan) || logSpan <= 0) {
        throw new Error("\u9700\u8981 0 < startFrequency < endFrequency");
      }
      const binWidths = tiers.map((size) => sampleRate / size);
      const binCounts = tiers.map((size) => Math.floor(size / 2));
      this.tierOffsets = binWidths.map((bw) => -10 * Math.log10(bw / binWidths[0]) * BYTES_PER_DB);
      const ratio = Math.pow(2, logSpan / outBandsQty);
      this.bands = [];
      let lower = start;
      for (let i = 0; i < outBandsQty; i++) {
        const upper = Math.min(lower * ratio, endFrequency);
        const width = upper - lower;
        let tierIndex = 0;
        if (splits) {
          const cf = Math.sqrt(lower * upper);
          if (cf > splits[1])
            tierIndex = 2;
          else if (cf > splits[0])
            tierIndex = 1;
        } else {
          for (let t = tiers.length - 1; t >= 1; t--) {
            if (binWidths[t] <= width) {
              tierIndex = t;
              break;
            }
          }
        }
        const bw = binWidths[tierIndex];
        const maxBin = binCounts[tierIndex] - 1;
        const startBin = Math.min(Math.floor(lower / bw), maxBin);
        let endBin = Math.min(Math.floor(upper / bw), maxBin);
        if (endBin < startBin)
          endBin = startBin;
        this.bands.push({
          lower,
          upper,
          tierIndex,
          startBin,
          endBin,
          aw: aWeighting(Math.sqrt(lower * upper))
          // 频带中心频率的 A 计权系数
        });
        lower = upper;
      }
      this.history = [];
      for (let i = 0; i < outBandsQty; i++)
        this.history.push([]);
      const SEAM_W = 4;
      this.seamAlpha = new Float32Array(outBandsQty);
      {
        const dist = new Array(outBandsQty).fill(Infinity);
        for (let i = 1; i < outBandsQty; i++) {
          if (this.bands[i].tierIndex !== this.bands[i - 1].tierIndex) {
            for (let k = 0; k < SEAM_W; k++) {
              if (i - 1 - k >= 0)
                dist[i - 1 - k] = Math.min(dist[i - 1 - k], k);
              if (i + k < outBandsQty)
                dist[i + k] = Math.min(dist[i + k], k);
            }
          }
        }
        for (let i = 0; i < outBandsQty; i++) {
          this.seamAlpha[i] = dist[i] === Infinity ? 0 : 1 - dist[i] / SEAM_W;
        }
      }
      this._vals = new Float64Array(outBandsQty);
      this._blended = new Float64Array(outBandsQty);
      this._out = new Array(outBandsQty);
    }
    // 支路分配统计：counts[支路序号] = 频带数；crossings = 支路切换处的起始频率
    tierStats() {
      const counts = this.tiers.map(() => 0);
      const crossings = [];
      let prev = this.bands.length ? this.bands[0].tierIndex : -1;
      for (let i = 0; i < this.bands.length; i++) {
        const band = this.bands[i];
        counts[band.tierIndex]++;
        if (band.tierIndex !== prev) {
          crossings.push(band.lower);
          prev = band.tierIndex;
        }
      }
      return { counts, crossings };
    }
    // inputs: 与 tiers 一一对应的 Uint8Array（各支路 getByteFrequencyData 的结果）
    // 返回复用的内部缓冲（调用方当帧消费，不得跨帧持有）
    process(inputs) {
      const vals = this._vals;
      for (let i = 0; i < this.outBandsQty; i++) {
        const band = this.bands[i];
        const data = inputs[band.tierIndex];
        let count = 0;
        for (let b = band.startBin; b <= band.endBin; b++) {
          count += data[b] * data[b];
        }
        let v = Math.sqrt(count / (band.endBin - band.startBin + 1));
        v += this.tierOffsets[band.tierIndex];
        if (v < 0)
          v = 0;
        if (this.aWeight)
          v *= band.aw;
        vals[i] = v;
      }
      const n = this.outBandsQty;
      const blended = this._blended;
      for (let i = 0; i < n; i++) {
        const a = this.seamAlpha[i];
        if (a <= 0) {
          blended[i] = vals[i];
          continue;
        }
        const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2);
        let avg = 0;
        for (let j = i0; j <= i1; j++)
          avg += vals[j];
        avg /= i1 - i0 + 1;
        blended[i] = vals[i] * (1 - a * 0.5) + avg * (a * 0.5);
      }
      const out = this._out;
      for (let i = 0; i < n; i++) {
        let v = blended[i];
        if (this.tWeight) {
          const h = this.history[i];
          h.push(v);
          if (h.length > 5)
            h.shift();
          let sum = 0;
          for (let j = 0; j < h.length; j++)
            sum += h[j];
          v = sum / h.length;
        }
        out[i] = v;
      }
      return out;
    }
  };

  // src/visualizer.js
  var TAG = "[EasyAudioVisualizer]";
  function detectLFP() {
    return typeof loadedPlugins !== "undefined" && loadedPlugins && loadedPlugins.LibFrontendPlay && typeof loadedPlugins.LibFrontendPlay.getFFTData === "function";
  }
  function createVisualizer(cfg2) {
    const state = {
      ac: null,
      source: null,
      analyser: null,
      tierAnalysers: null,
      tierBuffers: null,
      tierSizes: null,
      // 当前支路 fftSize 配置（变化时重建支路）
      processor: null,
      multiProcessor: null,
      anchor: null,
      anchorMode: null,
      colorEl: null,
      // 最近一次的大进度条滑条元素（取色用，播放页外仍复用）
      colorElSmall: null,
      // 小进度条（底部播放栏滑条）元素
      accentBig: null,
      // 大进度条主题色 [r,g,b]
      accentSmall: null,
      // 小进度条主题色 [r,g,b]
      dataSource: null,
      // 'lfp' | null（协商中/不可用）
      lfp: null,
      lfpSr: null,
      // LFP 懒构建时记录的采样率（参数变化时用于重建）
      lfpFft: 0,
      // LFP 懒构建时记录的 fftSize
      compGain: null,
      // LFP 音量补偿节点
      tapNode: null,
      // 分体支路挂接点（补偿节点或源本身）
      multiDisabled: false,
      // LFP 分体支路异常时自动降级为单路
      frames: 0,
      maxHeight: parseFloat(cfg2.maxHeight) || 120,
      lastSum: -1
      // 停顿时跳过重绘
    };
    const wrap = document.createElement("div");
    wrap.className = "eav-visualizer";
    Object.assign(wrap.style, {
      position: "fixed",
      zIndex: "9999",
      pointerEvents: "none",
      display: "none"
    });
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    wrap.appendChild(canvas);
    const ctx2d = canvas.getContext("2d");
    let gaussCache = { key: "", kern: null, sum: 0 };
    function gaussSmooth(arr) {
      const s = Math.max(0.1, parseFloat(cfg2.sigma) || 1);
      const r = Math.max(0, Math.round(parseFloat(cfg2.radius) || 0));
      if (!r || !arr || !arr.length)
        return arr;
      const key = s + "/" + r;
      if (gaussCache.key !== key) {
        const kern2 = [];
        let sum2 = 0;
        for (let i = -r; i <= r; i++) {
          const w = Math.exp(-(i * i) / (2 * s * s));
          kern2.push(w);
          sum2 += w;
        }
        gaussCache = { key, kern: kern2, sum: sum2 };
      }
      const { kern, sum } = gaussCache;
      const n = arr.length;
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        let acc = 0;
        for (let k = -r; k <= r; k++) {
          const j = Math.min(n - 1, Math.max(0, i + k));
          acc += arr[j] * kern[k + r];
        }
        out[i] = Math.round(acc / sum);
      }
      return out;
    }
    function attachWhenBody() {
      if (document.body) {
        document.body.appendChild(wrap);
        return;
      }
      const iv = setInterval(() => {
        if (document.body) {
          clearInterval(iv);
          document.body.appendChild(wrap);
        }
      }, 50);
    }
    function syncSize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, wrap.clientWidth * dpr);
      const h = Math.max(1, state.maxHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    function findAnchor() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const playSlider = document.querySelector('[class*="slider-vinyl"]');
      if (playSlider) {
        const rect = playSlider.getBoundingClientRect();
        if (rect.width > vw * 0.3 && rect.height > 2 && rect.top > vh * 0.5) {
          return { rect, mode: "playpage-slider-vinyl", el: playSlider };
        }
        const all = document.querySelectorAll('[class*="slider-vinyl"]');
        for (const s of all) {
          const r = s.getBoundingClientRect();
          if (r.width > vw * 0.3 && r.height > 2 && r.top > vh * 0.5) {
            return { rect: r, mode: "playpage-slider-vinyl", el: s };
          }
        }
      }
      const playPage = document.querySelector('.g-singlec-ct, .g-playpage, [class*="playpage" i], #playpage');
      if (playPage) {
        const rect = playPage.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const candidates = Array.from(playPage.querySelectorAll('[class*="prg"], [class*="progress"], [class*="bar"], [role="slider"]'));
          const bars = candidates.map((el2) => ({ el: el2, rect: el2.getBoundingClientRect() })).filter((x) => x.rect.width > rect.width * 0.35 && x.rect.height > 2 && x.rect.height < 120 && x.rect.top > rect.top + rect.height * 0.55);
          if (bars.length) {
            bars.sort((a, b) => a.rect.height - b.rect.height);
            return { rect: bars[0].rect, mode: "playpage-bar" };
          }
          return { rect: { left: rect.left, top: rect.bottom - 40, width: rect.width }, mode: "playpage-bottom" };
        }
      }
      if (cfg2.playPageOnly === "1")
        return null;
      const bottomBar = document.querySelector('[class*="DefaultBarWrapper_"], #main-player, .g-btmbar');
      if (bottomBar) {
        const rect = bottomBar.getBoundingClientRect();
        if (rect.height > 0) {
          return { rect: { left: rect.left, top: rect.top, width: rect.width }, mode: "bottombar" };
        }
      }
      const global = Array.from(document.querySelectorAll('[class*="slider-default"],[class*="prg" i],[class*="progress" i],[role="slider"],[class*="slider" i]')).map((el2) => el2.getBoundingClientRect()).filter((r) => r.width > vw * 0.3 && r.height > 2 && r.height < 120 && r.top > vh * 0.5);
      if (global.length) {
        global.sort((a, b) => a.height - b.height);
        return { rect: global[0], mode: "global-slider" };
      }
      if (vh > 200) {
        return { rect: { left: 0, top: vh - 60, width: vw }, mode: "viewport-fallback" };
      }
      return null;
    }
    function ensureDataSource() {
      if (state.dataSource === "lfp" && !detectLFP()) {
        state.dataSource = null;
        state.lfp = null;
        state.processor = null;
        state.multiProcessor = null;
        state.multiDisabled = false;
        console.warn(TAG, "LibFrontendPlay \u4E0D\u53EF\u7528\uFF0C\u7B49\u5F85\u5176\u6062\u590D");
      } else if (!state.dataSource && detectLFP()) {
        useLFP();
      }
    }
    function syncPosition() {
      ensureDataSource();
      const found = findAnchor();
      if (!found) {
        if (wrap.style.display !== "none")
          wrap.style.display = "none";
        state.anchor = null;
        state.anchorMode = null;
        sampleProgressColor();
        return;
      }
      const rect = found.rect;
      state.anchor = rect;
      state.anchorMode = found.mode;
      sampleProgressColor();
      const left = Math.round(rect.left);
      const width = Math.round(rect.width);
      const yo = found.mode.indexOf("playpage") === 0 ? parseFloat(cfg2.yOffset) || 0 : 0;
      const bottom = Math.max(0, Math.round(window.innerHeight - rect.top - yo));
      if (wrap.style.display !== "block") {
        wrap.style.display = "block";
        wrap.style.height = state.maxHeight + "px";
        wrap._h = state.maxHeight;
      }
      if (wrap._h !== state.maxHeight) {
        wrap.style.height = state.maxHeight + "px";
        wrap._h = state.maxHeight;
      }
      if (wrap._left !== left) {
        wrap.style.left = left + "px";
        wrap._left = left;
      }
      if (wrap._width !== width) {
        wrap.style.width = width + "px";
        wrap._width = width;
      }
      if (wrap._bottom !== bottom) {
        wrap.style.bottom = bottom + "px";
        wrap._bottom = bottom;
      }
      syncSize();
    }
    function useLFP() {
      state.dataSource = "lfp";
      state.lfp = loadedPlugins.LibFrontendPlay;
      console.info(TAG, "data source = LibFrontendPlay.getFFTData()");
    }
    function ensureTierAnalysers() {
      if (state.tierAnalysers)
        return;
      const tap = state.tapNode || state.source;
      const sizes = state.tierSizes || [8192, 2048, 512];
      state.tierAnalysers = sizes.map((size) => {
        const an = state.ac.createAnalyser();
        an.fftSize = size;
        tap.connect(an);
        return an;
      });
      state.tierBuffers = state.tierAnalysers.map((an) => new Uint8Array(an.frequencyBinCount));
    }
    const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
    function cfgTierSizes() {
      const size = (k, d) => {
        const v = parseInt(cfg2[k], 10);
        return FFT_SIZES.includes(v) ? v : d;
      };
      return [size("mfLowFft", 8192), size("mfMidFft", 2048), size("mfHighFft", 512)];
    }
    function cfgSplits() {
      const lo = parseFloat(cfg2.mfLowMid);
      const hi = parseFloat(cfg2.mfMidHigh);
      return Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > lo ? [lo, hi] : null;
    }
    function multiOptions(sampleRate) {
      return { ...makeParams(sampleRate), tiers: cfgTierSizes(), splits: cfgSplits() };
    }
    function syncTierSizes(sizes) {
      if (state.tierAnalysers && state.tierAnalysers.some((an, i) => an.fftSize !== sizes[i])) {
        state.tierAnalysers.forEach((an) => {
          try {
            an.disconnect();
          } catch (e) {
          }
        });
        state.tierAnalysers = null;
        state.tierBuffers = null;
      }
      state.tierSizes = sizes;
    }
    function initData() {
      const poll = () => {
        if (state.dataSource === "lfp")
          return;
        if (detectLFP()) {
          useLFP();
          return;
        }
        setTimeout(poll, 1e3);
      };
      poll();
    }
    function makeParams(sampleRate) {
      return {
        sampleRate,
        startFrequency: parseFloat(cfg2.startFrequency) || 0,
        endFrequency: parseFloat(cfg2.endFrequency) || 1e4,
        outBandsQty: Math.max(1, Math.round(parseFloat(cfg2.outBandsQty) || 81)),
        tWeight: cfg2.tWeight === "1",
        aWeight: cfg2.aWeight === "1"
      };
    }
    function buildProcessor(sampleRate, fftSize) {
      if (cfg2.multiFFT === "1" && state.tierAnalysers) {
        state.processor = null;
        state.multiProcessor = new MultiResolutionFFT(multiOptions(sampleRate));
        return;
      }
      state.multiProcessor = null;
      if (state.analyser) {
        state.analyser.fftSize = fftSize;
      }
      state.processor = new SoundProcessor({
        ...makeParams(sampleRate),
        fftSize,
        filterParams: cfg2.filterOn === "1" ? {
          sigma: parseFloat(cfg2.sigma) || 1,
          radius: Math.max(0, Math.round(parseFloat(cfg2.radius) || 0))
        } : void 0
      });
    }
    function rebuild() {
      try {
        if (state.dataSource === "lfp") {
          if (cfg2.multiFFT === "1") {
            state.multiDisabled = false;
            if (state.ac) {
              state.processor = null;
              syncTierSizes(multiOptions(state.ac.sampleRate).tiers);
              ensureTierAnalysers();
              state.multiProcessor = new MultiResolutionFFT(multiOptions(state.ac.sampleRate));
            }
          } else {
            state.multiProcessor = null;
            if (state.lfpSr) {
              const want = parseInt(cfg2.fftSize, 10) || 1024;
              const an = state.lfp.currentAudioAnalyser;
              if (an && an.fftSize !== want) {
                an.fftSize = want;
              }
              buildProcessor(state.lfpSr, state.lfpFft || want);
            }
          }
          return;
        }
        if (!state.ac)
          return;
        const fftSize = parseInt(cfg2.fftSize, 10) || 1024;
        const sampleRate = cfg2.sampleRate ? parseFloat(cfg2.sampleRate) : state.ac.sampleRate;
        if (cfg2.multiFFT === "1") {
          syncTierSizes(cfgTierSizes());
          ensureTierAnalysers();
        }
        buildProcessor(sampleRate, fftSize);
      } catch (e) {
        console.error(TAG, "rebuild failed", e);
        state.processor = null;
        state.multiProcessor = null;
      }
    }
    function setMaxHeight(px) {
      state.maxHeight = Math.max(20, px || 120);
      wrap.style.height = state.maxHeight + "px";
      syncSize();
    }
    function parseTrackColor(raw) {
      if (!raw)
        return null;
      const all = [...raw.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)];
      for (let i = all.length - 1; i >= 0; i--) {
        if (!all[i][4] || parseFloat(all[i][4]) > 0.2) {
          return [parseInt(all[i][1]), parseInt(all[i][2]), parseInt(all[i][3])];
        }
      }
      return null;
    }
    function findBigSlider() {
      const all = document.querySelectorAll('[class*="slider-vinyl"]');
      for (const s of all) {
        const m = getComputedStyle(s).getPropertyValue("--track-color").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m && !(+m[1] >= 240 && +m[2] >= 240 && +m[3] >= 240))
          return s;
      }
      return null;
    }
    function findSmallSlider() {
      return document.querySelector('[class*="slider-default"][aria-label*="\u8FDB\u5EA6"]') || document.querySelector('[aria-label*="\u8FDB\u5EA6" i][class*="slider" i]');
    }
    function sampleProgressColor() {
      let big = state.colorEl;
      if (!big || !big.isConnected) {
        big = findBigSlider();
        state.colorEl = big;
      }
      if (big) {
        try {
          state.accentBig = parseTrackColor(getComputedStyle(big).getPropertyValue("--track-color")) || state.accentBig;
        } catch (e) {
        }
      }
      let small = state.colorElSmall;
      if (!small || !small.isConnected) {
        small = findSmallSlider();
        state.colorElSmall = small;
      }
      if (small) {
        try {
          state.accentSmall = parseTrackColor(getComputedStyle(small).getPropertyValue("--track-color")) || state.accentSmall;
        } catch (e) {
        }
      }
    }
    function drawBars(data) {
      syncSize();
      const ctx = ctx2d;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!data || !data.length)
        return;
      const bw = w / data.length;
      const alpha = Math.min(1, Math.max(0.05, parseFloat(cfg2.opacity) || 0.85));
      const colorMode = cfg2.colorMode === "color";
      const progressMode = cfg2.colorMode === "progress";
      const onPlayPage = state.anchorMode && state.anchorMode.indexOf("playpage") === 0;
      const target = (onPlayPage ? state.accentBig : state.accentSmall) || state.accentBig || state.accentSmall;
      if (target) {
        if (!state.accent)
          state.accent = target.slice();
        for (let c = 0; c < 3; c++) {
          state.accent[c] += (target[c] - state.accent[c]) * 0.08;
        }
      }
      const accent = state.accent || [236, 65, 65];
      for (let i = 0; i < data.length; i++) {
        let v = data[i];
        if (!Number.isFinite(v))
          v = 0;
        v = Math.min(255, Math.max(0, v));
        const t = v / 255;
        const bh = t * h;
        if (colorMode) {
          ctx.fillStyle = `hsla(${200 + i / data.length * 160}, 80%, ${30 + t * 45}%, ${alpha})`;
        } else if (progressMode) {
          ctx.fillStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${alpha * (0.25 + 0.75 * t)})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * (0.25 + 0.75 * t)})`;
        }
        ctx.fillRect(i * bw + 1, h - bh, Math.max(bw - 2, 1), bh);
      }
    }
    function drawBaseline() {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx2d.fillRect(0, canvas.height - 3, canvas.width, 3);
    }
    function frame() {
      requestAnimationFrame(frame);
      if (wrap.style.display === "none" || !state.anchor)
        return;
      if (!state.dataSource) {
        drawBaseline();
        return;
      }
      try {
        if (state.dataSource === "lfp") {
          const lfpAc = state.lfp.currentAudioContext;
          if (cfg2.multiFFT === "1" && !state.multiDisabled && lfpAc && state.lfp.currentAudioSource) {
            try {
              if (state.ac !== lfpAc || !state.multiProcessor) {
                if (state.tierAnalysers) {
                  state.tierAnalysers.forEach((an) => {
                    try {
                      an.disconnect();
                    } catch (e) {
                    }
                  });
                }
                if (state.compGain) {
                  try {
                    state.compGain.disconnect();
                  } catch (e) {
                  }
                }
                state.ac = lfpAc;
                state.source = state.lfp.currentAudioSource;
                if (cfg2.volumeComp === "1") {
                  state.compGain = lfpAc.createGain();
                  state.source.connect(state.compGain);
                  state.tapNode = state.compGain;
                } else {
                  state.compGain = null;
                  state.tapNode = state.source;
                }
                state.tierAnalysers = null;
                state.tierBuffers = null;
                state.processor = null;
                syncTierSizes(multiOptions(lfpAc.sampleRate).tiers);
                ensureTierAnalysers();
                state.multiProcessor = new MultiResolutionFFT(multiOptions(lfpAc.sampleRate));
                state.lastSum = -1;
                console.info(
                  TAG,
                  "multiFFT on LFP source, sampleRate =",
                  lfpAc.sampleRate,
                  "tiers =",
                  state.tierSizes.join("/"),
                  "splits =",
                  cfgSplits()
                );
              }
              if (cfg2.volumeComp === "1" && state.compGain) {
                const vol = typeof state.lfp.volume === "number" ? state.lfp.volume : 1;
                const gain = vol > 0.05 ? Math.min(4, 1 / vol) : 1;
                if (Math.abs(state.compGain.gain.value - gain) > 0.01) {
                  state.compGain.gain.value = gain;
                }
              }
              for (let t = 0; t < state.tierAnalysers.length; t++) {
                state.tierAnalysers[t].getByteFrequencyData(state.tierBuffers[t]);
              }
              const bands = state.multiProcessor.process(state.tierBuffers);
              drawBars(cfg2.filterOn === "1" ? gaussSmooth(bands) : bands);
              state.frames++;
            } catch (e) {
              state.multiDisabled = true;
              state.multiProcessor = null;
              console.error(TAG, "multiFFT failed, fallback to single mode", e);
            }
          } else {
            const an = state.lfp.currentAudioAnalyser;
            const want = parseInt(cfg2.fftSize, 10) || 1024;
            if (an && an.fftSize !== want)
              an.fftSize = want;
            const data = state.lfp.getFFTData();
            if (data && data.length) {
              if (!state.processor) {
                state.multiProcessor = null;
                const sr = lfpAc ? lfpAc.sampleRate : parseFloat(cfg2.sampleRate) || 48e3;
                state.lfpSr = sr;
                state.lfpFft = data.length * 2;
                buildProcessor(sr, state.lfpFft);
              }
              let sum = 0;
              for (let i = 0; i < data.length; i += 8)
                sum += data[i];
              if (sum !== state.lastSum) {
                state.lastSum = sum;
                drawBars(state.processor.process(data));
                state.frames++;
              }
            }
          }
        }
      } catch (e) {
        console.error(TAG, "frame error", e);
      }
    }
    function getStats() {
      const p = state.processor;
      const m = state.multiProcessor;
      const stats = {
        source: state.dataSource,
        anchorMode: state.anchorMode,
        accent: state.accent ? "rgb(" + state.accent.join(",") + ")" : null,
        sampleRate: p ? p.sampleRate : m ? m.sampleRate : null,
        fftSize: p ? p.fftSize : null,
        bandwidth: p ? p.sampleRate / p.fftSize : null,
        outBandsQty: p ? p.outBandsQty : m ? m.outBandsQty : null,
        filter: cfg2.filterOn === "1" ? "sigma=" + cfg2.sigma + ", radius=" + cfg2.radius : "\u5173\u95ED",
        multiFFT: !!m,
        maxHeight: state.maxHeight,
        frames: state.frames
      };
      if (m) {
        const ts = m.tierStats();
        stats.tiers = m.tiers.map((s, i) => s + "\xD7" + ts.counts[i] + "\u5E26");
        stats.crossings = ts.crossings.map((f) => Math.round(f) + "Hz");
      }
      if (state.dataSource === "lfp" && typeof state.lfp.volume === "number") {
        stats.lfpVolume = state.lfp.volume;
        stats.compGain = state.compGain ? +state.compGain.gain.value.toFixed(2) : null;
      }
      return stats;
    }
    return {
      start() {
        attachWhenBody();
        requestAnimationFrame(frame);
        initData();
        setTimeout(syncPosition, 1e3);
        setInterval(syncPosition, 500);
      },
      rebuild,
      setMaxHeight,
      getStats
    };
  }

  // src/index.js
  var TAG2 = "[EasyAudioVisualizer]";
  function whenBody(cb) {
    if (document.body)
      return cb();
    const iv = setInterval(() => {
      if (document.body) {
        clearInterval(iv);
        cb();
      }
    }, 50);
  }
  var cfg = {};
  Object.assign(cfg, DEFAULTS);
  var viz = null;
  var booted = false;
  var panel = null;
  function boot() {
    if (booted)
      return;
    booted = true;
    try {
      viz = createVisualizer(cfg);
      viz.start();
    } catch (e) {
      console.error(TAG2, "boot failed", e);
    }
  }
  whenBody(boot);
  loadConfig().then((real) => {
    Object.assign(cfg, real);
    if (viz) {
      viz.rebuild();
      if (typeof viz.setMaxHeight === "function") {
        viz.setMaxHeight(parseFloat(cfg.maxHeight) || 120);
      }
    }
  }).catch((e) => {
    console.error(TAG2, "config load failed", e);
  });
  var pluginRef = typeof plugin !== "undefined" ? plugin : window.plugin = window.plugin || {};
  function safeRegister(name, cb) {
    const fn = pluginRef[name];
    if (typeof fn === "function" && !fn.__eavAssigned) {
      try {
        fn.call(pluginRef, cb);
        return "registered";
      } catch (e) {
      }
    }
    cb.__eavAssigned = true;
    pluginRef[name] = cb;
    return "assigned";
  }
  safeRegister("onLoad", function() {
    whenBody(boot);
  });
  safeRegister("onConfig", function() {
    if (!viz) {
      const tip = document.createElement("div");
      tip.setAttribute("style", "padding:12px;font-size:13px;");
      tip.textContent = "EasyAudioVisualizer \u6B63\u5728\u521D\u59CB\u5316...";
      return tip;
    }
    if (!panel)
      panel = buildPanel(cfg, viz);
    return panel;
  });
  window.EasyAudioVisualizer = {
    get config() {
      return cfg;
    },
    get visualizer() {
      return viz;
    }
  };
})();

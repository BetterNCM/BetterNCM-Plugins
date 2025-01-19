"use strict";
(() => {
  // _kawqd1z8d:/home/runner/work/BetterNCM-What-Is-The-Volume-Percentage-Now/BetterNCM-What-Is-The-Volume-Percentage-Now/packages/What-Is-The-Volume-Percentage-Now/src/main.css
  var main_default = ".m-player .spk .percent {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n";

  // src/main.ts
  function getBarVol(barElem) {
    return barElem.style.height.replace("%", "").split(".")[0];
  }
  function apply(playerElem) {
    const spkElem = playerElem.querySelector(".spk");
    const spkIconElem = spkElem.querySelector("svg");
    const percentElem = document.createElement("div");
    percentElem.style.display = "none";
    percentElem.classList.add("percent");
    const percentTextElem = document.createElement("span");
    percentElem.appendChild(percentTextElem);
    spkElem.appendChild(percentElem);
    const volBarContainerElem = playerElem.querySelector(".prg-spk");
    const volBarElem = volBarContainerElem.querySelector(".wrap > .has");
    const updatePercent = () => {
      percentTextElem.textContent = `${getBarVol(volBarElem)}%`;
    };
    updatePercent();
    const volBarObserver = new MutationObserver(updatePercent);
    volBarObserver.observe(volBarElem, { attributes: true });
    const hoverCallback = () => {
      spkIconElem.style.display = "none";
      percentElem.style.removeProperty("display");
    };
    const leaveCallback = () => {
      spkIconElem.style.removeProperty("display");
      percentElem.style.display = "none";
    };
    spkElem.addEventListener("pointerenter", hoverCallback);
    spkElem.addEventListener("pointerleave", leaveCallback);
    volBarContainerElem.addEventListener("pointerenter", hoverCallback);
    volBarContainerElem.addEventListener("pointerleave", leaveCallback);
  }
  function applyStyles() {
    const styleElem = document.createElement("style");
    styleElem.textContent = main_default;
    document.head.appendChild(styleElem);
  }
  plugin.onLoad(async () => {
    const playerElems = await Promise.race([
      Promise.all([
        betterncm.utils.waitForElement(".m-player"),
        betterncm.utils.waitForElement(".m-player-fm")
      ]),
      betterncm.utils.delay(1e4).then(() => Promise.reject(new Error("No spk element found")))
    ]);
    playerElems.forEach((x) => apply(x));
    applyStyles();
  });
})();

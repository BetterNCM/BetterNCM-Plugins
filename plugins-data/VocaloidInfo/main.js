(() => {
  // vocadb.js
  var BASE_URL = "https://vocadb.net/api/";
  async function get(url) {
    const response = await fetch(BASE_URL + url);
    return response.json();
  }
  async function searchArtist(name) {
    let id = await getArtistIdByName(name);
    if (id == 0)
      return 0;
    return await get(`artists/${id}/details`);
  }
  async function searchSong(name, artistsName) {
    let url = `songs?query=${name}&sort=SongType&childVoicebanks=true&nameMatchMode=Partial`;
    const datas = await get(url);
    if (datas.items[0] == void 0)
      return null;
    return getSongById(datas.items[0].id);
  }
  async function getSongById(id) {
    return await get(`songs/${id}/details`);
  }
  async function getArtistIdByName(name) {
    const datas = await get(`artists?query=${name}&allowBaseVoicebanks=true&childTags=false&start=0&maxResults=10&getTotalCount=false&preferAccurateMatches=false&lang=Default`);
    return datas.items[0] == void 0 ? 0 : datas.items[0].id;
  }

  // bilibili.js
  var BASE_URL2 = "http://api.bilibili.com/x/web-interface/";
  async function get2(url) {
    let iframe = dom("iframe", { hidden: true, src: BASE_URL2 + url, "class": ["vi-cors"] });
    document.body.appendChild(iframe);
    return await betterncm.utils.waitForElement(".vi-cors").then(async (result) => {
      await betterncm.utils.waitForFunction(() => {
        return result.contentDocument.querySelector("html > body").hasChildNodes();
      });
      let data = result.contentDocument.querySelector("html > body > pre").innerText;
      iframe.remove();
      return JSON.parse(data);
    });
  }
  async function searchVideo(av) {
    av = av.replace("av", "");
    return await get2(`view?aid=${av}`);
  }

  // utils.js
  function addMaterialYouStyle(father, ...elements) {
    elements.forEach((element) => {
      if (loadedPlugins["MaterialYouTheme"]) {
        if (element.classList != void 0) {
          element.classList.remove("inf", "s-fc1");
        }
        if (element.hasChildNodes) {
          element.childNodes.forEach((child) => {
            child.style.fontFamily = document.getElementsByTagName("body")[0].style.fontFamily;
            child.style.fontSize = "15px";
            child.style.color = "var(--md-accent-color-secondary)";
          });
        }
      }
      father.appendChild(element);
    });
    return father;
  }
  function getChineseNameFromNames(names, defaultName = "") {
    for (let name of names.split(", ")) {
      if (/.*[\u4e00-\u9fa5]+.*$/.test(name)) {
        return name;
      }
    }
    return defaultName;
  }
  function htmlToNode(html) {
    return dom("div", { innerHTML: html }).firstElementChild;
  }
  function injectCSS() {
    betterncm.utils.waitForElement("head").then((head) => {
      head.appendChild(htmlToNode(`
        <style>
            .vi-achievement {
                display: flex;
                justify-content: center;
                vertical-align: middle;
                align-items: center;
                font-size: 10px;
                border-radius: 20px;
                height: 20px;
                width: 60px;

            }
            .vi-achievement p {
                margin: 0;
                margin-left: 5px;
                color: black;
            }

        `));
    });
  }
  function xss(str) {
    const map = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return str.replace(/[<>&"']/g, (m) => map[m]);
  }

  // override.json
  var override_default = {
    "\u304A\u3058\u3083\u307E\u866B\u2161": 340768,
    \u611B\u8A00\u8449IV: 409527,
    \u611B\u8A00\u8449III: 207153,
    "\u3044\uFF5E\u3084\u3044\uFF5E\u3084\u3044\uFF5E\u3084": 174236
  };

  // component.js
  function newAchievement(color, img, text2) {
    return htmlToNode(`
        <b class="vi-achievement f-ust f-ust-1" style="border: 1px solid ${xss(color)}; background-color: ${color}30">
            <img src="${xss(img)}" width="16px" height="16px"/>
            <p>${xss(text2)}</p>
        </b>
    `);
  }
  var YOUTUBE_ICO = "https://vocadb.net/Content/youtube.png";
  var NICO_ICO = "https://vocadb.net/Content/nico.png";
  var BILI_ICO = "https://www.bilibili.com/favicon.ico";
  var Youtube1 = newAchievement("#FFD700", YOUTUBE_ICO, "\u4F20\u8BF4");
  var Youtube2 = newAchievement("#FF4D4D", YOUTUBE_ICO, "\u795E\u8BDD");
  var Niconico1 = newAchievement("#FFD700", NICO_ICO, "\u4F20\u8BF4");
  var Niconico2 = newAchievement("#FF4D4D", NICO_ICO, "\u795E\u8BDD");
  var Bilibili1 = newAchievement("#66CCFF", BILI_ICO, "\u6BBF\u5802");
  var Bilibili2 = newAchievement("#FFD700", BILI_ICO, "\u4F20\u8BF4");
  var Bilibili3 = newAchievement("#FF4D4D", BILI_ICO, "\u795E\u8BDD");
  var Bilibili4 = (view) => newAchievement("#66CCFF", BILI_ICO, view);

  // main.js
  var BR = () => dom("br", {});
  var text = (text2) => dom("span", { innerText: text2, "style": { "-webkit-user-select": "text" } });
  var nowPage;
  var initialized = false;
  var overrideMap = new Map(Object.entries(override_default));
  plugin.onConfig((tools) => {
    let page = dom("div", {});
    page.appendChild(dom("a", { innerText: "\u70B9\u6211\u524D\u5F80 Github \u4ED3\u5E93", onclick: function() {
      betterncm.ncm.openUrl("https://github.com/samyycX/VocaloidInfo");
    } }));
    page.appendChild(BR());
    page.appendChild(dom("a", { innerText: "\u70B9\u6211\u53CD\u9988\u672C\u63D2\u4EF6\u7684\u95EE\u9898", onclick: function() {
      betterncm.ncm.openUrl("https://github.com/samyycX/VocaloidInfo/issues");
    } }));
    return page;
  });
  plugin.onLoad(function() {
    betterncm.utils.waitForElement("div[class='name f-thide s-fc1 j-flag']").then((result) => {
      if (!initialized) {
        new MutationObserver((records, observer) => {
          betterncm.utils.waitForElement('span[class="name j-flag"]').then((span) => {
            document.querySelectorAll(".vi-song-item").forEach((node) => node.remove());
          });
          debouncedSongUpdate();
        }).observe(document.body.querySelector("div[class='name f-thide s-fc1 j-flag']"), { childList: true });
        initialized = true;
      }
    });
    injectCSS();
    new MutationObserver((records, observer) => {
      if (records[0].addedNodes[0] && records[0].addedNodes[0].className && records[0].addedNodes[0].className.includes("g-single")) {
        debouncedSongUpdate();
      }
    }).observe(document.body, { childList: true });
    window.addEventListener("hashchange", (event) => {
      const url = new URL(event.newURL);
      if (url.hash.startsWith("#/m/artist/?")) {
        nowPage = url.hash;
        debouncedArtistUpdate();
      }
    });
  });
  var debouncedArtistUpdate = betterncm.utils.debounce(() => {
    betterncm.utils.waitForElement(".name-artist").then((result) => {
      const name = result.querySelector(".f-ust").innerText;
      searchArtist(name).then((data) => {
        if (document.getElementsByClassName("vi-hidden-item").length != 0)
          return;
        if (data != null) {
          setArtistHTML(data);
          displayed = true;
        }
      });
    });
  }, 400);
  var debouncedSongUpdate = betterncm.utils.debounce(updateSong, 400);
  async function updateSong() {
    let title = await betterncm.utils.waitForElement('span[class="name j-flag"]');
    let artists = await betterncm.utils.waitForElement('li[class="f-thide f-ust f-ust-1"]');
    if (document.querySelector(".vi-song-item")) {
      document.querySelectorAll(".vi-song-item").forEach((node) => node.remove());
    }
    const songName = title.innerText.replace(/(\s*$)/g, "");
    let artistsName = [];
    artists.childNodes.forEach((child) => {
      if (child.title)
        artistsName.push(child.title);
    });
    let promise;
    if (overrideMap.has(songName)) {
      promise = getSongById(overrideMap.get(songName));
    } else {
      promise = searchSong(songName, artistsName);
    }
    promise.then((data) => {
      if (data == null)
        return;
      songDetails(data).then((descriptions) => {
        let dd1 = dom(
          "dd",
          { "class": ["inf", "s-fc2", "vi-song-item"], id: "vi-control" },
          dom("span", { innerText: "\u5728VocaDB\u4E2D\u67E5\u627E\u5230\u8BB0\u5F55  ", "class": ["item", "s-fc1", "mq-yahei"], style: { "font-size": "13px" } }),
          dom("a", { innerText: "\u67E5\u770B\u4FE1\u606F", "class": ["mq-yahei"], style: { "font-size": "13px" } }),
          BR(),
          BR()
        );
        dd1.childNodes[1].addEventListener("click", switchHidden, false);
        descriptions.forEach((description) => {
          description = hideItem(description);
          description.classList.add("mq-yahei");
          description.style.fontSize = "13px";
          dd1.appendChild(description);
        });
        dd1.appendChild(hideItem(BR()));
        dd1.appendChild(hideItem(BR()));
        betterncm.utils.waitForElement('div[class="m-comment m-comment-play"]').then((result) => {
          result.insertBefore(dd1, result.firstChild);
        });
      });
    });
  }
  async function setArtistHTML(data) {
    betterncm.utils.waitForElement(".m-info-artist").then((result) => {
      let dd1 = dom(
        "dd",
        { "class": ["inf", "s-fc2"], "id": "vi-control" },
        dom("span", { innerText: "\u5728VocaDB\u4E2D\u67E5\u627E\u5230\u8BB0\u5F55  ", "class": ["item", "s-fc1"] }),
        dom("a", { innerText: "\u67E5\u770B\u4FE1\u606F" }),
        BR(),
        BR()
      );
      dd1.childNodes[1].addEventListener("click", switchHidden, false);
      switch (data.artistType) {
        case "Producer":
          producerDetails(data).forEach((child) => {
            dd1.appendChild(hideItem(child));
          });
          break;
        case "Vocaloid":
        case "SynthesizerV":
        case "CeVIO":
          vocaloidDetails(data).forEach((child) => {
            dd1.appendChild(hideItem(child));
          });
          break;
        default:
          dd1.appendChild(BR());
          dd1.appendChild(hideItem(text(`\u7C7B\u578B: ${data.artistType}`)));
          dd1.appendChild(BR());
          dd1.appendChild(hideItem(text(`\u7B80\u4ECB: ${data.description.original}`)));
      }
      addMaterialYouStyle(result, dd1);
    });
  }
  function producerDetails(data) {
    let descriptions = [];
    descriptions.push(text("\u7C7B\u578B: P\u4E3B"));
    descriptions.push(BR(), BR());
    descriptions.push(text(`\u603B\u4E13\u8F91\u6570: ${data.sharedStats.albumCount}`), BR());
    descriptions.push(text(`\u603B\u6B4C\u66F2\u6570: ${data.sharedStats.songCount}`), BR(), BR());
    descriptions.push(text("\u4F5C\u54C1\u6392\u540DTOP5 (VocaDB)"), BR());
    const topSongs = data.topSongs.slice(0, 5);
    let i = 0;
    for (let song of topSongs) {
      let name = getChineseNameFromNames(song.additionalNames, song.defaultName);
      i++;
      let searchButton = dom("a", { innerText: "\u70B9\u51FB\u641C\u7D22   " });
      searchButton.addEventListener("click", function() {
        window.location = `#/m/search/?type=1&s=${song.defaultName}&logsource=typing&position=1`;
      }, false);
      descriptions.push(searchButton);
      descriptions.push(text(`${i}. ${name}`));
      descriptions.push(BR());
    }
    descriptions.push(BR());
    descriptions.push(text("\u4F7F\u7528\u58F0\u5E93 (\u524D\u4E09)"), BR());
    for (let vocaloid of data.advancedStats.topVocaloids.slice(0, 3)) {
      descriptions.push(text(`${vocaloid.data.name} - \u4F7F\u7528\u6B21\u6570:${vocaloid.count}`), BR());
    }
    descriptions.push(BR());
    descriptions.push(text(`\u7B80\u4ECB: ${data.description.original}`));
    return descriptions;
  }
  function vocaloidDetails(data) {
    let descriptions = [];
    descriptions.push(text(`\u7C7B\u578B: ${data.artistType}\u6B4C\u59EC`));
    descriptions.push(BR());
    if (JSON.stringify(data.childVoicebanks) != "[]") {
      descriptions.push(text("\u6240\u6709\u5B50\u58F0\u5E93"), BR());
      for (let voicebank of data.childVoicebanks) {
        descriptions.push(text(voicebank.name), BR());
      }
    }
    descriptions.push(BR(), text(`\u6240\u5C5E\u516C\u53F8: ${data.groups.map((g) => g.defaultName).join(", ")}`), BR());
    descriptions.push(text(`\u753B\u5E08: ${data.illustrators.map((i2) => i2.defaultName).join(", ")}`), BR());
    const date = new Date(data.releaseDate);
    descriptions.push(text(`\u53D1\u5E03\u65E5\u671F: ${date.getFullYear()}\u5E74${date.getMonth() + 1}\u6708${date.getDate()}\u65E5`), BR());
    descriptions.push(text(`\u58F0\u6E90: ${data.voiceProviders.map((v) => v.name).join(", ")}`), BR());
    descriptions.push(BR());
    descriptions.push(text(`\u603B\u4E13\u8F91\u6570: ${data.sharedStats.albumCount}`), BR());
    descriptions.push(text(`\u603B\u6B4C\u66F2\u6570: ${data.sharedStats.songCount}`), BR());
    descriptions.push(BR(), text("\u4F5C\u54C1\u6392\u540DTOP5 (VocaDB)"), BR());
    const topSongs = data.topSongs.slice(0, 5);
    let i = 0;
    for (let song of topSongs) {
      let name = getChineseNameFromNames(song.additionalNames, song.defaultName);
      i++;
      let searchButton = dom("a", { innerText: "\u70B9\u51FB\u641C\u7D22   " });
      searchButton.addEventListener("click", function() {
        window.location = `#/m/search/?type=1&s=${song.defaultName}&logsource=typing&position=1`;
      }, false);
      descriptions.push(searchButton);
      descriptions.push(text(`${i}. ${name} (${song.songType})`));
      descriptions.push(BR());
    }
    descriptions.push(BR(), text(`\u7B80\u4ECB: ${data.description.original}`), BR());
    return descriptions;
  }
  async function songDetails(data) {
    let descriptions = [];
    descriptions.push(text(`\u6B4C\u66F2\u7C7B\u578B: ${data.song.songType}`), BR());
    const date = new Date(data.song.publishDate);
    descriptions.push(text(`\u53D1\u5E03\u65E5\u671F: ${date.getFullYear()}\u5E74${date.getMonth() + 1}\u6708${date.getDate()}\u65E5`), BR());
    let info = await betterncm.utils.waitForElement(".inf > .info");
    let achievementsLine = dom("h2", { "class": ["u-tit", "f-ff2", "f-thide", "s-fc4"] });
    achievementsLine.style.marginLeft = "0";
    achievementsLine.style.display = "flex";
    achievementsLine.style.alignItems = "center";
    achievementsLine.style.height = "auto";
    for (let pool of data.pools) {
      switch (pool.id) {
        case 30:
          achievementsLine.appendChild(Niconico1);
          break;
        case 2665:
          achievementsLine.appendChild(Youtube1);
          break;
        case 6477:
          achievementsLine.appendChild(Niconico2);
          break;
        case 6478:
          achievementsLine.appendChild(Youtube2);
      }
    }
    if (data.alternateVersions.length != 0) {
      descriptions.push(BR(), text("\u5176\u4ED6\u7248\u672C (\u7FFB\u8C03/\u7FFB\u5531/Remix):"));
      data.alternateVersions.forEach((version) => {
        descriptions.push(BR(), text(`${version.name} (${version.songType}) - ${version.artistString}`));
      });
    }
    for (let pv of data.pvs) {
      if (pv.service == "Bilibili") {
        descriptions.push(BR(), BR(), text("\u6B64\u6B4C\u66F2B\u7AD9\u6570\u636E: "), BR());
        let av = pv.url.split("/").slice(-1)[0];
        let data2 = await searchVideo(av);
        if (data2.code == 0) {
          data2 = data2.data;
          let view = data2.stat.view;
          if (view >= 1e7) {
            achievementsLine.appendChild(Bilibili3);
          } else if (view >= 1e6) {
            achievementsLine.appendChild(Bilibili2);
          } else if (view >= 1e5) {
            achievementsLine.appendChild(Bilibili1);
          } else {
            achievementsLine.appendChild(Bilibili4(view));
          }
          descriptions.push(BR());
          descriptions.push(text(`\u559C\u6B22\u6570 ${data2.stat.like}`), BR());
          descriptions.push(text(`\u6295\u5E01\u6570 ${data2.stat.coin}`), BR());
          descriptions.push(text(`\u6536\u85CF\u6570 ${data2.stat.favorite}`), BR());
          descriptions.push(BR());
          if (data2.honor_reply.honor != void 0) {
            data2.honor_reply.honor.forEach((honor) => {
              descriptions.push(text(honor.desc), BR());
            });
          }
          descriptions.push(BR(), text(`\u7B80\u4ECB: `), BR());
          for (let desc of data2.desc.split("\n")) {
            descriptions.push(text(desc), BR());
          }
          descriptions.push(BR());
        }
      }
    }
    for (let node of Array(...achievementsLine.children).slice()) {
      node.style.marginRight = "5px";
    }
    info.insertBefore(achievementsLine, info.firstChild);
    return descriptions;
  }
  function hideItem(element) {
    element.hidden = true;
    element.setAttribute("class", "vi-hidden-item item s-fc1");
    return element;
  }
  function switchHidden() {
    let vicontrol = document.getElementById("vi-control");
    const hiddenItems = document.getElementsByClassName("vi-hidden-item");
    if (vicontrol.classList.contains("vi-hidden-displayed")) {
      for (let i = 0; i < hiddenItems.length; i++) {
        hiddenItems.item(i).hidden = true;
      }
      vicontrol.classList.remove("vi-hidden-displayed");
      vicontrol.childNodes[1].innerText = "\u67E5\u770B\u4FE1\u606F";
    } else {
      for (let i = 0; i < hiddenItems.length; i++) {
        hiddenItems.item(i).hidden = false;
      }
      vicontrol.classList.add("vi-hidden-displayed");
      vicontrol.childNodes[1].innerText = "\u9690\u85CF\u4FE1\u606F";
    }
  }
})();

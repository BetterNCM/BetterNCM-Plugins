rswLoad();function rswLoad(i=0){i++;const BFP=BETTERNCM_FILES_PATH;
const DLP="/plugins_dev/RevisedSecondaryWindows";const RTP="/plugins_runtime/RevisedSecondaryWindows";
function fe(n){return betterncm_native.fs.exists(n)}function q(n){return document.querySelector(n)}
async function evalLocal(n){let wd=(fe(`${DLP}/${n}`))?DLP:RTP;let f=await fetch(`${BFP}/${wd}/${n}`);
    if(f.ok){eval(await f.text())}else{alert(`RswError: Failed to fetch\nFile:${wd}/${n}\nStatus:${f.status} ${f.statusText}`)}}
if(q("#portal_root")){console.info("RswInfo: Main window");return}
if(q("#root > .sc-AykKC")){console.info("RswInfo: Audio effect");evalLocal("audioEffect.js");return}
if(q("#login_root")){console.info("RswInfo: Login window");evalLocal("loginWindow.js");return}
if(q(".zbar")){console.info("RswInfo: Third-party login window");evalLocal("loginWindow3.js");return}
console.error("RswError: Premature execution or this page is not an NCM page.");
if(i >= 10){console.warn(`RswWarnning: Tried ${i} times, stop loading. If you wanna try again, please run "rswLoad()"`);return}
console.warn(`RswWarnning: Try again soon... Tried ${i} times.`);setTimeout(()=>rswLoad(i), 500)}
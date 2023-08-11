plugin.onLoad(() => {
    betterncm.app.exec("cmd /k cd /d %AppData%/../Local/NetEase/CloudMusic/ && for /L %i in () do @(del cloudmusic.elog 2>nul && del web.log 2>nul && if not exist cloudmusic.elog exit) & timeout /T 5", 0, 0)
});
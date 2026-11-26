@echo off

set cloudmusic=0
set easyrp=0

:loop
tasklist | find /i "cloudmusic.exe" >nul && set cloudmusic=1
tasklist | find /i "easyrp.exe" >nul && set easyrp=1

if %cloudmusic%==0 (
    if %easyrp%==1 (
        taskkill /im easyrp.exe
    ) 
)

if %cloudmusic%==1 (
    if %easyrp%==0 (
        start /B easyrp.exe

        :lp
            tasklist | find /i "cloudmusic.exe" >nul || (
            taskkill /f /im easyrp.exe
            exit
        )
        timeout /t 10 >nul
        goto lp
    ) 
)

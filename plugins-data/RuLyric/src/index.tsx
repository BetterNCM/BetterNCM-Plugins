import { Alert, Button, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, MenuItem, Paper, Select, Switch, TextField, Typography, styled } from '@mui/material';
import { Error as ErrIcon } from '@mui/icons-material';
import { Stack } from '@mui/system';
import { createRoot } from 'react-dom/client';
import { useLocalStorage, usePromise } from './hooks';
import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { HexAlphaColorPicker } from "react-colorful";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getPlayingSong } from './ncm';


function checkRequirements() {
    return true;
}

const ele = document.createElement("div");

plugin.onLoad(() => {
    const root = createRoot(ele);

    if (checkRequirements()) {
        root.render(<MainMenu />);
    } else {
        root.render(<RequirementCheckFailedMenu />);
    }
})

function RequirementCheckFailedMenu() {
    return (
        <Alert color="error" icon={<ErrIcon />}>
            <Typography fontWeight="lg" mt={0.25}>
                所需依赖未加载！
            </Typography>
            <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                RuLyrics 依赖 未加载完全，插件将无法运行！
            </Typography>
        </Alert>
    )
}

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: '#ffffffcc',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

let _currentLyrics;
let _currentLine = 0;

function MainMenu() {
    const [fontConfig, setFontConfig] = useLocalStorage("rulyrics.fontConfig", [
        "Noto Sans SC",
        18,
        "#ffffff",
        800,
        "#ffffff22",
    ]);

    const [secFontConfig, setSecFontConfig] = useLocalStorage("rulyrics.secondaryFontConfig", [
        "Noto Sans SC",
        14,
        "#ffffff11",
        600,
        "#ffffff22",
    ]);

    const [taskbar, setTaskbar] = useLocalStorage("rulyrics.taskbar", false);

    React.useEffect(() => {
        if (taskbar) {
            setTimeout(() => {
                betterncm_native.native_plugin.call('rulyrics.embed_into_taskbar', [])
            }, 500);
        }else{
            setTimeout(() => {
                betterncm_native.native_plugin.call('rulyrics.embed_into_any', ['']);
            }, 500);
        }
    }, [taskbar]);

    const [fontList] = usePromise(
        React.useMemo(async () => (await legacyNativeCmder.call("os.querySystemFonts"))[1], []),
        []);

    function FontConfig({ defaultValue, onChange }) {
        const [config, _setConfig] = React.useState(defaultValue);

        function setConfig(index, value) {
            config[index] = value;
            onChange(config)
            _setConfig(config)
        }

        return (
            <>
                <Stack direction="row" spacing={2}>
                    <TextField size="small" label="字体" id="font" variant='standard'
                        defaultValue={defaultValue[0]}
                        select onChange={(e) => setConfig(0, e.target.value)}
                    >
                        {
                            fontList && (
                                fontList.map(font => (<MenuItem value={font}>
                                    {font}
                                </MenuItem>))
                            )
                        }
                    </TextField>

                    <TextField size="small" label="大小" type="number" variant='standard' defaultValue={defaultValue[1]} onChange={(e) =>
                        setConfig(1, parseFloat(e.target.value))} />

                    <TextField size="small" label="粗细" type="number" variant='standard' defaultValue={defaultValue[3]} onChange={(e) =>
                        setConfig(3, parseFloat(e.target.value))} />
                </Stack>

                <FormControl sx={{ m: 1, minWidth: 100 }}>
                    <InputLabel>
                        前景色
                    </InputLabel>
                    <HexAlphaColorPicker
                        color={config[2]}
                        onChange={color => setConfig(2, color)}
                    />
                </FormControl>
                <FormControl sx={{ m: 1, minWidth: 100 }}>
                    <InputLabel>
                        背景色
                    </InputLabel>
                    <HexAlphaColorPicker
                        color={config[4]}
                        onChange={color => setConfig(4, color)}
                    />
                </FormControl>
            </>
        )
    }

    const [currentSong, setCurrentSong] = React.useState(null);
    const [currentLyrics, setCurrentLyrics] = React.useState<any>(null);

    React.useEffect(() => { _currentLyrics = currentLyrics; }, [currentLyrics]);

    React.useEffect(() => {
        setCurrentSong(getPlayingSong());
        legacyNativeCmder.appendRegisterCall("Load", "audioplayer", async () => {
            const playing = getPlayingSong();
            setCurrentSong(playing);

            try {
                const lrc = await loadedPlugins.liblyric.getLyricData(playing.data.id);
                const parsed = loadedPlugins.liblyric.parseLyric(lrc.lrc?.lyric, lrc.tlyric?.lyric, lrc.romalrc?.lyric, lrc.yrc?.lyric)
                setCurrentLyrics(parsed)
            }
            catch (e) {
                setCurrentLyrics(null);
            }
            finally {
                _currentLine = 0;
                betterncm_native.native_plugin.call('rulyrics.update_lyrics', [
                    playing.data.name,
                    "",
                    0
                ])
            }
        });
    }, []);

    React.useEffect(() => {

        let lastLine = -1;

        legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
            betterncm_native.native_plugin.call('rulyrics.seek', [
                0,
                state === 2]);
        });

        legacyNativeCmder.appendRegisterCall(
            "PlayProgress",
            "audioplayer",
            (_, time) => {
                const ms = Math.round(time * 1000);
                if (_currentLyrics) {
                    if (!_currentLyrics[_currentLine]) _currentLine = 0;

                    while (_currentLyrics[_currentLine + 1] && (_currentLyrics[_currentLine + 1].time < ms))
                        _currentLine++;

                    while (_currentLyrics[_currentLine] &&
                        (_currentLyrics[_currentLine].time > ms))
                        _currentLine--;


                    if (lastLine !== _currentLine) {
                        lastLine = _currentLine;

                        if (!_currentLyrics[_currentLine]) return;

                        let lyricsArr;

                        if (_currentLyrics[_currentLine].dynamicLyric) {
                            lyricsArr = _currentLyrics[_currentLine].dynamicLyric.map(({ word, duration }) => [word, duration])
                        } else {
                            lyricsArr = [
                                [_currentLyrics[_currentLine].originalLyric,
                                _currentLyrics[_currentLine].duration]
                            ];
                        }

                        betterncm_native.native_plugin.call('rulyrics.update_lyrics', [
                            [
                                lyricsArr, _currentLine
                            ],
                            _currentLyrics[_currentLine].translatedLyric,
                            Math.max(ms - _currentLyrics[_currentLine].time, 0)
                        ])
                    } else {
                        const time = Math.round(ms - _currentLyrics[_currentLine].time);
                        if (time > 100)
                            betterncm_native.native_plugin.call('rulyrics.seek', [
                                time,
                                false]);
                    }

                }
            },
        );
    }, [])

    function initRustApp() {
        betterncm_native.native_plugin.call('rulyrics.init_lyrics_app', [...fontConfig, ...secFontConfig]);
        if (taskbar) {
            setTimeout(() => {
                betterncm_native.native_plugin.call('rulyrics.embed_into_taskbar', [])
            }, 500);
        }
    }

    React.useEffect(initRustApp, [])

    return (<Stack spacing={2}>

        <Item>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                >
                    <Typography>主歌词设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FontConfig defaultValue={fontConfig} onChange={c => setFontConfig(c)} />
                    <Button onClick={initRustApp}>应用</Button>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                >
                    <Typography>副歌词设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FontConfig defaultValue={secFontConfig} onChange={c => setSecFontConfig(c)} />

                    <Button onClick={initRustApp}>应用</Button>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                >
                    <Typography>其它设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch checked={taskbar} onChange={(_, c) => setTaskbar(c)} />
                            }
                            label="嵌入到任务栏 （可能需要重启网易云）"
                        />
                    </FormGroup>

                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                >
                    <Typography>歌曲信息</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <pre style={{ overflow: "scroll", textAlign: "left" }}>
                        {
                            JSON.stringify(currentSong, undefined, "\t")
                        }
                    </pre>
                </AccordionDetails>
            </Accordion>
        </Item>

    </Stack>)
}

plugin.onConfig(() => {

    return ele;
})
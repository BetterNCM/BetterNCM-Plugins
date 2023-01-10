/**
 * @fileoverview
 * 此处的脚本将会在插件管理器加载插件期间被加载
 * 一般情况下只需要从这个入口点进行开发即可满足绝大部分需求
 */
import {
    MdAdd,
    MdDelete,
    MdDesktopWindows,
    MdError,
    MdSelectAll,
    MdSettings,
    MdWallpaper,
    MdWarning,
} from "react-icons/md";
import { useLocalStorage } from "./hooks";
import "./index.scss";
import { Alert, Card, Switch, Typography } from "@mui/material";
import { render } from "react-dom";
import * as React from "react";
import Button from "@mui/material/Button";
import { STORE_KEY_INFO_PROVIDER, STORE_KEY_SMTC_ENABLED } from "./keys";
import { DOMProvider } from "./SongInfoProviders/DOMProvider";
import { BaseProvider } from "./SongInfoProviders/BaseProvider";

let configElement = document.createElement("div");

plugin.onLoad((selfPlugin) => {
    render(<Main />, configElement);
});

function Main() {
    const nativePluginLoaded = React.useMemo(() => {
        try {
            return (
                betterncm_native.native_plugin.call("inflink.test", []) ===
                "true"
            );
        } catch (e) {
            return false;
        }
    }, []);

    const [SMTCEnabled, setSMTCEnabled] = useLocalStorage(
        STORE_KEY_SMTC_ENABLED,
        false,
    );

    const [infoProviderName, setInfoProviderName] = useLocalStorage(
        STORE_KEY_INFO_PROVIDER,
        "dom",
    );

    const [InfoProvider, setInfoProvider] = React.useState<BaseProvider | null>(
        null,
    );

    React.useEffect(() => {
        if (InfoProvider) InfoProvider.disabled = true;

        if (infoProviderName === "dom") setInfoProvider(new DOMProvider());
    }, [infoProviderName]);

    React.useEffect(() => {
        function onUpdateSongInfo(e) {
            const { songName, albumName, authorName, thumbnail } = e.detail;
            betterncm_native.native_plugin.call("inflink.updateSMTC", [
                songName,
                albumName,
                authorName,
                thumbnail,
            ]);
        }

        if (SMTCEnabled) {
            betterncm_native.native_plugin.call("inflink.enableSMTC", []);
            betterncm_native.native_plugin.call(
                "inflink.registerSMTCEventCallback",
                [
                    (btn) => {
                        const MESSAGE_MAP = {
                            6: "NextSong",
                            7: "PreviousSong",
                            1: "Pause",
                            0: "Play",
                        };
                        if (MESSAGE_MAP[btn] !== undefined)
                            InfoProvider?.dispatchEvent(
                                new CustomEvent(MESSAGE_MAP[btn]),
                            );
                        else
                            console.warn(
                                "[InfLink] Unknown SMTC button id",
                                btn,
                            );
                    },
                ],
            );

            function onUpdatePlayState(e) {
                const state = e.detail === "Playing" ? 3 : 4;
                betterncm_native.native_plugin.call(
                    "inflink.updateSMTCPlayState",
                    [state],
                );
            }
            InfoProvider?.addEventListener(
                "updatePlayState",
                onUpdatePlayState,
            );
            InfoProvider?.addEventListener("updateSongInfo", onUpdateSongInfo);
        } else {
            InfoProvider?.removeEventListener(
                "updateSongInfo",
                onUpdateSongInfo,
            );
            InfoProvider?.removeEventListener(
                "updateSongInfo",
                onUpdateSongInfo,
            );
            betterncm_native.native_plugin.call("inflink.disableSMTC", []);
        }
    }, [InfoProvider, SMTCEnabled]);

    if (!nativePluginLoaded) {
        return (
            <div>
                <Alert color="error" icon={<MdError />}>
                    <Typography fontWeight="lg" mt={0.25}>
                        Native Plugin未加载！
                    </Typography>
                    <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                        InfLink将无法使用，请确定您使用的是 1.0.0-pre2
                        及以上版本的 BetterNCM
                    </Typography>
                </Alert>
            </div>
        );
    }

    return (
        <div>
            <Switch
                checked={SMTCEnabled}
                onChange={(e, checked) => setSMTCEnabled(checked)}
            />
            <span>开启SMTC</span>
        </div>
    );
}

plugin.onConfig(() => {
    return configElement;
});

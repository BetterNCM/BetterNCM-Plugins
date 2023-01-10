import { BaseProvider, PlayState } from "./BaseProvider";

export class DOMProvider extends BaseProvider {
    constructor() {
        super();
        let lastImgUrl;

        this.addEventListener("Pause", () => {
            (document.querySelector(".btnp") as HTMLButtonElement)?.click();
        });

        this.addEventListener("Play", () => {
            (document.querySelector(".btnp") as HTMLButtonElement)?.click();
        });

        this.addEventListener("PreviousSong", () => {
            (document.querySelector(".btnc-prv") as HTMLButtonElement)?.click();
        });

        this.addEventListener("NextSong", () => {
            (document.querySelector(".btnc-nxt") as HTMLButtonElement)?.click();
        });

        let playState: PlayState;
        setInterval(() => {
            const state = document.querySelector(".btnp-pause")
                ? "Playing"
                : "Paused";
            if (playState !== state) {
                playState = state;
                this.dispatchEvent(
                    new CustomEvent("updatePlayState", { detail: playState }),
                );
            }
        }, 50);

        setInterval(() => {
            if (document.querySelector(".j-cover")) {
                const imgUrl = (
                    document?.querySelector(".j-cover") as HTMLImageElement
                )?.src
                    .replace("orpheus://cache/?", "")
                    .replace(/\?(.*)/, "");

                if (lastImgUrl === imgUrl) return;
                lastImgUrl = imgUrl;
                console.log("UPDATE");
                this.dispatchEvent(
                    new CustomEvent("updateSongInfo", {
                        detail: {
                            songName: (
                                document.querySelector(
                                    ".j-title",
                                ) as HTMLParagraphElement
                            ).title,
                            albumName: (
                                document.querySelector(
                                    ".j-title",
                                ) as HTMLParagraphElement
                            ).title,
                            authorName: (
                                document.querySelector(
                                    "p.j-title span.f-dib",
                                ) as HTMLParagraphElement
                            ).innerText,
                            thumbnail: imgUrl,
                        },
                    }),
                );
            }
        }, 100);
    }
}

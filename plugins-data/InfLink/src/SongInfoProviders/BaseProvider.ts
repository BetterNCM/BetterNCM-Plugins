export type PlayState= "Playing" | "Paused";

export class BaseProvider extends EventTarget {
    constructor() {
        super();
    }
    disabled=false;
    override dispatchEvent(event: Event): boolean {
        if(this.disabled)return false;
        return super.dispatchEvent(event);
    }
}

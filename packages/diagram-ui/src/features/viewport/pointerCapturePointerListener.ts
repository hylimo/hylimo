import type { SModelElementImpl } from "sprotty";
import type { Action } from "sprotty-protocol";
import { PointerListener } from "../contrib/pointer-tool.js";

/**
 * Pointer listener that captures the pointer when the pointer is down on an element
 */
export class PointerCapturePointerListener extends PointerListener {
    override pointerDown(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        (event.target as HTMLElement | undefined)?.setPointerCapture(event.pointerId);
        return [];
    }
}

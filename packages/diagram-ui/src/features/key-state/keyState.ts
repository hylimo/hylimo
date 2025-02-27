import { injectable } from "inversify";

/**
 * Key state provider
 */
@injectable()
export class KeyState {
    /**
     * Whether the shift key is pressed
     */
    isShiftPressed = false;
    /**
     * Whether the space key is pressed
     */
    isSpacePressed = false;
}

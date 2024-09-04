import { ElementLayoutConfig } from "../elementLayoutConfig.js";

/**
 * Base class for CanvasElementLayoutConfig and CanvasConnectionLayoutConfig
 */
export abstract class CanvasContentLayoutConfig extends ElementLayoutConfig {
    /**
     * True if is a layout element which should not be included in the final diagram
     */
    abstract isLayoutContent: boolean;
}

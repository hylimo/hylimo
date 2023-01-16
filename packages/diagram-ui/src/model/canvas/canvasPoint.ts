import { Point, RelativePoint } from "@hylimo/diagram-common";
import { PositionProvider } from "../../features/layout/positionProvider";
import { SCanvasContent } from "./canvasContent";

/**
 * Base model for all canvas points
 */
export abstract class SCanvasPoint extends SCanvasContent implements PositionProvider {
    /**
     * The provided position
     */
    abstract position: Point;
    /**
     * If present, this point is manipulatable
     */
    editable?: number[];

    /**
     * Evaluates if this point is visible
     */
    get isVisible(): boolean {
        return this.parent.pointVisibilityManager.isVisible(this.id);
    }
}

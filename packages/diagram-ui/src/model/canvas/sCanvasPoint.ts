import { CanvasPoint, Point } from "@hylimo/diagram-common";
import { PositionProvider } from "../../features/layout/positionProvider";
import { SCanvasContent } from "./sCanvasContent";

/**
 * Base model for all canvas points
 */
export abstract class SCanvasPoint extends SCanvasContent implements CanvasPoint, PositionProvider {
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

import { CanvasPoint, Point } from "@hylimo/diagram-common";
import { PositionProvider } from "../../features/layout/positionProvider.js";
import { SCanvasContent } from "./sCanvasContent.js";

/**
 * Base model for all canvas points
 */
export abstract class SCanvasPoint extends SCanvasContent implements CanvasPoint, PositionProvider {
    /**
     * The default point size
     */
    static readonly POINT_SIZE = 16;

    /**
     * The size of the inner point
     */
    static readonly INNER_POINT_SIZE = 8;

    /**
     * The provided position
     */
    position!: Point;

    /**
     * Evaluates if this point is visible
     */
    get isVisible(): boolean {
        return this.parent.pointVisibilityManager.isVisible(this.id);
    }

    constructor() {
        super();
        this.cachedProperty<Point>("position", () => {
            return this.root.layoutEngine.getPoint(this.id, this.parent.id);
        });
    }
}

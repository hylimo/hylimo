import { CanvasPoint, ModificationSpecification, Point } from "@hylimo/diagram-common";
import { PositionProvider } from "../../features/layout/positionProvider.js";
import { SCanvasContent } from "./sCanvasContent.js";

/**
 * Base model for all canvas points
 */
export abstract class SCanvasPoint extends SCanvasContent implements CanvasPoint, PositionProvider {
    /**
     * The provided position
     */
    position!: Point;
    /**
     * If present, this point is manipulatable
     */
    editable!: ModificationSpecification;

    /**
     * Evaluates if this point is visible
     */
    get isVisible(): boolean {
        return this.parent.pointVisibilityManager.isVisible(this.id);
    }

    constructor() {
        super();
        this.cachedProperty<Point>("position", () => {
            return this.parent.layoutEngine.getPoint(this.id);
        });
    }
}

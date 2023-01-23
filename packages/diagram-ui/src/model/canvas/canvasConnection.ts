import { Point } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./canvasConnectionSegment";
import { SCanvasContent } from "./canvasContent";
import { SCanvasPoint } from "./canvasPoint";

/**
 * Model for CanvasConnection
 */
export class SCanvasConnection extends SCanvasContent {
    /**
     * The id of the start point
     */
    start!: string;
    /**
     * The color of the stroke
     */
    stroke?: string;
    /**
     * The opacity applied to the stroke
     */
    strokeOpacity?: number;
    /**
     * The width of the stroke
     */
    strokeWidth?: number;

    /**
     * Getter for the position associated with start
     */
    get startPosition(): Point {
        const target = this.root.index.getById(this.start) as SCanvasPoint;
        return target.position;
    }

    /**
     * Checks if control elements (like bezier control point handles) should be rendered
     */
    get showControlElements(): boolean {
        return this.parent.pointVisibilityManager.isVisible(this.id);
    }

    override get dependencies(): string[] {
        const childDependencies = this.children.flatMap((child) => (child as SCanvasConnectionSegment).dependencies);
        return [this.start, ...childDependencies];
    }
}

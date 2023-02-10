import { CanvasConnection, Point, TransformedLine } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { LineProvider } from "../../features/layout/lineProvider";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
import { SCanvasContent } from "./sCanvasContent";
import { SCanvasPoint } from "./sCanvasPoint";
import { identity } from "transformation-matrix";

/**
 * Animated fields for CanvasConnection
 */
const canvasConnectionAnimatedFields = new Set(["strokeWidth", "strokeOpacity"]);

/**
 * Model for CanvasConnection
 */
export class SCanvasConnection extends SCanvasContent implements CanvasConnection, LineProvider, LinearAnimatable {
    override type!: typeof CanvasConnection.TYPE;
    animatedFields = canvasConnectionAnimatedFields;
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
    startPosition!: Point;
    /**
     * The provided line
     */
    line!: TransformedLine;

    constructor() {
        super();

        this.cachedProperty<Point>("startPosition", () => {
            const target = this.root.index.getById(this.start) as SCanvasPoint;
            return target.position;
        });
        this.cachedProperty<TransformedLine>("line", () => {
            let start = this.startPosition;
            const segments = (this.children as SCanvasConnectionSegment[]).flatMap((segment) => {
                const result = segment.generateSegments(start);
                start = segment.endPosition;
                return result;
            });
            return {
                transform: identity(),
                line: {
                    start: this.startPosition,
                    segments
                }
            };
        });
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

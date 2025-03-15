import type {
    CanvasConnection,
    CanvasConnectionLayout,
    Point,
    ProjectionResult,
    Stroke,
    TransformedLine
} from "@hylimo/diagram-common";
import type { LinearAnimatable } from "../../features/animation/model.js";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment.js";
import { SCanvasContent } from "./sCanvasContent.js";
import type { SCanvasPoint } from "./sCanvasPoint.js";
import { SMarker } from "./sMarker.js";

/**
 * Animated fields for CanvasConnection
 */
const canvasConnectionAnimatedFields = new Set([]);

/**
 * Model for CanvasConnection
 */
export class SCanvasConnection extends SCanvasContent implements CanvasConnection, LinearAnimatable {
    override type!: typeof CanvasConnection.TYPE;
    animatedFields = canvasConnectionAnimatedFields;
    /**
     * The id of the start point
     */
    start!: string;
    /**
     * The color of the stroke
     */
    stroke?: Stroke;
    /**
     * Getter for the position associated with start
     */
    startPosition!: Point;
    /**
     * The start marker if existing
     */
    startMarker?: SMarker;
    /**
     * The end marker if existing
     */
    endMarker?: SMarker;
    /**
     * The segments of the connection
     */
    segments!: SCanvasConnectionSegment[];
    /**
     * Layout used for rendering
     */
    layout!: CanvasConnectionLayout;
    /**
     * The provided line
     */
    line!: TransformedLine;
    /**
     * An expression which can be used by edits to obtain this element in an edit
     */
    editExpression?: string;
    /**
     * The projection result for the preview data
     */
    splitPreviewDataProvider?: () => ProjectionResult;
    /**
     * Required to mark this as moveable
     */
    private readonly position = null;

    constructor() {
        super();

        this.cachedProperty<Point>("startPosition", () => {
            const target = this.index.getById(this.start) as SCanvasPoint;
            return target.position;
        });
        this.cachedProperty<SMarker | null>("startMarker", () => {
            const res = this.children.find((child) => child instanceof SMarker && child.pos === "start") ?? null;
            return res as SMarker | null;
        });
        this.cachedProperty<SMarker | null>("endMarker", () => {
            const res = this.children.find((child) => child instanceof SMarker && child.pos === "end") ?? null;
            return res as SMarker | null;
        });
        this.cachedProperty<SCanvasConnectionSegment[]>("segments", () => {
            return this.children.filter(
                (child) => child instanceof SCanvasConnectionSegment
            ) as SCanvasConnectionSegment[];
        });
        this.cachedProperty<CanvasConnectionLayout>("layout", () => {
            return this.root.layoutEngine.layoutConnection(this);
        });
        this.cachedProperty<TransformedLine>("line", () => {
            return this.root.layoutEngine.layoutLine(this, this.parent.id);
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

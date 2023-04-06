import { CanvasConnection, CanvasConnectionLayout, Point, Stroke, TransformedLine } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { LineProvider } from "../../features/layout/lineProvider";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
import { SCanvasContent } from "./sCanvasContent";
import { SCanvasPoint } from "./sCanvasPoint";
import { SMarker } from "./sMarker";

/**
 * Animated fields for CanvasConnection
 */
const canvasConnectionAnimatedFields = new Set([]);

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
     * Required to mark this as moveable
     */
    private readonly position = null;

    constructor() {
        super();

        this.cachedProperty<Point>("startPosition", () => {
            const target = this.root.index.getById(this.start) as SCanvasPoint;
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
            return this.parent.layoutEngine.layoutConnection(this);
        });
        this.cachedProperty<TransformedLine>("line", () => {
            return this.parent.layoutEngine.layoutLine(this);
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

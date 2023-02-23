import { CanvasConnection, MarkerRenderInformation, Point, TransformedLine } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { LineProvider } from "../../features/layout/lineProvider";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
import { SCanvasContent } from "./sCanvasContent";
import { SCanvasPoint } from "./sCanvasPoint";
import { identity } from "transformation-matrix";
import { SMarker } from "./sMarker";

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
     * Render information for the start marker, if existing
     */
    startMarkerInformation?: MarkerRenderInformation;
    /**
     * Render information for the end marker, if existing
     */
    endMarkerInformation?: MarkerRenderInformation;
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
        this.cachedProperty<MarkerRenderInformation | null>("startMarkerInformation", () => {
            const startMarker = this.startMarker;
            const startPos = this.startPosition;
            if (startMarker != null) {
                const startSegment = this.segments[0];
                return startSegment.calculateMarkerRenderInformation(startMarker, startPos);
            } else {
                return null;
            }
        });
        this.cachedProperty<MarkerRenderInformation | null>("endMarkerInformation", () => {
            const endMarker = this.endMarker;
            if (endMarker != null) {
                let endStartPosition: Point;
                const segments = this.segments;
                if (segments.length == 1) {
                    endStartPosition = this.startPosition;
                } else {
                    endStartPosition = segments.at(-2)!.endPosition;
                }
                return segments.at(-1)!.calculateMarkerRenderInformation(endMarker, endStartPosition);
            } else {
                return null;
            }
        });
        this.cachedProperty<TransformedLine>("line", () => {
            const start = this.startMarkerInformation?.newPoint ?? this.startPosition;
            let startPos = start;
            const segments = this.segments;
            const lineSegments = segments.flatMap((segment, i) => {
                let endPos: Point;
                if (i == segments.length - 1) {
                    endPos = this.endMarkerInformation?.newPoint ?? segment.endPosition;
                } else {
                    endPos = segment.endPosition;
                }
                const result = segment.generateSegments(startPos, endPos);
                startPos = segment.endPosition;
                return result;
            });
            return {
                transform: identity(),
                line: {
                    start,
                    segments: lineSegments
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

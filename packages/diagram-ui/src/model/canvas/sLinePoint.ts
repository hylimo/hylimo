import { LineEngine, LinePoint, Point, TransformedLine } from "@hylimo/diagram-common";
import { SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model";
import { isLineProvider } from "../../features/layout/lineProvider";
import { SCanvasPoint } from "./sCanvasPoint";
import { identity } from "transformation-matrix";

const linePointAnimatedFields = new Set(["pos"]);

/**
 * Model for LinePoint
 */
export class SLinePoint extends SCanvasPoint implements LinePoint, LinearAnimatable {
    override type!: typeof LinePoint.TYPE;
    readonly animatedFields = linePointAnimatedFields;
    /**
     * The id of the CanvasElement or CanvasConnection which provides the line
     */
    lineProvider!: string;
    /**
     * The position where on the line the point is located, between 0 and 1
     */
    pos!: number;
    /**
     * The distance of the point to the line
     */
    distance?: number;
    /**
     * The segment to which pos is relative to, if not provided, pos is relative to the whole line
     */
    segment?: number;
    /**
     * Cached position without distance
     */
    rootPosition!: Point;
    /**
     * Cached line
     */
    line!: TransformedLine;

    constructor() {
        super();

        this.cachedProperty<TransformedLine>("line", () => {
            const lineProvider = this.root.index.getById(this.lineProvider) as SModelElement;
            if (isLineProvider(lineProvider)) {
                return lineProvider.line;
            } else {
                return {
                    line: {
                        start: Point.ORIGIN,
                        segments: []
                    },
                    transform: identity()
                };
            }
        });
        this.cachedProperty<Point>("rootPosition", () => {
            return LineEngine.DEFAULT.getPoint(this.pos, this.segment, 0, this.line);
        });
    }

    override get dependencies(): string[] {
        // maybe TODO
        return [];
    }
}

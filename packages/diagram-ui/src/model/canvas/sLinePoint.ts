import { LineEngine, LinePoint, Point } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model.js";
import { SCanvasPoint } from "./sCanvasPoint.js";
import { SCanvasConnection } from "./sCanvasConnection.js";
import { SCanvasElement } from "./sCanvasElement.js";

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

    constructor() {
        super();

        this.cachedProperty<Point>("rootPosition", () => {
            const line = this.root.layoutEngine.layoutLine(
                this.index.getById(this.lineProvider) as SCanvasConnection | SCanvasElement,
                this.parent.id
            );
            return LineEngine.DEFAULT.getPoint(this.pos, this.segment, 0, line);
        });
    }

    override get dependencies(): string[] {
        return [];
    }
}

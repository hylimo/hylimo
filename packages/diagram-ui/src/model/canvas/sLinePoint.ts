import { LinePoint, Point, TransformedLine } from "@hylimo/diagram-common";
import { SModelElementImpl } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model.js";
import { isLineProvider } from "../../features/layout/lineProvider.js";
import { SCanvasPoint } from "./sCanvasPoint.js";

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
            const lineProvider = this.index.getById(this.lineProvider) as SModelElementImpl;
            if (isLineProvider(lineProvider)) {
                return lineProvider.line;
            } else {
                throw new Error("No line provider found for line point");
            }
        });
        this.cachedProperty<Point>("rootPosition", () => {
            return this.root.layoutEngine.getPoint(this.lineProvider, this.parent.id);
        });
    }

    override get dependencies(): string[] {
        return [];
    }
}

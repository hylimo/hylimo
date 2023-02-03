import { LineEngine, LinePoint, Point, TransformedLine } from "@hylimo/diagram-common";
import { SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model";
import { isLineProvider } from "../../features/layout/lineProvider";
import { SCanvasPoint } from "./sCanvasPoint";

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
     * Cached position on the line
     */
    position!: Point;
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
                    transform: {
                        translation: Point.ORIGIN
                    }
                };
            }
        });
        this.cachedProperty<Point>("position", () => {
            return LineEngine.DEFAULT.getPoint(this.pos, this.line);
        });
    }

    override get dependencies(): string[] {
        // maybe TODO
        return [];
    }
}

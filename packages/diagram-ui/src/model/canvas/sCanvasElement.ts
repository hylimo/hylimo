import { CanvasElement, Line, Point, TransformedLine } from "@hylimo/diagram-common";
import { SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model";
import { LineProvider } from "../../features/layout/lineProvider";
import { PositionProvider } from "../../features/layout/positionProvider";
import { SCanvasContent } from "./sCanvasContent";
import { SCanvasPoint } from "./sCanvasPoint";

/**
 * Anbimated fields for SCanvasElement
 */
const canvasElementAnimatedFields = new Set(["width", "height"]);

/**
 * Model for CanvasElement
 */
export class SCanvasElement
    extends SCanvasContent
    implements CanvasElement, PositionProvider, LineProvider, LinearAnimatable
{
    override type!: typeof CanvasElement.TYPE;
    /**
     * The width of the element
     */
    width!: number;
    /**
     * The height of the element
     */
    height!: number;
    readonly animatedFields = canvasElementAnimatedFields;
    /**
     * The id of the CanvasPoint which is used as start
     */
    pos!: string;
    /**
     * Resizable if present
     */
    resizable!: number[];
    /**
     * The outline of the CanvasElement
     */
    outline!: Line;
    /**
     * The provided line, cached
     */
    line!: TransformedLine;
    /**
     * Position of this CanvasElement
     */
    position!: Point;

    constructor() {
        super();

        this.cachedProperty<Point>("position", () => {
            const target = this.root.index.getById(this.pos) as SCanvasPoint;
            return target.position;
        });
        this.cachedProperty<TransformedLine>("line", () => {
            return {
                line: this.outline,
                transform: {
                    translation: this.position
                }
            };
        });
    }

    override get dependencies(): string[] {
        return [this.pos];
    }
}

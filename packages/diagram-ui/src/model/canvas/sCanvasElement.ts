import { CanvasElement, Line, Point, TransformedLine } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { LineProvider } from "../../features/layout/lineProvider";
import { PositionProvider } from "../../features/layout/positionProvider";
import { SLayoutedElement } from "../sLayoutedElement";
import { SCanvasContent } from "./sCanvasContent";
import { SCanvasPoint } from "./sCanvasPoint";
import { compose, translate, rotateDEG } from "transformation-matrix";

/**
 * Anbimated fields for SCanvasElement
 */
const canvasElementAnimatedFields = new Set(SLayoutedElement.defaultAnimatedFields);

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
    /**
     * The x offset
     */
    x!: number;
    /**
     * The y offset
     */
    y!: number;
    readonly animatedFields = canvasElementAnimatedFields;
    /**
     * The id of the CanvasPoint which is used as start
     */
    pos!: string;
    /**
     * The rotation in degrees
     */
    rotation!: number;
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
            const position = this.position;
            return {
                line: this.outline,
                transform: compose(
                    translate(position.x, position.y),
                    rotateDEG(this.rotation),
                    translate(this.x, this.y)
                )
            };
        });
    }

    override get dependencies(): string[] {
        return [this.pos];
    }
}

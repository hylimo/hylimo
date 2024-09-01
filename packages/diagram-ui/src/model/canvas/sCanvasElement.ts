import { CanvasElement, Line, Point, TransformedLine } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model.js";
import { LineProvider } from "../../features/layout/lineProvider.js";
import { PositionProvider } from "../../features/layout/positionProvider.js";
import { SLayoutedElement } from "../sLayoutedElement.js";
import { SCanvasContent } from "./sCanvasContent.js";
import { SCanvasPoint } from "./sCanvasPoint.js";
import { compose, rotateDEG, translate, Matrix } from "transformation-matrix";

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
    pos?: string;
    /**
     * The rotation in degrees
     */
    rotation!: number;
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
            if (this.pos != undefined) {
                const target = this.root.index.getById(this.pos) as SCanvasPoint;
                return target.position;
            } else {
                return Point.ORIGIN;
            }
        });
        this.cachedProperty<TransformedLine>("line", () => {
            return this.parent.layoutEngine.layoutLine(this);
        });
        this.cachedProperty<Matrix>("parentToLocalMatrix", () => {
            const position = this.position;
            return compose(translate(position.x, position.y), rotateDEG(this.rotation));
        });
        this.cachedProperty<Matrix>("localToParentMatrix", () => {
            const position = this.position;
            return compose(rotateDEG(-this.rotation), translate(-position.x, -position.y));
        });
    }

    override get dependencies(): string[] {
        if (this.pos != undefined) {
            return [this.pos];
        } else {
            return [];
        }
    }
}

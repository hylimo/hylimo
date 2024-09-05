import { CanvasElement, Line, Point, TransformedLine } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model.js";
import { LineProvider } from "../../features/layout/lineProvider.js";
import { PositionProvider } from "../../features/layout/positionProvider.js";
import { SCanvasContent } from "./sCanvasContent.js";

/**
 * Anbimated fields for SCanvasElement
 */
const canvasElementAnimatedFields = new Set(["width", "height", "dx", "dy", "rotation"]);

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
    dx!: number;
    /**
     * The y offset
     */
    dy!: number;
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
                return this.root.layoutEngine.layoutElement(this);
            } else {
                return Point.ORIGIN;
            }
        });
        this.cachedProperty<TransformedLine>("line", () => {
            return this.root.layoutEngine.layoutLine(this);
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

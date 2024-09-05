import { Canvas } from "@hylimo/diagram-common";
import { SChildElementImpl } from "sprotty";
import { SLayoutedElement } from "../sLayoutedElement.js";
import { PointVisibilityManager } from "./pointVisibilityManager.js";
import { LinearAnimatable } from "../../features/animation/model.js";

/**
 * Animated fields for SCanvas
 */
const canvasAnimatedFields = new Set(["dx", "dy"]);

/**
 * Canvas model element
 */
export class SCanvas extends SLayoutedElement implements Canvas, LinearAnimatable {
    override type!: typeof Canvas.TYPE;
    /**
     * The x offset applied to its coordinate system
     */
    dx!: number;
    /**
     * The y offset applied to its coordinate system
     */
    dy!: number;
    readonly animatedFields = canvasAnimatedFields;
    /**
     * Lookup of children by id
     */
    private childrenById?: Map<string, SChildElementImpl>;

    /**
     * Internal cached version of the PointVisibilityManager
     */
    private _pointVisibilityManager?: PointVisibilityManager;

    /**
     * Gets the PointVisibilityManager
     */
    get pointVisibilityManager(): PointVisibilityManager {
        if (!this._pointVisibilityManager) {
            this._pointVisibilityManager = new PointVisibilityManager(this);
        }
        return this._pointVisibilityManager;
    }

    constructor() {
        super();
    }
}

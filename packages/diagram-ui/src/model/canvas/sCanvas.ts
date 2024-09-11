import { Canvas } from "@hylimo/diagram-common";
import { SLayoutedElement } from "../sLayoutedElement.js";
import { PointVisibilityManager } from "./pointVisibilityManager.js";
import { LinearAnimatable } from "../../features/animation/model.js";
import { decomposeTSR } from "transformation-matrix";

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

    /**
     * The global rotation of the canvas
     * (used for UI elements which depend on global roation, e.g. cursor icons)
     */
    globalRotation!: number;

    constructor() {
        super();
        this.cachedProperty<number>("globalRotation", () => {
            const localToRoot = this.root.layoutEngine.localToAncestor(this.id, this.root.id);
            const { rotation } = decomposeTSR(localToRoot);
            return rotation.angle * (180 / Math.PI);
        });
    }
}

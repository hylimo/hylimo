import { Canvas, CanvasConnection, CanvasElement, CanvasLayoutEngine, CanvasPoint } from "@hylimo/diagram-common";
import { SChildElement } from "sprotty";
import { SLayoutedElement } from "../sLayoutedElement.js";
import { PointVisibilityManager } from "./pointVisibilityManager.js";
import { SCanvasPoint } from "./sCanvasPoint.js";
import { SCanvasConnection } from "./sCanvasConnection.js";
import { SCanvasElement } from "./sCanvasElement.js";

/**
 * Canvas model element
 */
export class SCanvas extends SLayoutedElement implements Canvas {
    override type!: typeof Canvas.TYPE;
    /**
     * CanvasConnectionlayoutEngine children can use
     */
    readonly layoutEngine!: CanvasLayoutEngine;
    /**
     * Lookup of children by id
     */
    private childrenById?: Map<string, SChildElement>;

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
        this.cachedProperty<CanvasLayoutEngine>("layoutEngine", () => new SCanvasLayoutEngine(this));
    }
}

/**
 * CanvasLayoutEngine implementation for SCanvas
 */
class SCanvasLayoutEngine extends CanvasLayoutEngine {
    /**
     * Creates a new SCanvasLayoutEngine based on the given canvas
     *
     * @param canvas the canvas to layout elements of
     */
    constructor(private readonly canvas: SCanvas) {
        super();
    }

    override getElement(id: string): CanvasPoint | CanvasElement | CanvasConnection {
        return this.canvas.index.getById(id) as SCanvasPoint | SCanvasElement | SCanvasConnection;
    }
}

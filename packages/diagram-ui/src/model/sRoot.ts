import type { EditSpecification, FontData, TransactionState } from "@hylimo/diagram-common";
import type { SModelElementImpl } from "sprotty";
import { isSelectable, ModelIndexImpl, ViewportRootElementImpl } from "sprotty";
import { SCanvasLayoutEngine } from "./canvas/sCanvasLayoutEngine.js";
import type { Matrix } from "transformation-matrix";
import { compose, translate, scale, applyToPoint } from "transformation-matrix";
import type { Bounds } from "sprotty-protocol";
import type { Bounds as HylimoBounds } from "@hylimo/diagram-common";
import type { CanvasLike } from "./canvas/canvasLike.js";
import { PointVisibilityManager } from "./canvas/pointVisibilityManager.js";
import type { CreateConnectionHoverData } from "../features/create-connection/createConnectionHoverData.js";

/**
 * Root element.
 */
export class SRoot extends ViewportRootElementImpl implements CanvasLike {
    /**
     * Defined font families
     */
    fonts!: FontData[];

    /**
     * The bounds of the whole diagram, as defined by hylimo internally, not by sprotty
     */
    rootBounds!: HylimoBounds;

    /**
     * The revision number increasing with each change.
     * Required for caching of computed properties
     */
    changeRevision = 0;
    /**
     * The last sequence number of a received incremental update.
     */
    sequenceNumber = 0;

    /**
     * The layout engine for the canvases
     */
    private currentLayoutEngine: SCanvasLayoutEngine | undefined;

    /**
     * The version of the layout engine
     */
    private layoutEngineVersion = -1;

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
     * The edit specification for this element
     */
    edits!: EditSpecification;

    /**
     * Is this a preview element?
     */
    preview!: boolean;

    /**
     * The global rotation of the canvas, always 0 for the root element
     */
    globalRotation = 0;

    /**
     * If defined, can provide information where a potential connection would be created
     */
    createConnectionHoverData?: CreateConnectionHoverData;

    /**
     * If this was rendered based on a transaction, the id and sequence number of the transaction
     */
    transactionState?: TransactionState;

    /**
     * The amount of time this model has been updated incrementally
     * Used to disable animation during transactions with many full updates
     */
    incrementalUpdateCount = 0;

    constructor(index = new ModelIndexImpl()) {
        super(index);
    }

    /**
     * Gets the current layout engine
     */
    get layoutEngine(): SCanvasLayoutEngine {
        if (this.currentLayoutEngine == undefined || this.layoutEngineVersion != this.changeRevision) {
            this.currentLayoutEngine = new SCanvasLayoutEngine(this);
            this.layoutEngineVersion = this.changeRevision;
        }
        return this.currentLayoutEngine;
    }

    override get bounds(): Bounds {
        return {
            x: this.rootBounds.position.x,
            y: this.rootBounds.position.y,
            width: this.rootBounds.size.width,
            height: this.rootBounds.size.height
        };
    }

    /**
     * Gets all elements which are selected.
     */
    get selectedElements(): SModelElementImpl[] {
        return [...this.index.all().filter((child) => isSelectable(child) && child.selected)];
    }

    /**
     * Gets a transformation matrix which converts from the global coordinate system
     * to the coordinate system with the scroll and zoom applied.
     *
     * @returns the transformation matrix
     */
    getMouseTransformationMatrix(): Matrix {
        const rect = this.canvasBounds;
        return compose(translate(this.scroll.x, this.scroll.y), scale(1 / this.zoom), translate(-rect.x, -rect.y));
    }

    /**
     * Gets the position of the mouse event in the coordinate system of the canvas.
     *
     * @param event the mouse event
     * @returns the position in the canvas coordinate system
     */
    getPosition(event: MouseEvent): { x: number; y: number } {
        const matrix = this.getMouseTransformationMatrix();
        return applyToPoint(matrix, { x: event.pageX, y: event.pageY });
    }
}

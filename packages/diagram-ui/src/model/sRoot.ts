import { EditSpecification, FontData, convertFontsToCssStyle } from "@hylimo/diagram-common";
import { isSelectable, ModelIndexImpl, SModelElementImpl, ViewportRootElementImpl } from "sprotty";
import { SCanvasLayoutEngine } from "./canvas/sCanvasLayoutEngine.js";
import { Matrix, compose, translate, scale } from "transformation-matrix";
import { Bounds } from "sprotty-protocol";
import { Bounds as HylimoBounds } from "@hylimo/diagram-common";
import { CanvasLike } from "./canvas/canvasLike.js";
import { PointVisibilityManager } from "./canvas/pointVisibilityManager.js";
import { LineProviderHoverDataProvider } from "../features/line-provider-hover/lineProviderHoverData.js";

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
     * The global rotation of the canvas, always 0 for the root element
     */
    globalRotation = 0;

    /**
     * If defined, can provide information on how the user hovers over a line provider
     */
    lineProviderHoverDataProvider?: LineProviderHoverDataProvider;

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
     * Genrates the style string based on the fonts
     *
     * @param baseDiv the id of the base div
     * @returns the generated style string
     */
    generateStyle(baseDiv: string): string {
        const staticStyles = `
            #${baseDiv}.sprotty svg {
                --diagram-zoom: ${this.zoom};
                --diagram-zoom-normalized: ${this.zoom / Math.pow(2, Math.round(Math.log2(this.zoom) / 2) * 2)};
                --diagram-scroll-x: ${this.scroll.x}px;
                --diagram-scroll-y: ${this.scroll.y}px;
            }
        `;
        return convertFontsToCssStyle(this.fonts) + staticStyles;
    }
}

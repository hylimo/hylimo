import { EditSpecification, FontData, convertFontsToCssStyle } from "@hylimo/diagram-common";
import { ModelIndexImpl, ViewportRootElementImpl } from "sprotty";
import { SCanvasAxisAlignedSegment } from "./canvas/sCanvasAxisAlignedSegment.js";
import { SCanvasLayoutEngine } from "./canvas/sCanvasLayoutEngine.js";
import { Matrix, compose, translate, scale } from "transformation-matrix";
import { Bounds } from "sprotty-protocol";
import { Bounds as HylimoBounds } from "@hylimo/diagram-common";
import { CanvasLike } from "./canvas/canvasLike.js";
import { PointVisibilityManager } from "./canvas/pointVisibilityManager.js";

/**
 * Root element.
 */
export class SRoot extends ViewportRootElementImpl implements CanvasLike {
    /**
     * The default point size
     */
    static readonly POINT_SIZE = 16;

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
            background:
            conic-gradient(from 90deg at 1px 1px, var(--diagram-background) 90deg, var(--diagram-grid) 0) 
            calc(var(--diagram-scroll-x) * -1 * var(--diagram-zoom))
            calc(var(--diagram-scroll-y) * -1 * var(--diagram-zoom)) /
            calc(100px * var(--diagram-zoom-normalized)) calc(100px * var(--diagram-zoom-normalized));

            text {
                white-space: pre;
                user-select: none;
            }
            
            .canvas-element,.marker {
                pointer-events: visible;
            }
    
            .selected-rect {
                fill: var(--diagram-layout-color-overlay);
                stroke: var(--diagram-layout-color-selected);
                stroke-width: calc(5px / var(--diagram-zoom));
                stroke-dasharray: calc(16px / var(--diagram-zoom));
            }
            
            .canvas-point {
                stroke-linecap: round;
                stroke-width: calc(${SRoot.POINT_SIZE}px / var(--diagram-zoom));
                stroke: var(--diagram-layout-color);
            }
            
            .canvas-point.selected {
                stroke: var(--diagram-layout-color-selected);
            }
            
            .canvas-dependency-line {
                stroke: var(--diagram-layout-color);
                stroke-width: calc(2px / var(--diagram-zoom));
                stroke-dasharray: calc(16px / var(--diagram-zoom));
                fill: none;
                pointer-events: none;
            }
            
            .bezier-handle-line {
                stroke: var(--diagram-layout-color);
                stroke-width: calc(4px / var(--diagram-zoom));
                fill: none;
                pointer-events: none;
            }
            
            .select-canvas-connection {
                stroke-width: calc(12px / var(--diagram-zoom));
                fill: none;
                stroke: transparent;
                pointer-events: visibleStroke;
            }

            .canvas-rotate-icon>path {
                fill: var(--diagram-layout-color);
            }

            .canvas-rotate-icon>rect {
                fill: transparent;
                cursor: pointer;
            }

            .resize {
                stroke-width: calc(12px / var(--diagram-zoom));
                stroke: transparent;
            }

            .resize-corner {
                stroke-linecap: square;
            }

            .resize-cursor-0, .resize-cursor-4 {
                cursor: nwse-resize;
            }

            .resize-cursor-1, .resize-cursor-5 {
                cursor: ns-resize;
            }

            .resize-cursor-2, .resize-cursor-6 {
                cursor: nesw-resize;
            }

            .resize-cursor-3, .resize-cursor-7 {
                cursor: ew-resize;
            }

            .${SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS_X} {
                cursor: ns-resize;
            }
            .${SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS_Y} {
                cursor: ew-resize;
            }
        }
        `;
        return convertFontsToCssStyle(this.fonts) + staticStyles;
    }
}

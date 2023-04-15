import { FontFamilyConfig, convertFontsToCssStyle } from "@hylimo/diagram-common";
import { ModelIndexImpl, ViewportRootElement } from "sprotty";
import { SCanvasAxisAlignedSegment } from "./canvas/sCanvasAxisAlignedSegment";

/**
 * Root element.
 */
export class SRoot extends ViewportRootElement {
    /**
     * The default point size
     */
    static readonly POINT_SIZE = 16;

    /**
     * Defined font families
     */
    fonts!: FontFamilyConfig[];

    /**
     * The revision number increasing with each change.
     * Required for caching of computed properties
     */
    changeRevision = 0;
    /**
     * The last sequence number of a received incremental update.
     */
    sequenceNumber = 0;

    constructor(index = new ModelIndexImpl()) {
        super(index);
    }

    /**
     * Genrates the style string based on the fonts
     *
     * @returns the generated style string
     */
    generateStyle(): string {
        const staticStyles = `
        text {
            white-space: pre;
        }
        
        .canvas-element {
            pointer-events: visible;
        }
        
        .sprotty svg {
            --diagram-zoom: ${this.zoom};
            --diagram-zoom-normalized: ${this.zoom / Math.pow(2, Math.round(Math.log2(this.zoom) / 2) * 2)};
            --diagram-scroll-x: ${this.scroll.x}px;
            --diagram-scroll-y: ${this.scroll.y}px;
            background:
              conic-gradient(from 90deg at 1px 1px, var(--diagram-background) 90deg, var(--diagram-grid) 0) 
              calc(var(--diagram-scroll-x) * -1 * var(--diagram-zoom))
              calc(var(--diagram-scroll-y) * -1 * var(--diagram-zoom)) /
              calc(100px * var(--diagram-zoom-normalized)) calc(100px * var(--diagram-zoom-normalized));
        }

        .sprotty svg text {
            user-select: none;
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

        .canvas-rotate-icon {
            fill: var(--diagram-layout-color);
            pointer-events: bounding-box;
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
        `;
        return convertFontsToCssStyle(this.fonts) + staticStyles;
    }
}

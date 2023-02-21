import { FontConfig, FontFamilyConfig } from "@hylimo/diagram-common";
import { ModelIndexImpl, ViewportRootElement } from "sprotty";

/**
 * Root element.
 */
export class SRoot extends ViewportRootElement {
    /**
     * Defined font families
     */
    fonts!: FontFamilyConfig[];

    /**
     * The revision number increasing with each change.
     * Required for caching of computed properties
     */
    changeRevision = 0;

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
            stroke-width: calc(16px / var(--diagram-zoom));
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

        .resize-edge, .resize-corner {
            stroke-width: calc(12px / var(--diagram-zoom));
            stroke: transparent;
        }

        .resize-corner {
            stroke-linecap: square;
        }

        .resize-left, .resize-right {
            cursor: ew-resize;
        }

        .resize-top, .resize-bottom {
            cursor: ns-resize;
        }

        .resize-top-left, .resize-bottom-right {
            cursor: nesw-resize;
        }

        .resize-top-right, .resize-bottom-left {
            cursor: nwse-resize;
        }
        `;
        return (
            this.fonts
                .flatMap((font) => [
                    this.generateFontFace(font.fontFamily, font.normal, false, false),
                    this.generateFontFace(font.fontFamily, font.italic, true, false),
                    this.generateFontFace(font.fontFamily, font.bold, false, true),
                    this.generateFontFace(font.fontFamily, font.boldItalic, true, true)
                ])
                .join("\n") + staticStyles
        );
    }

    /**
     * Transforms a FontConfig to a font-face rule string
     *
     * @param fontFamily the name of the font
     * @param config config for the font to transform
     * @param italic if true, it is italic, otherwise normal
     * @param bold if true, it is bold, otherwise normal
     * @returns the font-face string
     */
    private generateFontFace(fontFamily: string, config: FontConfig, italic: boolean, bold: boolean): string {
        const url = config.name ? `${config.url}#${config.name}` : config.url;
        const variationSettings = config.variationSettings
            ? this.generateVariationSettings(config.variationSettings)
            : "";
        return `@font-face {
            font-family: ${fontFamily};
            src: url(${url});
            font-weight: ${bold ? "bold" : "normal"};
            font-style: ${italic ? "italic" : "normal"};
            ${variationSettings}
        }
        `;
    }

    /**
     * Transforms a varation settings object or string to a string
     *
     * @param settings the font variation settings
     * @returns the variation settings string
     */
    private generateVariationSettings(settings: any): string {
        if (typeof settings === "string") {
            return settings;
        } else {
            return Object.keys(settings)
                .map((key) => `"${key}" ${settings[key]}`)
                .join(", ");
        }
    }
}

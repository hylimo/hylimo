import type { IView, IViewArgs, RenderingContext, ViewerOptions } from "sprotty";
import { svg } from "sprotty";
import { injectable, inject } from "inversify";
import type { Attrs, VNode } from "snabbdom";
import { thunk } from "snabbdom";
import type { SRoot } from "../model/sRoot.js";
import { TYPES } from "../features/types.js";
import type { CursorProvider } from "../features/cursor/cursor.js";
import type { BoxSelectProvider } from "../features/select/boxSelectProvider.js";
import { convertFontsToCssStyle } from "@hylimo/diagram-common";
import type { KeyState } from "../features/key-state/keyState.js";
import { CanvasLikeView } from "./canvas/canvasLikeView.js";
import type { ConfigManager } from "../features/config/configManager.js";

/**
 * IView that is the parent which handles
 */
@injectable()
export class RootView extends CanvasLikeView implements IView {
    /**
     * ID of the arrow marker
     */
    static readonly ARROW_MARKER_ID = "arrow";

    /**
     * ID of the background pattern
     */
    get backgroundPatternId(): string {
        return this.options.baseDiv + "-background-pattern";
    }

    /**
     * Viewer options, used to get id of viewer element
     */
    @inject(TYPES.ViewerOptions) protected options!: ViewerOptions;

    /**
     * MoveCursorProvider used to get the cursor to use while moving
     */
    @inject(TYPES.MoveCursorProvider) protected moveCursorProvider!: CursorProvider;

    /**
     * BoxSelectProvider used to get the box selection box
     */
    @inject(TYPES.BoxSelectProvider) protected boxSelectProvider!: BoxSelectProvider;

    /**
     * KeyState used to check if space is pressed
     */
    @inject(TYPES.KeyState) protected keyState!: KeyState;

    /**
     * ConfigManager used to get the editor config
     */
    @inject(TYPES.ConfigManager) protected configManager!: ConfigManager;

    render(model: Readonly<SRoot>, context: RenderingContext, _args?: IViewArgs | undefined): VNode {
        if (context.targetKind == "hidden") {
            return svg("svg.hylimo", null);
        }
        const transform = `scale(${model.zoom}) translate(${-model.scroll.x},${-model.scroll.y})`;
        return svg(
            "svg.hylimo",
            {
                attrs: this.generateAttributes(model, context),
                class: this.computeRootClass()
            },
            this.renderStyles(model),
            this.renderDefs(model),
            this.renderBackground(model),
            svg(
                "g.sprotty-root",
                {
                    attrs: {
                        transform
                    }
                },
                ...context.renderChildren(model, undefined),
                ...this.renderSnapLines(model),
                this.renderSelectBox()
            )
        );
    }

    /**
     * Renders the style element for the fonts
     *
     * @param model the SRoot model
     * @returns the VNode for the style element
     */
    private renderStyles(model: Readonly<SRoot>): VNode {
        return thunk(
            "style",
            () => svg("style", null, convertFontsToCssStyle(model.fonts)),
            model.fonts.map((font) => font.fontFamily).sort()
        );
    }

    /**
     * Renders the background of the diagram
     *
     * @param model the SRoot model
     * @returns the VNode for the background or undefined if in preview mode
     */
    private renderBackground(model: Readonly<SRoot>): VNode | undefined {
        if (model.preview || this.configManager.config?.gridEnabled != true) {
            return undefined;
        }
        return svg("rect", {
            attrs: {
                x: 0,
                y: 0,
                width: "100%",
                height: "100%",
                fill: `url(#${this.backgroundPatternId})`
            }
        });
    }

    /**
     * Computes the root classes
     *
     * @returns the root classes
     */
    private computeRootClass(): Record<string, boolean> {
        const spacePressedMoveCursor = this.keyState.isSpacePressed ? "cursor-grab" : undefined;
        const cursor =
            this.moveCursorProvider.moveCursor ?? spacePressedMoveCursor ?? this.moveCursorProvider.toolCursor;
        if (cursor != undefined) {
            return {
                [cursor]: true
            };
        } else {
            return {};
        }
    }

    /**
     * Generates the attributes for the SVG element
     * If the targetKind is not "main", the viewBox attribute is set to the canvas bounds
     *
     * @param model the SRoot model
     * @param context the rendering context
     * @returns the attributes for the SVG element
     */
    private generateAttributes(model: Readonly<SRoot>, context: RenderingContext): Attrs {
        const attrs: Attrs = {};
        if (context.targetKind != "main") {
            const bounds = model.rootBounds;
            attrs["viewBox"] = `${bounds.position.x} ${bounds.position.y} ${bounds.size.width} ${bounds.size.height}`;
        }
        return attrs;
    }

    /**
     * Renders the box select select box, if available
     *
     * @returns the VNode for the select box
     */
    private renderSelectBox(): VNode | undefined {
        const box = this.boxSelectProvider.box;
        if (box == undefined) {
            return undefined;
        }
        return svg("rect.select-box", {
            attrs: {
                x: box.position.x,
                y: box.position.y,
                width: box.size.width,
                height: box.size.height
            }
        });
    }

    /**
     * Renders the defs section of the SVG
     *
     * @param model the SRoot model
     * @returns the VNode for the defs section
     */
    private renderDefs(model: Readonly<SRoot>): VNode {
        return svg(
            "defs",
            null,
            this.renderArrowMarker(RootView.ARROW_MARKER_ID, "arrow-marker"),
            this.renderArrowMarker(RootView.SNAP_ARROW_MARKER_ID, "snap-arrow-marker"),
            this.renderBackgroundPattern(model)
        );
    }

    /**
     * Renders the background pattern
     *
     * @param model the SRoot model
     * @returns the VNode for the background pattern or undefined if in preview mode
     */
    private renderBackgroundPattern(model: Readonly<SRoot>): VNode | undefined {
        if (model.preview) {
            return undefined;
        }
        const zoomNormalized = model.zoom / Math.pow(3, Math.floor(Math.log(model.zoom) / Math.log(3)));
        const gridSize = 25 * zoomNormalized;
        return svg(
            "pattern",
            {
                attrs: {
                    id: this.backgroundPatternId,
                    width: gridSize,
                    height: gridSize,
                    x: (-model.scroll.x * model.zoom) % gridSize,
                    y: (-model.scroll.y * model.zoom) % gridSize,
                    patternUnits: "userSpaceOnUse"
                }
            },
            svg("circle.background-pattern", {
                attrs: {
                    cx: gridSize / 2,
                    cy: gridSize / 2,
                    r: 1
                }
            })
        );
    }

    /**
     * Renders the arrow marker
     *
     * @param id the id of the marker
     * @param pathClass the class of the path
     * @returns the VNode for the arrow marker
     */
    private renderArrowMarker(id: string, pathClass: string): VNode {
        return svg(
            "marker",
            {
                attrs: {
                    id,
                    viewBox: "0 0 10 10",
                    refX: 9,
                    refY: 5,
                    markerWidth: 6,
                    markerHeight: 6,
                    markerUnits: "strokeWidth",
                    orient: "auto-start-reverse"
                }
            },
            svg("path", {
                attrs: {
                    d: "M 0 0 L 10 5 L 0 10 z"
                },
                class: {
                    [pathClass]: true
                }
            })
        );
    }
}

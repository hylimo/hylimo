import { IView, IViewArgs, RenderingContext, svg, ViewerOptions } from "sprotty";
import { injectable, inject } from "inversify";
import { Attrs, VNode } from "snabbdom";
import { SRoot } from "../model/sRoot.js";
import { TYPES } from "../features/types.js";
import { MoveCursorProvider } from "../features/move/cursor.js";

/**
 * IView that is the parent which handles
 */
@injectable()
export class SRootView implements IView {
    /**
     * Viewer options, used to get id of viewer element
     */
    @inject(TYPES.ViewerOptions) protected options!: ViewerOptions;

    /**
     * MoveCursorProvider used to get the cursor to use while moving
     */
    @inject(TYPES.MoveCursorProvider) protected moveCursorProvider!: MoveCursorProvider;

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
            svg("style", null, model.generateStyle(this.options.baseDiv)),
            this.renderDefs(),
            svg(
                "g.sprotty-root",
                {
                    attrs: {
                        transform
                    }
                },
                ...context.renderChildren(model, undefined)
            )
        );
    }

    /**
     * Computes the root classes
     *
     * @returns the root classes
     */
    private computeRootClass(): Record<string, boolean> {
        const moveCursor = this.moveCursorProvider.moveCursor;
        if (moveCursor != undefined) {
            return {
                [moveCursor]: true
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
     * Renders the defs section of the SVG
     *
     * @returns the VNode for the defs section
     */
    private renderDefs(): VNode {
        return svg(
            "defs",
            null,
            svg(
                "marker",
                {
                    attrs: {
                        id: "arrow",
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
                        d: "M 0 0 L 10 5 L 0 10 z",
                        fill: "var(--diagram-layout-color)"
                    }
                })
            )
        );
    }
}

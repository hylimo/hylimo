import { inject, injectable } from "inversify";
import type { VNode, Attrs } from "snabbdom";
import type { IViewArgs, RenderingContext, IView, ViewerOptions } from "sprotty";
import { svg, TYPES } from "sprotty";
import type { SPath } from "../model/sPath.js";
import { extractShapeStyleAttributes } from "@hylimo/diagram-render-svg";

/**
 * IView that represents an svg path.
 *
 * A plain path renders as a bare `<path>`. A path that carries a `decoration` or children (a
 * parametric shape) renders as a `<g>` wrapping the filled + stroked outline, the stroke-only
 * decoration on top, and the shape's content.
 *
 * A path with a `clip` is wrapped in a clipped `<g>` that carries the translation instead: `clip-path`
 * resolves against the coordinate system the clipped element sets up for its children, so a transform
 * left on the element itself would offset clip and geometry against each other by its position.
 */
@injectable()
export class PathView implements IView {
    /**
     * Viewer options, which provide the id of the container this diagram is rendered into. An element
     * id is only unique within its diagram, while inline svg shares the id space of the whole
     * document, so a `url(#…)` reference has to be qualified by the diagram it belongs to — the same
     * way the background pattern is.
     */
    @inject(TYPES.ViewerOptions) protected options!: ViewerOptions;

    render(model: Readonly<SPath>, context: RenderingContext, _args?: IViewArgs): VNode | undefined {
        const clipped = model.clip != undefined;
        const transform = clipped ? undefined : `translate(${model.x}, ${model.y})`;
        const attrs: Attrs = {
            ...extractShapeStyleAttributes(model),
            d: model.path,
            ...(transform != undefined ? { transform } : {})
        };
        const outline = svg("path", { attrs });
        const hasChildren = model.children.length > 0;
        if (model.decoration == undefined && !hasChildren && !clipped) {
            return outline;
        }
        const decoration =
            model.decoration != undefined
                ? svg("path", {
                      attrs: {
                          ...extractShapeStyleAttributes(model),
                          fill: "none",
                          d: model.decoration,
                          ...(transform != undefined ? { transform } : {})
                      }
                  })
                : undefined;
        const painted = [outline, ...(decoration ? [decoration] : [])];
        if (clipped) {
            const clipId = `${this.options.baseDiv}-${model.id}-clip`;
            return svg(
                "g",
                {
                    attrs: {
                        transform: `translate(${model.x}, ${model.y})`,
                        "clip-path": `url(#${clipId})`
                    }
                },
                svg("clipPath", { attrs: { id: clipId } }, svg("path", { attrs: { d: model.clip! } })),
                ...painted,
                ...context.renderChildren(model)
            );
        }
        return svg("g", null, ...painted, ...context.renderChildren(model));
    }
}

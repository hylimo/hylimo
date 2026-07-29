import { injectable } from "inversify";
import type { VNode, Attrs } from "snabbdom";
import type { IViewArgs, RenderingContext, IView } from "sprotty";
import { svg } from "sprotty";
import type { SPath } from "../model/sPath.js";
import { extractShapeStyleAttributes } from "@hylimo/diagram-render-svg";

/**
 * IView that represents an svg path.
 *
 * A plain path renders as a bare `<path>`. A path that carries a `decoration` or children (a
 * parametric shape) renders as a `<g>` wrapping the filled + stroked outline, the stroke-only
 * decoration on top, and the shape's content.
 */
@injectable()
export class PathView implements IView {
    render(model: Readonly<SPath>, context: RenderingContext, _args?: IViewArgs): VNode | undefined {
        const attrs: Attrs = {
            ...extractShapeStyleAttributes(model),
            d: model.path,
            transform: `translate(${model.x}, ${model.y})`
        };
        const outline = svg("path", { attrs });
        const hasChildren = model.children.length > 0;
        if (model.decoration == undefined && !hasChildren) {
            return outline;
        }
        const decoration =
            model.decoration != undefined
                ? svg("path", {
                      attrs: {
                          ...extractShapeStyleAttributes(model),
                          fill: "none",
                          d: model.decoration,
                          transform: `translate(${model.x}, ${model.y})`
                      }
                  })
                : undefined;
        return svg("g", null, outline, ...(decoration ? [decoration] : []), ...context.renderChildren(model));
    }
}

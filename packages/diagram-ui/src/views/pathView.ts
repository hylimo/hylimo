import { injectable } from "inversify";
import { VNode, Attrs } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SPath } from "../model/sPath";
import { extractShapeAttributes } from "@hylimo/diagram-render";

/**
 * IView that represents an svg path
 */
@injectable()
export class PathView implements IView {
    render(model: Readonly<SPath>, _context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        const attrs: Attrs = {
            ...extractShapeAttributes(model),
            "stroke-linejoin": model.lineJoin,
            "stroke-linecap": model.lineCap,
            "stroke-miterlimit": model.miterLimit,
            d: model.path,
            transform: `translate(${model.x}, ${model.y})`
        };
        return svg("path", {
            attrs
        });
    }
}

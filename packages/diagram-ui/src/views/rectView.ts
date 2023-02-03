import { injectable } from "inversify";
import { VNode, Attrs } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SRect } from "../model/sRect";
import { extractShapeAttributes } from "./attributeHelpers";

/**
 * IView that represents an svg rect
 */
@injectable()
export class RectView implements IView {
    render(model: Readonly<SRect>, context: RenderingContext, args?: IViewArgs | undefined): VNode | undefined {
        const attrs: Attrs = {
            ...extractShapeAttributes(model)
        };
        if (model.cornerRadius) {
            attrs.rx = Math.max(0, model.cornerRadius - (model.strokeWidth ? model.strokeWidth / 2 : 0));
        }
        return svg(
            "g",
            null,
            svg("rect", {
                attrs
            }),
            ...context.renderChildren(model)
        );
    }
}

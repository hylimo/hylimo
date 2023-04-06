import { injectable } from "inversify";
import { VNode, Attrs } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SRect } from "../model/sRect";
import { extractOutlinedShapeAttributes } from "@hylimo/diagram-render-svg";

/**
 * IView that represents an svg rect
 */
@injectable()
export class RectView implements IView {
    render(model: Readonly<SRect>, context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        const attrs: Attrs = {
            ...extractOutlinedShapeAttributes(model)
        };
        if (model.cornerRadius) {
            const strokeWidth = model.stroke?.width;
            attrs.rx = Math.max(0, model.cornerRadius - (strokeWidth ? strokeWidth / 2 : 0));
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

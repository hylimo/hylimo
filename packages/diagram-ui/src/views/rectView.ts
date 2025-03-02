import { injectable } from "inversify";
import type { VNode, Attrs } from "snabbdom";
import type { IViewArgs, RenderingContext, IView } from "sprotty";
import { svg } from "sprotty";
import type { SRect } from "../model/sRect.js";
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

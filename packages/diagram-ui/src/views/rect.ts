import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SRect } from "../model/rect";
import { extractShapeAttributes } from "./attributeHelpers";

/**
 * IView that represents an svg rect
 */
@injectable()
export class RectView implements IView {
    render(model: Readonly<SRect>, context: RenderingContext, args?: IViewArgs | undefined): VNode | undefined {
        return svg(
            "g",
            null,
            svg("rect", {
                attrs: {
                    ...extractShapeAttributes(model)
                }
            }),
            ...context.renderChildren(model)
        );
    }
}

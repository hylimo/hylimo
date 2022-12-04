import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, SChildElement, IView, svg } from "sprotty";
import { extractShapeAttributes } from "./attributeHelpers";

@injectable()
export class RectView implements IView {
    render(
        model: Readonly<SChildElement>,
        context: RenderingContext,
        args?: IViewArgs | undefined
    ): VNode | undefined {
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

import { injectable } from "inversify";
import { VNode, Attrs } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SEllipse } from "../model/sEllipse";
import { extractShapeStyleAttributes } from "@hylimo/diagram-render-svg";

/**
 * IView that represents an svg ellipse
 */
@injectable()
export class EllipseView implements IView {
    render(model: Readonly<SEllipse>, context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        const strokeWidth = model.strokeWidth ?? 0;
        const attrs: Attrs = {
            ...extractShapeStyleAttributes(model),
            cx: model.x + model.width / 2,
            cy: model.y + model.height / 2,
            rx: (model.width - strokeWidth) / 2,
            ry: (model.height - strokeWidth) / 2
        };
        return svg(
            "g",
            null,
            svg("ellipse", {
                attrs
            }),
            ...context.renderChildren(model)
        );
    }
}

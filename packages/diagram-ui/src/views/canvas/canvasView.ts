import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, RenderingContext, svg } from "sprotty";
import { SCanvas } from "../../model/canvas/sCanvas";

/**
 * IView that represents a canvas
 */
@injectable()
export class CanvasView implements IView {
    render(model: Readonly<SCanvas>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        return svg("g", null, ...context.renderChildren(model));
    }
}

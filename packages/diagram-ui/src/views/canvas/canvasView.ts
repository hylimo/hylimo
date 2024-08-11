import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SCanvas } from "../../model/canvas/sCanvas.js";

/**
 * IView that represents a canvas
 */
@injectable()
export class CanvasView implements IView {
    render(model: Readonly<SCanvas>, context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        return svg("g", null, ...context.renderChildren(model));
    }
}

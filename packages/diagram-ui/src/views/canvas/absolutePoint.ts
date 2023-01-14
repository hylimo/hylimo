import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { RenderingContext } from "sprotty";
import { SAbsolutePoint } from "../../model/canvas/absolutePoint";
import { CanvasPointView } from "./canvasPoint";

/**
 * IView that represents an AbsolutePoint
 */
@injectable()
export class AbsolutePointView extends CanvasPointView<SAbsolutePoint> {
    render(model: Readonly<SAbsolutePoint>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        return this.renderPoint(model, context);
    }
}

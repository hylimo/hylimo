import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext } from "sprotty";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint.js";
import { CanvasPointView } from "./canvasPointView.js";

/**
 * IView that represents an AbsolutePoint
 */
@injectable()
export class AbsolutePointView extends CanvasPointView<SAbsolutePoint> {
    renderInternal(
        model: Readonly<SAbsolutePoint>,
        context: RenderingContext,
        _args?: IViewArgs | undefined
    ): VNode | undefined {
        return this.renderPoint(model, context, model.position);
    }
}

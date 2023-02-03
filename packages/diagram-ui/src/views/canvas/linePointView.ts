import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { RenderingContext } from "sprotty";
import { SLinePoint } from "../../model/canvas/sLinePoint";
import { CanvasPointView } from "./canvasPointView";

/**
 * IView that represents an LinePoint
 */
@injectable()
export class LinePointView extends CanvasPointView<SLinePoint> {
    renderInternal(model: Readonly<SLinePoint>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        return this.renderPoint(model, context, model.position);
    }
}

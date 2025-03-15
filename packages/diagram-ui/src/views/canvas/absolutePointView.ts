import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import { svg } from "sprotty";
import type { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint.js";
import { CanvasPointView } from "./canvasPointView.js";

/**
 * IView that represents an AbsolutePoint
 */
@injectable()
export class AbsolutePointView extends CanvasPointView<SAbsolutePoint> {
    renderInternal(model: Readonly<SAbsolutePoint>): VNode | undefined {
        return svg("g", null, ...this.renderPoint(model, model.position));
    }
}

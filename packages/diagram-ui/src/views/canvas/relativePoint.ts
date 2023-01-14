import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { RenderingContext } from "sprotty";
import { SRelativePoint } from "../../model/canvas/relativePoint";
import { CanvasPointView } from "./canvasPoint";

/**
 * IView that represents an RelativePoint
 */
@injectable()
export class RelativePointView extends CanvasPointView<SRelativePoint> {
    render(model: Readonly<SRelativePoint>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        return this.renderPoint(model, context);
    }
}

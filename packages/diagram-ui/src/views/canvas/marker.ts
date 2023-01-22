import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, RenderingContext } from "sprotty";
import { SMarker } from "../../model/canvas/marker";

/**
 * IView that represents a Marker
 */
@injectable()
export class MarkerView implements IView {
    render(model: Readonly<SMarker>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        return context.renderChildren(model)[0];
    }
}

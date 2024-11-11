import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SMarker } from "../../model/canvas/sMarker.js";

/**
 * IView that represents a Marker
 */
@injectable()
export class MarkerView implements IView {
    render(model: Readonly<SMarker>, context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        return svg(
            "g",
            {
                class: {
                    marker: true
                }
            },
            ...context.renderChildren(model)
        );
    }
}

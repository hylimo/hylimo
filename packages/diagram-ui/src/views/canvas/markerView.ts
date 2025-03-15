import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import type { IView, IViewArgs, RenderingContext } from "sprotty";
import { svg } from "sprotty";
import type { SMarker } from "../../model/canvas/sMarker.js";

/**
 * IView that represents a Marker
 */
@injectable()
export class MarkerView implements IView {
    render(model: Readonly<SMarker>, context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        return svg(
            "g.marker",
            {
                attrs: {
                    "pointer-events": "visible"
                }
            },
            ...context.renderChildren(model)
        );
    }
}

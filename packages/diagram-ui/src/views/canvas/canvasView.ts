import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import type { IView, IViewArgs, RenderingContext } from "sprotty";
import { svg } from "sprotty";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import { CanvasLikeView } from "./canvasLikeView.js";

/**
 * IView that represents a canvas
 */
@injectable()
export class CanvasView extends CanvasLikeView implements IView {
    render(model: Readonly<SCanvas>, context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        return svg(
            "g",
            {
                attrs: {
                    "pointer-events": "auto",
                    transform: `translate(${model.dx}, ${model.dy})`
                }
            },
            ...context.renderChildren(model),
            ...this.renderSnapLines(model)
        );
    }
}

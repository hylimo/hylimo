import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { RenderingContext, svg } from "sprotty";
import { SRelativePoint } from "../../model/canvas/sRelativePoint";
import { CanvasPointView } from "./canvasPointView";

/**
 * IView that represents an RelativePoint
 */
@injectable()
export class RelativePointView extends CanvasPointView<SRelativePoint> {
    renderInternal(
        model: Readonly<SRelativePoint>,
        context: RenderingContext,
        args?: {} | undefined
    ): VNode | undefined {
        const position = model.position;
        return svg(
            "g",
            null,
            svg("polyline", {
                attrs: {
                    points: `${position.target.x},${position.target.y} ${position.target.x},${position.y} ${position.x},${position.y}`
                },
                class: {
                    "canvas-dependency-line": true
                }
            }),
            this.renderPoint(model, context, position)
        );
    }
}

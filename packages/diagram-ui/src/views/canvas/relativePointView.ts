import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, svg } from "sprotty";
import { SRelativePoint } from "../../model/canvas/sRelativePoint";
import { CanvasPointView } from "./canvasPointView";

/**
 * IView that represents an RelativePoint
 */
@injectable()
export class RelativePointView extends CanvasPointView<SRelativePoint> {
    override renderInternal(
        model: Readonly<SRelativePoint>,
        context: RenderingContext,
        _args?: IViewArgs | undefined
    ): VNode | undefined {
        const position = model.position;
        const target = model.targetPosition;
        return svg(
            "g",
            null,
            svg("polyline", {
                attrs: {
                    points: `${target.x},${target.y} ${target.x},${position.y} ${position.x},${position.y}`
                },
                class: {
                    "canvas-dependency-line": true
                }
            }),
            this.renderPoint(model, context, position)
        );
    }
}

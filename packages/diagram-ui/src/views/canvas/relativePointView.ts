import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, svg } from "sprotty";
import { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import { CanvasPointView } from "./canvasPointView.js";
import { SRoot } from "../../model/sRoot.js";

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
        const pointRadius = SRoot.POINT_SIZE / model.root.zoom / 2;
        const startY = target.y + Math.sign(position.y - target.y) * pointRadius;
        const endX = position.x - Math.sign(position.x - target.x) * pointRadius;
        let endY: number;
        let startX: number;
        if (target.x === position.x) {
            endY = position.y - Math.sign(position.y - target.y) * pointRadius;
        } else {
            endY = position.y;
        }
        if (target.y === position.y) {
            startX = target.x + Math.sign(position.x - target.x) * pointRadius;
        } else {
            startX = target.x;
        }
        return svg(
            "g",
            null,
            svg("polyline", {
                attrs: {
                    points: `${startX},${startY} ${startX},${endY} ${endX},${endY}`,
                    "marker-start": "url(#arrow)"
                },
                class: {
                    "canvas-dependency-line": true
                }
            }),
            this.renderPoint(model, context, position)
        );
    }
}

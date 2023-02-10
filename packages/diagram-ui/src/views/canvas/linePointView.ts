import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, svg } from "sprotty";
import { SLinePoint } from "../../model/canvas/sLinePoint";
import { CanvasPointView } from "./canvasPointView";

/**
 * IView that represents an LinePoint
 */
@injectable()
export class LinePointView extends CanvasPointView<SLinePoint> {
    renderInternal(
        model: Readonly<SLinePoint>,
        context: RenderingContext,
        _args?: IViewArgs | undefined
    ): VNode | undefined {
        const position = model.position;
        const point = this.renderPoint(model, context, position);
        if (model.distance) {
            const root = model.rootPosition;
            return svg(
                "g",
                null,
                svg("line", {
                    attrs: {
                        x1: root.x,
                        y1: root.y,
                        x2: position.x,
                        y2: position.y
                    },
                    class: {
                        "canvas-dependency-line": true
                    }
                }),
                point
            );
        } else {
            return point;
        }
    }
}

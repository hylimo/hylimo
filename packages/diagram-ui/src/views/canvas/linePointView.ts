import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import { svg } from "sprotty";
import type { SLinePoint } from "../../model/canvas/sLinePoint.js";
import { CanvasPointView } from "./canvasPointView.js";

/**
 * IView that represents an LinePoint
 */
@injectable()
export class LinePointView extends CanvasPointView<SLinePoint> {
    renderInternal(model: Readonly<SLinePoint>): VNode | undefined {
        const position = model.position;
        const point = this.renderPoint(model, position);
        if (model.distance) {
            const root = model.rootPosition;
            return svg(
                "g",
                null,
                svg("line.canvas-dependency-line", {
                    attrs: {
                        x1: root.x,
                        y1: root.y,
                        x2: position.x,
                        y2: position.y
                    }
                }),
                ...point
            );
        } else {
            return svg("g", null, ...point);
        }
    }
}

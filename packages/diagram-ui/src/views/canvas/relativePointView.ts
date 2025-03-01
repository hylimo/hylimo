import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import { svg } from "sprotty";
import type { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import { CanvasPointView } from "./canvasPointView.js";
import { Point } from "@hylimo/diagram-common";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { RootView } from "../rootView.js";

/**
 * IView that represents an RelativePoint
 */
@injectable()
export class RelativePointView extends CanvasPointView<SRelativePoint> {
    override renderInternal(model: Readonly<SRelativePoint>): VNode | undefined {
        const position = model.position;
        const target = model.targetPosition;
        const pointRadius = SCanvasPoint.POINT_SIZE / model.root.zoom / 2;
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
        const children: VNode[] = [...this.renderPoint(model, position)];
        if (!Point.equals(position, target)) {
            children.push(
                svg("polyline.canvas-dependency-line", {
                    attrs: {
                        points: `${startX},${startY} ${startX},${endY} ${endX},${endY}`,
                        "marker-start": `url(#${RootView.ARROW_MARKER_ID})`,
                        "stroke-dasharray": 8
                    }
                })
            );
        }
        return svg("g", null, ...children);
    }
}

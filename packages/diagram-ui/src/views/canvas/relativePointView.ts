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
        const targetX = model.targetXPosition;
        const targetY = model.targetYPosition;
        const pointRadius = SCanvasPoint.POINT_SIZE / model.root.zoom / 2;
        const children: VNode[] = [...this.renderPoint(model, position)];
        if (!Point.equals(position, targetX)) {
            const startY = targetX.y + Math.sign(position.y - targetX.y) * pointRadius;
            const endX = position.x - Math.sign(position.x - targetX.x) * pointRadius;
            let endY: number;
            let startX: number;
            if (targetX.x === position.x) {
                endY = position.y - Math.sign(position.y - targetX.y) * pointRadius;
            } else {
                endY = position.y;
            }
            if (targetX.y === position.y) {
                startX = targetX.x + Math.sign(position.x - targetX.x) * pointRadius;
            } else {
                startX = targetX.x;
            }
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
        if (!Point.equals(position, targetY)) {
            const startX = targetY.x + Math.sign(position.x - targetY.x) * pointRadius;
            const endY = position.y - Math.sign(position.y - targetY.y) * pointRadius;
            let endX: number;
            let startY: number;
            if (targetY.x === position.x) {
                endX = position.x - Math.sign(position.x - targetY.x) * pointRadius;
            } else {
                endX = position.x;
            }
            if (targetY.y === position.y) {
                startY = targetY.y + Math.sign(position.y - targetY.y) * pointRadius;
            } else {
                startY = targetY.y;
            }
            children.push(
                svg("polyline.canvas-dependency-line", {
                    attrs: {
                        points: `${startX},${startY} ${endX},${startY} ${endX},${endY}`,
                        "marker-start": `url(#${RootView.ARROW_MARKER_ID})`,
                        "stroke-dasharray": 8
                    }
                })
            );
        }
        return svg("g", null, ...children);
    }
}

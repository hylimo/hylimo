import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import { CanvasPointView } from "./canvasPointView.js";
import { Point } from "@hylimo/diagram-common";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import { SRootView } from "../rootView.js";

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
            const zoom = findViewportZoom(model);
            children.push(
                svg("polyline.canvas-dependency-line", {
                    attrs: {
                        points: `${startX},${startY} ${startX},${endY} ${endX},${endY}`,
                        "marker-start": `url(#${SRootView.ARROW_MARKER_ID})`,
                        "stroke-dasharray": 8 / zoom
                    }
                })
            );
        }
        return svg("g", null, ...children);
    }
}

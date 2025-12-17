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
        const pointRadius = (SCanvasPoint.INNER_POINT_SIZE + 1.5) / model.root.zoom / 2;
        const children: VNode[] = [...this.renderPoint(model, position)];

        if (Point.equals(targetX, targetY)) {
            const line = this.renderDependencyLine(position, targetX, pointRadius, true);
            if (line) {
                children.push(line);
            }
        } else {
            const lineX = this.renderDependencyLine(position, targetX, pointRadius, false);
            if (lineX) {
                children.push(lineX);
            }
            const lineY = this.renderDependencyLine(position, targetY, pointRadius, true);
            if (lineY) {
                children.push(lineY);
            }
        }
        return svg("g", null, ...children);
    }

    /**
     * Renders a dependency line from position to target
     * @param position The position of the point
     * @param target The target position
     * @param pointRadius The radius of the point
     * @param verticalFirst If true, the vertical segment is rendered first, otherwise horizontal first
     * @returns The rendered line or undefined if no line should be rendered
     */
    private renderDependencyLine(
        position: Point,
        target: Point,
        pointRadius: number,
        verticalFirst: boolean
    ): VNode | undefined {
        const dx = position.x - target.x;
        const dy = position.y - target.y;

        const needsHorizontalSegment = Math.abs(dx) > pointRadius;
        const needsVerticalSegment = Math.abs(dy) > pointRadius;

        if (!needsHorizontalSegment && !needsVerticalSegment) {
            return undefined;
        }

        if (!needsVerticalSegment || !needsHorizontalSegment) {
            let startX: number, startY: number, endX: number, endY: number;

            if (needsHorizontalSegment) {
                const offsetStart = Math.sqrt(pointRadius * pointRadius - dy ** 2);
                startX = target.x + Math.sign(dx) * offsetStart;
                startY = position.y;
                endX = position.x - Math.sign(dx) * pointRadius;
                endY = position.y;
            } else {
                const offsetStart = Math.sqrt(pointRadius * pointRadius - dx ** 2);
                startX = target.x;
                startY = target.y + Math.sign(dy) * offsetStart;
                endX = position.x;
                endY = position.y - Math.sign(dy) * pointRadius;
            }

            return svg("polyline.canvas-dependency-line", {
                attrs: {
                    points: `${startX},${startY} ${endX},${endY}`,
                    "marker-start": `url(#${RootView.ARROW_MARKER_ID})`,
                    "stroke-dasharray": 8
                }
            });
        } else {
            let startX: number, startY: number, endX: number, endY: number;
            let midX: number, midY: number;

            if (verticalFirst) {
                startY = target.y + Math.sign(dy) * pointRadius;
                startX = target.x;
                endX = position.x - Math.sign(dx) * pointRadius;
                endY = position.y;
                midX = startX;
                midY = endY;
            } else {
                startX = target.x + Math.sign(dx) * pointRadius;
                startY = target.y;
                endY = position.y - Math.sign(dy) * pointRadius;
                endX = position.x;
                midX = endX;
                midY = startY;
            }

            return svg("polyline.canvas-dependency-line", {
                attrs: {
                    points: `${startX},${startY} ${midX},${midY} ${endX},${endY}`,
                    "marker-start": `url(#${RootView.ARROW_MARKER_ID})`,
                    "stroke-dasharray": 8
                }
            });
        }
    }
}

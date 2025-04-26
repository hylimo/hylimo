import { inject, injectable } from "inversify";
import { TYPES } from "../../features/types.js";
import type { SnapLinesStateManager } from "../../features/snap/snapLinesStateManager.js";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import type { SRoot } from "../../model/sRoot.js";
import type { VNode } from "snabbdom";
import { svg } from "sprotty";
import type { GapSnapLine, SnapLine } from "../../features/snap/snapping.js";
import { Math2D, type Point } from "@hylimo/diagram-common";
import { findViewportZoom } from "../../base/findViewportZoom.js";

/**
 * Base class for RootView and CanvasView
 */
@injectable()
export abstract class CanvasLikeView {
    /**
     * The manager for the snap lines
     */
    @inject(TYPES.SnapLinesStateManager) protected snapLinesStateManager!: SnapLinesStateManager;

    /**
     * Renders the snap lines for the given model
     *
     * @param model the model to render the snap lines for
     * @returns the rendered snap lines
     */
    protected renderSnapLines(model: Readonly<SCanvas | SRoot>): VNode[] {
        const snapLines = this.snapLinesStateManager.getSnapLines(model);
        if (snapLines == undefined) {
            return [];
        }
        const result: VNode[] = [];
        const zoom = findViewportZoom(model);
        for (const line of snapLines) {
            result.push(this.renderSnapLine(line));
            if (line.type === "gap") {
                result.push(...this.renderGapSnapLines(line, zoom));
            } else if (line.type === "points") {
                for (const point of line.points) {
                    result.push(this.renderSnapLinePoint(point, zoom));
                }
            }
        }
        return result;
    }

    /**
     * Renders a single snap line.
     *
     * @param line the snap line to render
     * @returns the rendered snap line as a VNode
     */
    private renderSnapLine(line: SnapLine): VNode {
        return svg("line.snap-line", {
            attrs: {
                x1: line.points[0].x,
                y1: line.points[0].y,
                x2: line.points.at(-1)!.x,
                y2: line.points.at(-1)!.y
            }
        });
    }

    /**
     * Renders a point on a snap line.
     *
     * @param point the point to render
     * @param zoom the current zoom level
     * @returns the rendered snap line point as a VNode
     */
    private renderSnapLinePoint(point: Point, zoom: number): VNode {
        const length = 2 / zoom;
        return svg("path.snap-line-point", {
            attrs: {
                d: `M ${point.x - length} ${point.y - length} L ${point.x + length} ${point.y + length} M ${point.x - length} ${point.y + length} L ${point.x + length} ${point.y - length}`
            }
        });
    }

    /**
     * Renders two lines in the middle of the gap snap line.
     *
     * @param line the gap snap line to render
     * @param zoom the current zoom level
     * @returns an array of rendered gap snap lines as VNodes
     */
    private renderGapSnapLines(line: GapSnapLine, zoom: number): VNode[] {
        const length = 3 / zoom;
        const lines: VNode[] = [];
        const horizontal = line.direction === "horizontal";
        const point = Math2D.linearInterpolate(line.points[0], line.points[1], 0.5);
        for (const d of [-1, 1]) {
            lines.push(
                svg("line.snap-line-gap", {
                    x1: point.x + (horizontal ? d * length : length * 2),
                    y1: point.y + (horizontal ? length * 2 : d * length),
                    x2: point.x + (horizontal ? d * length : -length * 2),
                    y2: point.y + (horizontal ? -length * 2 : d * length)
                })
            );
        }
        return lines;
    }
}

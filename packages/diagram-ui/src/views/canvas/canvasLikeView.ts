import { inject, injectable } from "inversify";
import { TYPES } from "../../features/types.js";
import type { SnapLinesStateManager } from "../../features/snap/snapLinesStateManager.js";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import type { SRoot } from "../../model/sRoot.js";
import type { VNode } from "snabbdom";
import { svg } from "sprotty";

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
     * Renders the snap lines for the given model#
     *
     * @param model the model to render the snap lines for
     * @returns the rendered snap lines
     */
    protected renderSnapLines(model: Readonly<SCanvas | SRoot>): VNode[] {
        const snapLines = this.snapLinesStateManager.getSnapLines(model);
        if (snapLines == undefined) {
            return [];
        }
        return snapLines
            .filter((line) => line.points.length > 1)
            .map((line) => {
                return svg("line.snap-line", {
                    attrs: {
                        x1: line.points[0].x,
                        y1: line.points[0].y,
                        x2: line.points.at(-1)!.x,
                        y2: line.points.at(-1)!.y
                    },
                    class: {
                        "snap-line": true
                    }
                });
            });
    }
}

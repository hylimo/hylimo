import type { Point } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import type { IView } from "sprotty";
import { svg } from "sprotty";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { findViewportZoom } from "../../base/findViewportZoom.js";

/**
 * Base class for CanvasPoint based views
 */
@injectable()
export abstract class CanvasPointView<T extends SCanvasPoint> implements IView {
    render(model: Readonly<T>): VNode | undefined {
        if (model.isVisible) {
            return this.renderInternal(model);
        } else {
            return undefined;
        }
    }

    /**
     * Renders the point, should be overwritten instead of render.
     * Only called if the point is visible
     *
     * @param model the point to render
     * @returns the rendered point
     */
    abstract renderInternal(model: Readonly<T>): VNode | undefined;

    /**
     * Can be used to render the point itself.
     * Note: does not render anything else
     *
     * @param model the point to render
     * @param position the position of the point
     * @returns the rendered point
     */
    protected renderPoint(model: Readonly<T>, position: Point): VNode[] {
        return renderPoint(position, findViewportZoom(model), model.selected);
    }
}

/**
 * Can be used to render the point itself.
 * Note: does not render anything else
 *
 * @param position the position of the point
 * @param zoom the zoom level of the viewport
 * @param selected if the point is selected
 * @returns the rendered point
 */
export function renderPoint(position: Point, zoom: number, selected: boolean): VNode[] {
    return [
        svg("circle.canvas-point.selectable", {
            attrs: {
                cx: position.x,
                cy: position.y,
                r: SCanvasPoint.POINT_SIZE / 2 / zoom
            },
            class: {
                selected
            }
        }),
        svg("circle.canvas-point-inner.selectable", {
            attrs: {
                cx: position.x,
                cy: position.y,
                r: SCanvasPoint.INNER_POINT_SIZE / 2 / zoom
            }
        })
    ];
}

import { Point } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";

/**
 * Base class for CanvasPoint based views
 */
@injectable()
export abstract class CanvasPointView<T extends SCanvasPoint> implements IView {
    render(model: Readonly<T>, context: RenderingContext, args?: IViewArgs | undefined): VNode | undefined {
        if (model.isVisible) {
            return this.renderInternal(model, context, args);
        } else {
            return undefined;
        }
    }

    /**
     * Renders the point, should be overwritten instead of render.
     * Only called if the point is visible
     *
     * @param model the point to render
     * @param context rendering context
     * @param args rendering args
     * @returns the rendered point
     */
    abstract renderInternal(
        model: Readonly<T>,
        context: RenderingContext,
        args?: IViewArgs | undefined
    ): VNode | undefined;

    /**
     * Can be used to render the point itself.
     * Note: does not render anything else
     *
     * @param model the point to render
     * @param context rendering context
     * @returns the rendered point
     */
    protected renderPoint(model: Readonly<T>, _context: RenderingContext, position: Point): VNode | undefined {
        return svg("line", {
            attrs: {
                transform: `translate(${position.x}, ${position.y})`
            },
            class: {
                "canvas-point": true,
                selected: model.selected
            }
        });
    }
}

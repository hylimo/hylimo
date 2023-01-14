import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, RenderingContext } from "sprotty";
import { SCanvasPoint } from "../../model/canvas/canvasPoint";

/**
 * Base class for CanvasPoint based views
 */
@injectable()
export abstract class CanvasPointView<T extends SCanvasPoint> implements IView {
    abstract render(model: Readonly<T>, context: RenderingContext, args?: {} | undefined): VNode | undefined;

    /**
     * Can be used to render the point itself.
     * Note: does not render anything else
     *
     * @param model the point to render
     * @param context rendering context
     * @returns the rendered point
     */
    protected renderPoint(model: Readonly<T>, context: RenderingContext): VNode | undefined {
        return undefined;
    }
}

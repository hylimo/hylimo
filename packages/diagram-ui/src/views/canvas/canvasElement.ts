import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, RenderingContext, svg } from "sprotty";
import { SCanvasElement } from "../../model/canvas/canvasElement";

/**
 * IView that represents a CanvasElement
 */
@injectable()
export class CanvasElementView implements IView {
    render(model: Readonly<SCanvasElement>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        //TODO selected handling
        const position = model.position;
        return svg("g", { transform: `translate(${position.x}, ${position.y})` }, ...context.renderChildren(model));
    }
}

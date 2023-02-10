import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SCanvasElement } from "../../model/canvas/sCanvasElement";

/**
 * IView that represents a CanvasElement
 */
@injectable()
export class CanvasElementView implements IView {
    render(
        model: Readonly<SCanvasElement>,
        context: RenderingContext,
        _args?: IViewArgs | undefined
    ): VNode | undefined {
        const position = model.position;
        const children = context.renderChildren(model);
        if (model.selected) {
            children.push(
                svg("rect", {
                    class: {
                        "selected-rect": true
                    },
                    attrs: {
                        width: model.width,
                        height: model.height
                    }
                })
            );
        }
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(${position.x}, ${position.y}) rotate(${model.rotation}) translate(${model.x}, ${model.y})`
                },
                class: {
                    "canvas-element": true
                }
            },
            ...children
        );
    }
}

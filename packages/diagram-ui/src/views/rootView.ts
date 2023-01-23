import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { SRoot } from "../model/sRoot";

/**
 * IView that is the parent which handles
 */
@injectable()
export class SRootView implements IView {
    render(model: Readonly<SRoot>, context: RenderingContext, args?: IViewArgs | undefined): VNode {
        const transform = `scale(${model.zoom}) translate(${-model.scroll.x},${-model.scroll.y})`;
        return svg(
            "svg",
            null,
            svg("style", null, model.generateStyle()),
            svg(
                "g",
                {
                    attrs: {
                        transform
                    },
                    class: {
                        "sprotty-root": true
                    }
                },
                ...context.renderChildren(model, undefined)
            )
        );
    }
}

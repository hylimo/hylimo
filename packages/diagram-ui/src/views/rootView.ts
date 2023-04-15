import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { SRoot } from "../model/sRoot";

/**
 * IView that is the parent which handles
 */
@injectable()
export class SRootView implements IView {
    render(model: Readonly<SRoot>, context: RenderingContext, _args?: IViewArgs | undefined): VNode {
        const transform = `scale(${model.zoom}) translate(${-model.scroll.x},${-model.scroll.y})`;
        return svg(
            "svg",
            null,
            svg("style", null, model.generateStyle()),
            svg(
                "defs",
                null,
                svg(
                    "marker",
                    {
                        attrs: {
                            id: "arrow",
                            viewBox: "0 0 10 10",
                            refX: 9,
                            refY: 5,
                            markerWidth: 6,
                            markerHeight: 6,
                            markerUnits: "strokeWidth",
                            orient: "auto-start-reverse"
                        }
                    },
                    svg("path", {
                        attrs: {
                            d: "M 0 0 L 10 5 L 0 10 z",
                            fill: "var(--diagram-layout-color)"
                        }
                    })
                )
            ),
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

import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { findViewportZoom } from "../../base/findViewportZoom";
import { SCanvasElement } from "../../model/canvas/sCanvasElement";

/**
 * IView that represents a CanvasElement
 */
@injectable()
export class CanvasElementView implements IView {
    /**
     * The path to use for the rotate icon
     */
    private static readonly ROTATE_PATH = `M 23.8 4.7 c -0.5 -0.5 -1.2 -0.8 -1.9 -0.8 H 8.4 c -1.5 0 -2.7 1.2 -2.7 2.7 v 2.3
        c 0 0.7 0.3 1.4 0.8 1.9 c 0.5 0.5 1.2 0.8 1.9 0.8 l 3.9 0 c -3.2 3.4 -7.7 5.4 -12.4 5.4
        c -9.3 0 -16.9 -7.6 -16.9 -16.9 s 7.6 -16.9 16.9 -16.9 c 7 0 13.3 4.4 15.8 10.9 c 0.6 1.5 2 2.5 3.6 2.5
        c 0.5 0 0.9 -0.1 1.4 -0.3 c 2 -0.8 3 -3 2.2 -5 C 19.4 -18.2 10.1 -24.6 0 -24.6 C -13.6 -24.6 -24.6 -13.6 -24.6 0
        s 11 24.6 24.6 24.6 c 6.3 0 12.3 -2.5 16.9 -6.8 v 2.2 c 0 1.5 1.2 2.7 2.7 2.7 h 2.3 c 1.5 0 2.7 -1.2 2.7 -2.7
        v -13.4 C 24.6 5.8 24.3 5.2 23.8 4.7 z`;
    /**
     * Width and height of the rotate path
     */
    private static readonly ROTATE_PATH_SIZE = 50;
    /**
     * Class assigned to the rotate icon
     */
    static readonly ROTATE_ICON_CLASS = "canvas-rotate-icon";
    /**
     * Distance of the rotation icon to the center
     */
    static readonly ROTATE_ICON_DISTANCE = 30;

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
            if (model.rotateable != undefined) {
                const x = -model.x;
                const zoom = findViewportZoom(model);
                const y = -CanvasElementView.ROTATE_ICON_DISTANCE / zoom;
                children.push(
                    svg("path", {
                        attrs: {
                            d: CanvasElementView.ROTATE_PATH,
                            transform: `translate(${x}, ${y}) scale(${
                                (1 / zoom / CanvasElementView.ROTATE_PATH_SIZE) * 13
                            })`
                        },
                        class: {
                            [CanvasElementView.ROTATE_ICON_CLASS]: true
                        }
                    })
                );
            }
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

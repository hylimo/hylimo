import { DefaultEditTypes, EditSpecification, Point } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";

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
     * Class assigned to resize lines
     */
    static readonly RESIZE_CLASS = "resize";
    /**
     * Class assigned to resize borders
     */
    static readonly RESIZE_BORDER_CLASS = "resize-border";
    /**
     * Class assigned to resize corners
     */
    static readonly RESIZE_CORNER_CLASS = "resize-corner";
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
            children.push(this.generateSelectedRect(model));
            if (
                DefaultEditTypes.ROTATE in model.edits &&
                EditSpecification.isConsistent([[model.edits[DefaultEditTypes.ROTATE]]])
            ) {
                children.push(this.generateRotationIcon(model));
            }
            children.push(...this.generateResizeBorder(model));
        }
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(${position.x}, ${position.y}) rotate(${model.rotation})`
                },
                class: {
                    "canvas-element": true
                }
            },
            ...children
        );
    }

    /**
     * Generates a rectangle that is displayed if the element is selected.
     * Does NOT check if the element is selected.
     *
     * @param model The model of the element
     * @returns The rectangle
     */
    private generateSelectedRect(model: Readonly<SCanvasElement>): VNode {
        return svg("rect", {
            class: {
                "selected-rect": true
            },
            attrs: {
                x: model.dx,
                y: model.dy,
                width: model.width,
                height: model.height
            }
        });
    }

    /**
     * Generates the rotate icon.
     * Does not check if the element is selected or rotateable.
     *
     * @param model The model of the element
     * @returns The rotate icon
     */
    private generateRotationIcon(model: Readonly<SCanvasElement>): VNode {
        const zoom = findViewportZoom(model);
        const y = model.dy - CanvasElementView.ROTATE_ICON_DISTANCE / zoom;
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(0, ${y}) scale(${(1 / zoom / CanvasElementView.ROTATE_PATH_SIZE) * 13})`
                },
                class: {
                    [CanvasElementView.ROTATE_ICON_CLASS]: true
                }
            },
            svg("path", {
                attrs: {
                    d: CanvasElementView.ROTATE_PATH
                },
                class: {
                    [CanvasElementView.ROTATE_ICON_CLASS]: true
                }
            }),
            svg("rect", {
                attrs: {
                    x: -CanvasElementView.ROTATE_PATH_SIZE / 2,
                    y: -CanvasElementView.ROTATE_PATH_SIZE / 2,
                    width: CanvasElementView.ROTATE_PATH_SIZE,
                    height: CanvasElementView.ROTATE_PATH_SIZE
                },
                class: {
                    [CanvasElementView.ROTATE_ICON_CLASS]: true
                }
            })
        );
    }

    /**
     * Generates resize lines.
     * Checks if the element is resizable, but does not check if the element is selected.
     *
     * @param model The model of the element
     * @returns The resize lines
     */
    private generateResizeBorder(model: Readonly<SCanvasElement>): VNode[] {
        const result: VNode[] = [];
        const iconOffset = Math.round((model.rotation / 45) % 8);
        const isXResizable = DefaultEditTypes.RESIZE_WIDTH in model.edits;
        const isYResizable = DefaultEditTypes.RESIZE_HEIGHT in model.edits;
        if (isXResizable) {
            result.push(this.generateResizeLine(model, 1, 2, iconOffset, ResizePosition.RIGHT));
            result.push(this.generateResizeLine(model, 3, 4, iconOffset, ResizePosition.LEFT));
        }
        if (isYResizable) {
            result.push(this.generateResizeLine(model, 0, 1, iconOffset, ResizePosition.TOP));
            result.push(this.generateResizeLine(model, 2, 3, iconOffset, ResizePosition.BOTTOM));
        }
        if (isXResizable && isYResizable) {
            result.push(this.generateResizeLine(model, 0, 0, iconOffset, ResizePosition.TOP, ResizePosition.LEFT));
            result.push(this.generateResizeLine(model, 1, 1, iconOffset, ResizePosition.TOP, ResizePosition.RIGHT));
            result.push(this.generateResizeLine(model, 2, 2, iconOffset, ResizePosition.BOTTOM, ResizePosition.RIGHT));
            result.push(this.generateResizeLine(model, 3, 3, iconOffset, ResizePosition.BOTTOM, ResizePosition.LEFT));
        }
        return result;
    }

    /**
     * Generates a resize line.
     * Applies the class resize-edge if the start and end position are different.
     * Applies the class resize-corner if the start and end position are the same.
     *
     * @param model the canvas element to generate the resize line for
     * @param startPos the start position of the line
     * @param endPos the end position of the line
     * @param curorIconOffset the numerical offset for the resize icon, will be added to (startPos + endPos)
     * @param pos classes applied to the line
     * @returns the generated line
     */
    private generateResizeLine(
        model: Readonly<SCanvasElement>,
        startPos: number,
        endPos: number,
        curorIconOffset: number,
        ...pos: ResizePosition[]
    ): VNode {
        const start = this.generatePoint(model, startPos);
        const end = this.generatePoint(model, endPos);
        return svg("line", {
            attrs: {
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y
            },
            class: {
                ...Object.fromEntries(pos.map((p) => [p, true])),
                [CanvasElementView.RESIZE_BORDER_CLASS]: startPos !== endPos,
                [CanvasElementView.RESIZE_CORNER_CLASS]: startPos === endPos,
                [CanvasElementView.RESIZE_CLASS]: true,
                [`resize-cursor-${(startPos + endPos + curorIconOffset) % 8}`]: true
            }
        });
    }

    /**
     * Computes the position of a point on a rectangle.
     * 0 is the top left corner, 1 is the top right corner, 2 is the bottom right corner and 3 is the bottom left corner.
     *
     * @param model the model for which the point should be computed
     * @param pos the position of the point, taken modulo 4
     * @returns the point
     */
    private generatePoint(model: Readonly<SCanvasElement>, pos: number): Point {
        pos = pos % 4;
        const x = pos === 1 || pos === 2 ? model.width : 0;
        const y = pos < 2 ? 0 : model.height;
        return { x: model.dx + x, y: model.dy + y };
    }
}

/**
 * Different resize line positions
 */
export enum ResizePosition {
    TOP = "resize-top",
    RIGHT = "resize-right",
    BOTTOM = "resize-bottom",
    LEFT = "resize-left"
}

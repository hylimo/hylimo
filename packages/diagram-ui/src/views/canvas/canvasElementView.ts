import type { Point } from "@hylimo/diagram-common";
import { DefaultEditTypes, EditSpecification } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import type { IView, IViewArgs, RenderingContext } from "sprotty";
import { svg } from "sprotty";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import type { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import type { CanvasLike } from "../../model/canvas/canvasLike.js";
import { EditableCanvasContentView } from "./editableCanvasContentView.js";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { computeResizeIconOffset } from "../../features/cursor/resizeIcon.js";

/**
 * IView that represents a CanvasElement
 */
@injectable()
export class CanvasElementView extends EditableCanvasContentView implements IView {
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
     * The offset of the selection rectangle
     */
    static readonly SELECTION_OFFSET = 6;
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
            children.push(...this.generateSelectedRect(model));
        }
        const createConnection = this.renderCreateConnection(model);
        const element = svg(
            "g.canvas-element.selectable",
            {
                attrs: {
                    transform: `translate(${position.x}, ${position.y}) rotate(${model.rotation})`
                }
            },
            ...children
        );
        return svg(
            "g",
            {
                attrs: {
                    "pointer-events": "visible"
                }
            },
            element,
            createConnection
        );
    }

    /**
     * Generates a rectangle that is displayed if the element is selected.
     * Does NOT check if the element is selected.
     *
     * @param model The model of the element
     * @returns The rectangle and its children
     */
    private generateSelectedRect(model: Readonly<SCanvasElement>): VNode[] {
        const zoom = findViewportZoom(model);
        const result: VNode[] = [
            svg("rect.selected-outline", {
                attrs: {
                    ...this.generatePoint(model, zoom, 0),
                    width: model.width + (CanvasElementView.SELECTION_OFFSET * 2) / zoom,
                    height: model.height + (CanvasElementView.SELECTION_OFFSET * 2) / zoom
                }
            }),
            ...[0, 1, 2, 3].map((pos) => this.generateSelectedOutlineCorner(model, zoom, pos)),
            ...this.generateResizeBorder(model, zoom)
        ];
        if (
            DefaultEditTypes.ROTATE in model.edits &&
            EditSpecification.isConsistent([[model.edits[DefaultEditTypes.ROTATE]]])
        ) {
            result.push(this.generateRotationIcon(model, zoom));
        }
        return result;
    }

    /**
     * Generates a corner of the selection rectangle.
     * Does not check if the element is selected.
     *
     * @param model The model of the element
     * @param zoom The zoom level of the diagram
     * @param pos The position of the corner
     * @returns The corner
     */
    private generateSelectedOutlineCorner(model: Readonly<SCanvasElement>, zoom: number, pos: number): VNode {
        const point = this.generatePoint(model, zoom, pos);
        return svg("rect.selected-outline-corner", {
            attrs: {
                x: point.x - SCanvasPoint.INNER_POINT_SIZE / 2 / zoom,
                y: point.y - SCanvasPoint.INNER_POINT_SIZE / 2 / zoom,
                width: SCanvasPoint.INNER_POINT_SIZE / zoom,
                height: SCanvasPoint.INNER_POINT_SIZE / zoom,
                rx: SCanvasPoint.INNER_POINT_SIZE / 4 / zoom
            }
        });
    }

    /**
     * Generates the rotate icon.
     * Does not check if the element is selected or rotateable.
     *
     * @param model The model of the element
     * @param zoom The zoom level of the diagram
     * @returns The rotate icon
     */
    private generateRotationIcon(model: Readonly<SCanvasElement>, zoom: number): VNode {
        return svg("rect", {
            class: {
                [CanvasElementView.ROTATE_ICON_CLASS]: true
            },
            attrs: {
                x: -SCanvasPoint.INNER_POINT_SIZE / 2 / zoom,
                y: model.dy - CanvasElementView.ROTATE_ICON_DISTANCE / zoom,
                width: SCanvasPoint.INNER_POINT_SIZE / zoom,
                height: SCanvasPoint.INNER_POINT_SIZE / zoom
            }
        });
    }

    /**
     * Generates resize lines.
     * Checks if the element is resizable, but does not check if the element is selected.
     *
     * @param model The model of the element
     * @param zoom The zoom level of the diagram
     * @returns The resize lines
     */
    private generateResizeBorder(model: Readonly<SCanvasElement>, zoom: number): VNode[] {
        const result: VNode[] = [];
        const iconOffset = this.computeResizeIconOffset(model);
        const isXResizable = DefaultEditTypes.RESIZE_WIDTH in model.edits;
        const isYResizable = DefaultEditTypes.RESIZE_HEIGHT in model.edits;
        if (isXResizable) {
            result.push(this.generateResizeLine(model, zoom, 1, 2, iconOffset, ResizePosition.RIGHT));
            result.push(this.generateResizeLine(model, zoom, 3, 4, iconOffset, ResizePosition.LEFT));
        }
        if (isYResizable) {
            result.push(this.generateResizeLine(model, zoom, 0, 1, iconOffset, ResizePosition.TOP));
            result.push(this.generateResizeLine(model, zoom, 2, 3, iconOffset, ResizePosition.BOTTOM));
        }
        if (isXResizable && isYResizable) {
            result.push(
                this.generateResizeLine(model, zoom, 0, 0, iconOffset, ResizePosition.TOP, ResizePosition.LEFT),
                this.generateResizeLine(model, zoom, 1, 1, iconOffset, ResizePosition.TOP, ResizePosition.RIGHT),
                this.generateResizeLine(model, zoom, 2, 2, iconOffset, ResizePosition.BOTTOM, ResizePosition.RIGHT),
                this.generateResizeLine(model, zoom, 3, 3, iconOffset, ResizePosition.BOTTOM, ResizePosition.LEFT)
            );
        }
        return result;
    }

    /**
     * Computes the offset to the index of a resize icon based on the elements rotation relative to the diagram root.
     * The resize icon index ranges from 0 to 7, where each step is a 45 degree rotation.
     * The computed offset can be applied to the index based on the location of the resize border, e.g. 0 for the top left corner,
     * to obtain the index of the icon which is rotated according to the element's rotation relative to the diagram root.
     *
     * @param model the canvas element to compute the offset for
     * @returns the offset for the rotation of the canvas element
     */
    private computeResizeIconOffset(model: Readonly<SCanvasElement>) {
        return computeResizeIconOffset(model.parent as CanvasLike, model.rotation);
    }

    /**
     * Generates a resize line.
     * Applies the class resize-edge if the start and end position are different.
     * Applies the class resize-corner if the start and end position are the same.
     *
     * @param model the canvas element to generate the resize line for
     * @param zoom the zoom level of the diagram
     * @param startPos the start position of the line
     * @param endPos the end position of the line
     * @param cursorIconOffset the numerical offset for the resize icon, will be added to (startPos + endPos)
     * @param pos classes applied to the line
     * @returns the generated line
     */
    private generateResizeLine(
        model: Readonly<SCanvasElement>,
        zoom: number,
        startPos: number,
        endPos: number,
        cursorIconOffset: number,
        ...pos: ResizePosition[]
    ): VNode {
        const start = this.generatePoint(model, zoom, startPos);
        const end = this.generatePoint(model, zoom, endPos);
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
                [`cursor-resize-${(startPos + endPos + cursorIconOffset) % 8}`]: true
            }
        });
    }

    /**
     * Computes the position of a point on the selection rectangle.
     * 0 is the top left corner, 1 is the top right corner, 2 is the bottom right corner and 3 is the bottom left corner.
     *
     * @param model the model for which the point should be computed
     * @param zoom the zoom level of the diagram
     * @param pos the position of the point, taken modulo 4
     * @returns the point
     */
    private generatePoint(model: Readonly<SCanvasElement>, zoom: number, pos: number): Point {
        pos = pos % 4;
        const scaledOffset = CanvasElementView.SELECTION_OFFSET / zoom;
        const x = pos === 1 || pos === 2 ? model.width + scaledOffset : -scaledOffset;
        const y = pos < 2 ? -scaledOffset : model.height + scaledOffset;
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

import { LayoutedElement } from "../base/layoutedElement";

/**
 * Canvas consisting of points, elements and connections.
 * Must have only CanvasElement and CanvasConnection as children
 */
export interface Canvas extends LayoutedElement {
    type: "canvas";
}

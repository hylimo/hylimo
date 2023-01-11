import { PositionedElement } from "./positionedElement";
import { SizedElement } from "./sizedElement";

/**
 * Element with a position and a size
 */
export interface LayoutedElement extends PositionedElement, SizedElement {}

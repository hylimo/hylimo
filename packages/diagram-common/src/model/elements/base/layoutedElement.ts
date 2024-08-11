import { PositionedElement } from "./positionedElement.js";
import { SizedElement } from "./sizedElement.js";

/**
 * Element with a position and a size
 */
export interface LayoutedElement extends PositionedElement, SizedElement {}

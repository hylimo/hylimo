import type { PositionedElement } from "./positionedElement.js";
import type { SizedElement } from "./sizedElement.js";

/**
 * Element with a position and a size
 */
export interface LayoutedElement extends PositionedElement, SizedElement {}

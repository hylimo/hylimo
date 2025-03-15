import type { FilledElement } from "./base/filledElement.js";
import type { LayoutedElement } from "./base/layoutedElement.js";
import type { StrokedElement } from "./base/strokedElement.js";

/**
 * An element which displays some graphics
 */
export interface Shape extends LayoutedElement, StrokedElement, FilledElement {}

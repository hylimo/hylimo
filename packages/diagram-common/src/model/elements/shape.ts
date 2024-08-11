import { FilledElement } from "./base/filledElement.js";
import { LayoutedElement } from "./base/layoutedElement.js";
import { StrokedElement } from "./base/strokedElement.js";

/**
 * An element which displays some graphics
 */
export interface Shape extends LayoutedElement, StrokedElement, FilledElement {}

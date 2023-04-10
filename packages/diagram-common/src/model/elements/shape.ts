import { FilledElement } from "./base/filledElement";
import { LayoutedElement } from "./base/layoutedElement";
import { StrokedElement } from "./base/strokedElement";

/**
 * An element which displays some graphics
 */
export interface Shape extends LayoutedElement, StrokedElement, FilledElement {}

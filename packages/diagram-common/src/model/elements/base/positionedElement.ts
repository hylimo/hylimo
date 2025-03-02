import type { Point } from "../../../common/point.js";
import type { Element } from "./element.js";

/**
 * Element with a position
 */
export interface PositionedElement extends Element, Point {}

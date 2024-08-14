import { Point } from "../../../common/point.js";
import { Element } from "./element.js";

/**
 * Element with a position
 */
export interface PositionedElement extends Element, Point {}

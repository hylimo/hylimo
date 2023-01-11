import { Point } from "../../common/point";
import { Element } from "./element";

/**
 * Element with a position
 */
export interface PositionedElement extends Element, Point {}

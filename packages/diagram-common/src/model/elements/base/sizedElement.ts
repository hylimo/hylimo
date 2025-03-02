import type { Size } from "../../../common/size.js";
import type { Element } from "./element.js";

/**
 * Element with a size
 */
export interface SizedElement extends Element, Size {}

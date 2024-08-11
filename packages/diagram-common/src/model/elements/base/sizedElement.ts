import { Size } from "../../../common/size.js";
import { Element } from "./element.js";

/**
 * Element with a size
 */
export interface SizedElement extends Element, Size {}

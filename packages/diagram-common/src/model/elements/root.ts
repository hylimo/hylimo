import { Bounds } from "../../common/bounds.js";
import { FontData } from "../../font/fontData.js";
import { Element } from "./base/element.js";

/**
 * Root diagram element, defining child elements and fonts
 */
export interface Root extends Element {
    /**
     * Type of the element
     */
    type: typeof Root.TYPE;
    /**
     * The id of the element
     */
    id: string;
    /**
     * Defined font families
     */
    fonts: FontData[];
    /**
     * The bounds of the whole diagram, as defined by hylimo's internal definition, not the definition of any external tool
     */
    rootBounds: Bounds;
}

export namespace Root {
    export const TYPE = "root";
}

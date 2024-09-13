import { Bounds } from "../../common/bounds.js";
import { FontFamilyConfig } from "../../font/fontConfig.js";
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
    id: typeof Root.TYPE;
    /**
     * Defined font families
     */
    fonts: FontFamilyConfig[];
    /**
     * The bounds of the whole diagram, as defined by hylimo's internal definition, not the definition of any external tool
     */
    rootBounds: Bounds;
}

export namespace Root {
    export const TYPE = "root";
}

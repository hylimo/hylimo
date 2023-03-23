import { FontFamilyConfig } from "../../font/fontConfig";
import { Element } from "./base/element";

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
     * Overwrites the animated from the update-model action
     */
    noAnimation?: boolean;
}

export namespace Root {
    export const TYPE = "root";
}

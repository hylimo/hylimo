import { SModelRoot } from "sprotty-protocol";
import { FontFamilyConfig } from "./font/fontConfig";
import { Element } from "./model/base/element";

/**
 * Root diagram element, defining child elements and fonts
 */
export interface Root extends SModelRoot {
    /**
     * Type of the element
     */
    type: typeof Root.TYPE;
    /**
     * Child elementes
     */
    children: Element[];
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

import { SModelRoot } from "sprotty-protocol";
import { FontFamilyConfig } from "../font/fontConfig";
import { Element } from "./base";

/**
 * Root diagram element, defining child elements and fonts
 */
export interface Root extends SModelRoot {
    /**
     * Type of the element
     */
    type: "root";
    /**
     * Child elementes
     */
    children: Element[];
    /**
     * Defined font families
     */
    fonts: FontFamilyConfig[];
}

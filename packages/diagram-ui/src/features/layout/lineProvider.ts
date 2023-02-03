import { TransformedLine } from "@hylimo/diagram-common";
import { SModelElement, SModelExtension } from "sprotty";

/**
 * Provides a line. This can be the element itself or an outline
 */
export interface LineProvider extends SModelExtension {
    /**
     * The provided line
     */
    line: TransformedLine;
}

/**
 * Checks if the provided element is a LineProvider
 *
 * @param element the SModelElement to check
 * @returns true if the element is a LineProvider
 */
export function isLineProvider(element: SModelElement): element is SModelElement & LineProvider {
    return "line" in element;
}

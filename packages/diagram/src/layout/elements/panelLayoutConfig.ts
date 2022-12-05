import { FullObject, nativeToList, objectToList } from "@hylimo/core";
import { LayoutElement } from "../layoutElement";
import { BaseElementLayoutConfig } from "./baseElementLayoutConfig";

/**
 * Base class for all layout configs which contain contents
 */
export abstract class PanelLayoutConfig extends BaseElementLayoutConfig {
    /**
     * Gets the contents of a panel
     *
     * @param element the element containing the contents
     * @returns the contents
     */
    getContents(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}

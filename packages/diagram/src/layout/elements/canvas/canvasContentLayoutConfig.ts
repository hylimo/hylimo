import { FullObject, RuntimeError } from "@hylimo/core";
import { LayoutElement } from "../../layoutElement";
import { ElementLayoutConfig } from "../elementLayoutConfig";

/**
 * Base class for CanvasElementLayoutConfig and CanvasConnectionLayoutConfig
 */
export abstract class CanvasContentLayoutConfig extends ElementLayoutConfig {
    /**
     * Gets the id of a content element of the canvas
     *
     * @param element the current element, its parent must be a point provider (e.g. Canvas)
     * @param contentElement the content element to get the id of
     * @returns the id of the content element
     */
    getContentId(element: LayoutElement, contentElement: FullObject): string {
        const parent = element.parent;
        if (!parent || !parent.contentIdLookup) {
            throw new RuntimeError("CanvasConnections and CanvasElements can only be used as contents of a Canvas");
        }
        const elementId = (parent.contentIdLookup as Map<FullObject, string>).get(contentElement);
        if (!elementId) {
            throw new RuntimeError("Point not found");
        }
        return elementId;
    }
}

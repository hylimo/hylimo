import { FullObject, RuntimeError } from "@hylimo/core";
import { LayoutElement } from "../../layoutElement";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig";

/**
 * Base class for CanvasElementLayoutConfig and CanvasConnectionLayoutConfig
 */
export abstract class CanvasContentLayoutConfig extends StyledElementLayoutConfig {
    /**
     * Gets the id of a point registered on the canvas
     *
     * @param element the current element, its parent must be a point provider (e.g. Canvas)
     * @param point the point to get the id of
     * @returns the id of the point
     */
    getPoint(element: LayoutElement, point: FullObject): string {
        const parent = element.parent;
        if (!parent || !parent.points) {
            throw new RuntimeError("CanvasConnections and CanvasElements can only be used as contents of a Canvas");
        }
        const pointId = (parent.points as Map<FullObject, string>).get(point);
        if (!pointId) {
            throw new RuntimeError("Point not found");
        }
        return pointId;
    }
}

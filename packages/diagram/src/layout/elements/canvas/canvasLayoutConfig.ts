import { FullObject, listType, objectToList, or } from "@hylimo/core";
import {
    Size,
    Point,
    Element,
    Canvas,
    CanvasElement,
    CanvasConnection,
    AbsolutePoint,
    RelativePoint,
    LinePoint
} from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";
import { canvasPointType, elementType } from "../../../module/base/types.js";

/**
 * Layout config for the canvas
 */
export class CanvasLayoutConfig extends StyledElementLayoutConfig {
    override type = Canvas.TYPE;
    override contentType = elementType(
        CanvasElement.TYPE,
        CanvasConnection.TYPE,
        AbsolutePoint.TYPE,
        RelativePoint.TYPE,
        LinePoint.TYPE
    );
    override contentCardinality = ContentCardinality.Many;

    constructor() {
        super(
            [
                {
                    name: "contents",
                    description: "the inner elements",
                    type: listType(or(canvasPointType, elementType(CanvasElement.TYPE, CanvasConnection.TYPE)))
                }
            ],
            []
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        const contents = this.getContents(element);
        element.contents = contents.map((content) =>
            layout.measure(content, element, { min: { width: 0, height: 0 }, max: constraints.max })
        );
        return constraints.max;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.contents as LayoutElement[];
        const contentIdLookup = new Map<FullObject, string>();
        for (let i = 0; i < contents.length; i++) {
            contentIdLookup.set(contents[i].element, `${id}_${i}`);
        }
        element.contentIdLookup = contentIdLookup;
        const children: Element[] = [];
        const layoutChildren: Element[] = [];
        for (const content of contents) {
            if ((content.layoutConfig as CanvasContentLayoutConfig).isLayoutContent) {
                layoutChildren.push(
                    ...layout.layout(content, position, content.measuredSize!, contentIdLookup.get(content.element)!)
                );
            } else {
                children.push(
                    ...layout.layout(content, position, content.measuredSize!, contentIdLookup.get(content.element)!)
                );
            }
        }
        const result: Canvas = {
            type: Canvas.TYPE,
            id,
            ...position,
            ...size,
            children: [...children, ...layoutChildren],
            edits: element.edits
        };
        return [result];
    }

    /**
     * Gets the contents of a panel
     *
     * @param element the element containing the contents
     * @returns the contents
     */
    private getContents(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}

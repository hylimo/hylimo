import { FullObject, literal, objectToList, objectType, or, SemanticFieldNames } from "@hylimo/core";
import { listType } from "@hylimo/core/src/types/list";
import { Size, Point, Element, CanvasConnection } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig";

export class CanvasConnectionLayoutConfig extends CanvasContentLayoutConfig {
    constructor() {
        super(
            CanvasConnection.TYPE,
            [
                {
                    name: "contents",
                    description: "the inner elements",
                    type: listType(
                        objectType(
                            new Map([
                                [SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))],
                                ["type", or(literal("canvasConnection"), literal("canvasElement"))]
                            ])
                        )
                    )
                }
            ],
            []
        );
    }
    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        const contents = this.getContents(element);
        element.contents = contents.map((content) => layout.measure(content, element, constraints));
        return constraints.min;
    }
    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.contents as LayoutElement[];
        const result: CanvasConnection = {
            id,
            type: CanvasConnection.TYPE,
            children: contents.flatMap((content, i) =>
                layout.layout(content, position, content.measuredSize!, `${id}_${i}`)
            )
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

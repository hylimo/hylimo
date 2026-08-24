import type { FullObject } from "@hylimo/core";
import { objectToList } from "@hylimo/core";
import type { Element, Size, Point } from "@hylimo/diagram-common";
import { Text } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { elementType } from "../../module/base/types.js";
import { enumType } from "@hylimo/core";

/**
 * Layout config for text
 */
export class TextLayoutConfig extends StyledElementLayoutConfig {
    override type = Text.TYPE;

    constructor() {
        super(
            [],
            [
                {
                    name: "direction",
                    description:
                        'the direction the text runs in, must be one of "horizontal", "clockwise" (reading top to ' +
                        'bottom) or "counterclockwise" (reading bottom to top)',
                    type: enumType(TextDirection)
                }
            ],
            elementType("span"),
            ContentCardinality.Many
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            contents.forEach((content) => layout.measure(content, constraints));
            const turned = this.isTurned(element);
            const maxWidth = turned ? constraints.max.height : constraints.max.width;
            const layoutRes = layout.engine.textCache.getOrCompute(
                {
                    maxWidth,
                    spans: element.children.map((content) => content.styles)
                },
                () => {
                    return layout.engine.textLayouter.layout(element, layout.fonts, maxWidth);
                }
            );
            element.layoutedContents = layoutRes.elements.map((element) => ({ ...element }));
            element.textBlockSize = layoutRes.size;
            if (turned) {
                return { width: layoutRes.size.height, height: layoutRes.size.width };
            }
            return layoutRes.size;
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        if (element.isHidden || element.children.length === 0) {
            return [];
        }
        const elements = element.layoutedContents as Text[];
        const direction = (element.styles.direction as TextDirection | undefined) ?? TextDirection.Horizontal;
        const blockSize = element.textBlockSize as Size;
        for (let i = 0; i < elements.length; i++) {
            const line = elements[i];
            line.id = `${id}_${i}`;
            if (direction === TextDirection.Horizontal) {
                line.x += position.x;
                line.y += position.y;
            } else {
                const anchor = this.turnAnchor(direction, line, blockSize);
                line.x = position.x + anchor.x;
                line.y = position.y + anchor.y;
                line.rotation = direction === TextDirection.Clockwise ? 90 : -90;
            }
        }
        return elements;
    }

    /**
     * Maps a line's anchor from the coordinates the text layouter produced into the turned ones.
     *
     * The layouter always works horizontally: a line's anchor is the left end of its baseline within a block of
     * `blockSize`. A quarter turn maps that block onto its transpose, and the rendered line is then rotated around
     * the anchor this returns, so the text runs along the turned axis.
     *
     * @param direction the direction to turn in, never horizontal
     * @param line the line to map, in the layouter's coordinates
     * @param blockSize the size of the untuned text block
     * @returns the anchor of the line in the turned coordinates
     */
    private turnAnchor(direction: TextDirection, line: Text, blockSize: Size): Point {
        if (direction === TextDirection.Clockwise) {
            return { x: blockSize.height - line.y, y: line.x };
        }
        return { x: line.y, y: blockSize.width - line.x };
    }

    /**
     * Checks whether the text is turned, meaning it runs along the vertical axis
     *
     * @param element the element to check
     * @returns true if the text is turned
     */
    private isTurned(element: LayoutElement): boolean {
        const direction = element.styles.direction as TextDirection | undefined;
        return direction != undefined && direction !== TextDirection.Horizontal;
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}

/**
 * The direction a text runs in
 */
export enum TextDirection {
    /**
     * The ordinary case, reading left to right
     */
    Horizontal = "horizontal",
    /**
     * Turned a quarter clockwise, reading top to bottom
     */
    Clockwise = "clockwise",
    /**
     * Turned a quarter counter-clockwise, reading bottom to top.
     * This is what a header on the left edge of a lane conventionally uses.
     */
    CounterClockwise = "counterclockwise"
}

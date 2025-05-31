import type { Element, Line, Point, Size } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { BoxContentConstraint, type BoxOutlinePart } from "./boxLayoutConfig.js";
import { BoxLayoutConfig } from "./boxLayoutConfig.js";

/**
 * Layout config for hbox
 */
export class HBoxLayoutConfig extends BoxLayoutConfig {
    override type = "hbox";

    constructor() {
        super();
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            const contentConstraints: SizeConstraints = {
                min: {
                    width: 0,
                    height: constraints.min.height
                },
                max: {
                    width: constraints.max.width,
                    height: constraints.max.height
                }
            };
            const boxConstraints = this.createBoxConstraints(layout, contents, contentConstraints);
            const lengths = this.computePrimaryAxisLengths(
                boxConstraints,
                constraints.min.width,
                constraints.max.width
            );
            const size = this.computeFinalDimensions(layout, contents, lengths, contentConstraints, constraints);
            element.hboxLayout = {
                boxConstraints,
                lengths,
                width: size.width
            };
            return size;
        } else {
            return constraints.min;
        }
    }

    /**
     * Creates box content constraints for all child elements.
     *
     * @param layout The layout engine
     * @param contents Child elements to create constraints for
     * @param contentConstraints Size constraints to apply to each child
     * @returns Array of box content constraints
     */
    private createBoxConstraints(
        layout: Layout,
        contents: LayoutElement[],
        contentConstraints: SizeConstraints
    ): BoxContentConstraint[] {
        const boxConstraints: BoxContentConstraint[] = [];
        for (const content of contents) {
            let base = content.styles.base;
            let sizeConstraints: SizeConstraints;
            if (base != undefined && base >= 0) {
                sizeConstraints = layout.computeSizeConstraints(content, contentConstraints);
            } else {
                const measuredSize = layout.measure(content, contentConstraints);
                base = measuredSize.width;
                sizeConstraints = content.sizeConstraints!;
            }
            boxConstraints.push(
                BoxContentConstraint.create(
                    sizeConstraints.min.width,
                    sizeConstraints.max.width,
                    base,
                    content.styles.grow ?? 0,
                    content.styles.shrink ?? 0
                )
            );
        }
        return boxConstraints;
    }

    /**
     * Computes the final dimensions and layout data for the hbox element.
     *
     * @param layout The layout engine
     * @param contents Child elements
     * @param lengths Computed primary axis lengths for each child
     * @param contentConstraints Size constraints for child elements
     * @param constraints Overall size constraints
     * @returns Final size of the hbox element
     */
    private computeFinalDimensions(
        layout: Layout,
        contents: LayoutElement[],
        lengths: number[],
        contentConstraints: SizeConstraints,
        constraints: SizeConstraints
    ): Size {
        let width = 0;
        let height = 0;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const length = lengths[i];
            width += length;
            if (content.measuredSize?.width !== length) {
                const measuredSize = layout.measure(content, {
                    min: contentConstraints.min,
                    max: {
                        width: length,
                        height: constraints.max.height
                    }
                });
                height = Math.max(height, measuredSize.height);
            }
            height = Math.max(height, content.measuredSize!.height);
        }

        return { width, height };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size): Element[] {
        let lengths: number[];
        if (element.hboxLayout.width === size.width) {
            lengths = element.hboxLayout.lengths;
        } else {
            lengths = this.computePrimaryAxisLengths(element.hboxLayout.boxConstraints, size.width, size.width);
        }
        const elements: Element[] = [];
        const contents = element.children;
        let dx = 0;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const contentSize = {
                width: lengths[i],
                height: size.height
            };
            const x = position.x + dx;
            elements.push(...layout.layout(content, { x, y: position.y }, contentSize));
            dx += contentSize.width;
        }
        return elements;
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const contents = element.children;
        if (contents.length < 2) {
            return super.outline(layout, element, position, size, id);
        }
        const parts: BoxOutlinePart[] = contents.map((content) => {
            const bounds = content.layoutBounds!;
            return {
                primaryOffset: bounds.position.x,
                secondaryOffset: bounds.position.y,
                primaryLength: bounds.size.width,
                secondaryLength: bounds.size.height
            };
        });
        return this.computeOutlineFromParts(parts, id, (primary, secondary) => ({ x: primary, y: secondary }));
    }
}

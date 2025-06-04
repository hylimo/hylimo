import type { Element, Line, Point, Size } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { BoxContentConstraint, type BoxOutlinePart } from "./boxLayoutConfig.js";
import { BoxLayoutConfig } from "./boxLayoutConfig.js";

/**
 * Layout config for vbox
 */
export class VBoxLayoutConfig extends BoxLayoutConfig {
    override type = "vbox";

    constructor() {
        super();
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            const contentConstraints: SizeConstraints = {
                min: {
                    width: constraints.min.width,
                    height: 0
                },
                max: {
                    width: constraints.max.width,
                    height: constraints.max.height
                }
            };
            const boxConstraints = this.createBoxConstraints(layout, contents, contentConstraints);
            const lengths = this.computePrimaryAxisLengths(
                boxConstraints,
                constraints.min.height,
                constraints.max.height
            );
            const size = this.computeFinalDimensions(layout, contents, lengths, contentConstraints, constraints);
            element.vboxLayout = {
                boxConstraints,
                lengths,
                height: size.height
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
                base = measuredSize.height;
                sizeConstraints = content.sizeConstraints!;
            }
            boxConstraints.push(
                BoxContentConstraint.create(
                    sizeConstraints.min.height,
                    sizeConstraints.max.height,
                    base,
                    content.styles.grow ?? 0,
                    content.styles.shrink ?? 0
                )
            );
        }
        return boxConstraints;
    }

    /**
     * Computes the final dimensions and layout data for the vbox element.
     *
     * @param layout The layout engine
     * @param contents Child elements
     * @param lengths Computed primary axis lengths for each child
     * @param contentConstraints Size constraints for child elements
     * @param constraints Overall size constraints
     * @returns Final size of the vbox element
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
            height += length;
            if (content.measuredSize?.height !== length) {
                const measuredSize = layout.measure(content, {
                    min: {
                        width: contentConstraints.min.width,
                        height: length
                    },
                    max: {
                        width: constraints.max.width,
                        height: length
                    }
                });
                width = Math.max(width, measuredSize.width);
            }
            width = Math.max(width, content.measuredSize!.width);
        }

        return { width, height };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size): Element[] {
        let lengths: number[];
        if (element.vboxLayout.height === size.height) {
            lengths = element.vboxLayout.lengths;
        } else {
            lengths = this.computePrimaryAxisLengths(element.vboxLayout.boxConstraints, size.height, size.height);
        }
        const elements: Element[] = [];
        const contents = element.children;
        let dy = 0;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const contentSize = {
                width: size.width,
                height: lengths[i]
            };
            const y = position.y + dy;
            elements.push(...layout.layout(content, { x: position.x, y }, contentSize));
            dy += contentSize.height;
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
                primaryOffset: bounds.position.y,
                secondaryOffset: bounds.position.x,
                primaryLength: bounds.size.height,
                secondaryLength: bounds.size.width
            };
        });
        return this.computeOutlineFromParts(parts, id, (primary, secondary) => ({ x: secondary, y: primary }));
    }
}

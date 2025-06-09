import type { InterpreterContext, FullObject } from "@hylimo/core";
import { assertString, nativeToList, RuntimeError, isNull, validateObject } from "@hylimo/core";
import type { Line, Point, Size } from "@hylimo/diagram-common";
import type { FontCollection } from "../font/fontCollection.js";
import type { LayoutElement, LayoutInformation, SizeConstraints, LayoutConfig } from "../layoutElement.js";
import { addToSize, matchToConstraints, HorizontalAlignment, VerticalAlignment, Visibility } from "../layoutElement.js";
import type { LayoutEngine } from "./layoutEngine.js";
import type { Element } from "@hylimo/diagram-common";
import { applyEdits } from "./edits.js";
import { CanvasLayoutEngine } from "./canvasLayoutEngine.js";
import type { StyleContext } from "./styles.js";
import { StyleEvaluator, StyleValueParser } from "./styles.js";

/**
 * Performs the layout, uses a layout engine to do so
 */

export class Layout {
    /**
     * Lookup for layout elements
     */
    readonly layoutElementLookup = new Map<string, LayoutElement>();

    /**
     * Lookup for layouted elements
     */
    readonly elementLookup: Record<string, Element> = {};

    /**
     * Lookop for element id based on syncscript object
     */
    readonly elementIdLookup: Map<FullObject, string> = new Map();

    /**
     * Counter to provide child ids
     * Should be probed with `${parentId}_${idGroup}`
     */
    private readonly elementIdCounter: Map<string, number> = new Map();

    /**
     * Canvas layout engine to layout all canvases
     */
    readonly layoutEngine = new CanvasLayoutEngine(this);

    /**
     * Style evaluator handling style matching and parsing
     */
    private readonly styleEvaluator: StyleEvaluator;

    /**
     * Creates a new layout
     *
     * @param engine the engine which provides fonts
     * @param styles styles to possibly apply to elements
     * @param fonts fonts to use
     * @param defaultFontFamily the default font to use
     * @param context the interpreter context to use for computing styles
     */
    constructor(
        readonly engine: LayoutEngine,
        readonly styles: FullObject,
        readonly fonts: FontCollection,
        readonly defaultFontFamily: string,
        readonly context: InterpreterContext
    ) {
        this.styleEvaluator = new StyleEvaluator(styles);
    }

    /**
     * Computes the styles based on the provided element
     *
     * @param layoutElement the layout element where the styles should be updated
     * @param matchingStyles the styles which match the element
     */
    private applyStyles(layoutElement: LayoutElement, matchingStyles: StyleContext[]): void {
        const styleAttributes = layoutElement.layoutConfig.styleAttributes;
        const styleValueParser = new StyleValueParser(matchingStyles, this.context);
        const styles: Record<string, any> = {};
        for (const attributeConfig of styleAttributes) {
            const name = attributeConfig.name;
            const elementValue = layoutElement.element.getSelfField(name, this.context).value;
            if (!isNull(elementValue)) {
                styles[name] = elementValue.toNative();
            } else {
                const styleValue = styleValueParser.getValue(name);
                if (styleValue != undefined) {
                    layoutElement.element.setSelfLocalField(name, styleValue, this.context);
                    styles[name] = layoutElement.element.getSelfField(name, this.context)?.value?.toNative();
                }
            }
        }
        layoutElement.styles = styles;
    }

    /**
     * Sets the visibility of an element based on its styles and parent visibility
     *
     * @param layoutElement the element to set the visibility for
     */
    private applyVisibility(layoutElement: LayoutElement): void {
        layoutElement.isCollapsed =
            (layoutElement.parent?.isCollapsed ?? false) || layoutElement.styles.visibility == Visibility.COLLAPSE;
        layoutElement.isHidden =
            layoutElement.isCollapsed ||
            layoutElement.styles.visibility == Visibility.HIDDEN ||
            (layoutElement.parent?.isHidden ?? false);
    }

    /**
     * Computes the layout information based on styles
     *
     * @param style defines all required layout information
     * @returns the computed layout information
     */
    private computeLayoutInformation(style: { [key: string]: any }): LayoutInformation {
        return {
            marginTop: style.marginTop ?? style.margin ?? 0,
            marginBottom: style.marginBottom ?? style.margin ?? 0,
            marginLeft: style.marginLeft ?? style.margin ?? 0,
            marginRight: style.marginRight ?? style.margin ?? 0
        };
    }

    create(element: FullObject, parent: LayoutElement | undefined): LayoutElement {
        const type = assertString(element.getLocalFieldOrUndefined("type")!.value, "type");
        const cls = nativeToList(element.getLocalFieldOrUndefined("class")?.value?.toNative() ?? {});
        const layoutConfig = this.engine.layoutConfigs.get(type)!;
        const id = this.generateId(layoutConfig, parent);
        validateObject(element, this.context, [
            ...layoutConfig.attributes,
            ...layoutConfig.styleAttributes,
            ...layoutConfig.contentAttributes
        ]);
        const layoutElement: LayoutElement = {
            id,
            element,
            parent,
            children: [],
            styles: {},
            layoutConfig,
            class: new Set(cls),
            edits: {},
            isHidden: false,
            isCollapsed: false
        };
        this.elementIdLookup.set(element, id);
        this.layoutElementLookup.set(id, layoutElement);
        const matchingStyles = this.styleEvaluator.beginMatchStyles(layoutElement);
        this.applyStyles(layoutElement, matchingStyles);
        this.applyVisibility(layoutElement);
        applyEdits(layoutElement);
        layoutElement.children.push(
            ...layoutConfig.getChildren(layoutElement).map((child) => this.create(child, layoutElement))
        );
        const layoutInformation = this.computeLayoutInformation(layoutElement.styles);
        layoutElement.layoutInformation = layoutInformation;
        this.styleEvaluator.endMatchStyles();
        return layoutElement;
    }

    /**
     * Calls measure on the element and generates a LayoutElement for it.
     * computes the styles
     *
     * @param layoutElement the element to measure
     * @param constraints size constraitns required for measure
     * @returns the measured size
     */
    measure(layoutElement: LayoutElement, constraints: SizeConstraints): Size {
        const computedConstraints = this.computeSizeConstraints(layoutElement, constraints);
        if (layoutElement.isCollapsed) {
            const collapsedSize = { width: 0, height: 0 };
            layoutElement.layoutConfig.measure(this, layoutElement, computedConstraints);
            layoutElement.measuredSize = collapsedSize;
            layoutElement.requestedSize = collapsedSize;
            return collapsedSize;
        } else {
            const requestedSize = layoutElement.layoutConfig.measure(this, layoutElement, computedConstraints);
            const layoutInformation = layoutElement.layoutInformation!;
            const computedSize = addToSize(
                requestedSize,
                layoutInformation.marginLeft + layoutInformation.marginRight,
                layoutInformation.marginTop + layoutInformation.marginBottom
            );
            const realSize = matchToConstraints(computedSize, constraints);
            layoutElement.measuredSize = realSize;
            layoutElement.requestedSize = requestedSize;
            return realSize;
        }
    }

    /**
     * Computes the size constraints for an element and the provided constraints.
     * Also uses the styles of the element to further limit the constraints.
     *
     * @param element the elements to compute the constraints for
     * @param constraints the constraints to use for the computation
     * @returns the computed size constraints
     */
    computeSizeConstraints(element: LayoutElement, constraints: SizeConstraints): SizeConstraints {
        let sizeConstraints: SizeConstraints;
        if (element.isCollapsed) {
            sizeConstraints = {
                min: { width: 0, height: 0 },
                max: { width: 0, height: 0 }
            };
        } else {
            sizeConstraints = this.computeVisibleSizeConstraints(element, constraints);
        }
        element.sizeConstraints = sizeConstraints;
        return sizeConstraints;
    }

    /**
     * Computes the size constraints for a visible (non-collapsed) element.
     *
     * @param element the elements to compute the constraints for
     * @param constraints the constraints to use for the computation
     * @returns the computed size constraints for the visible element
     */
    private computeVisibleSizeConstraints(element: LayoutElement, constraints: SizeConstraints): SizeConstraints {
        const styles = element.styles;
        const layoutInformation = element.layoutInformation!;
        const marginX = layoutInformation.marginLeft + layoutInformation.marginRight;
        const marginY = layoutInformation.marginTop + layoutInformation.marginBottom;
        let minWidth = 0;
        let minHeight = 0;
        if (styles.hAlign == undefined) {
            minWidth = constraints.min.width - marginX;
        }
        if (styles.vAlign == undefined) {
            minHeight = constraints.min.height - marginY;
        }
        const maxWidth = Math.max(
            styles.width ?? Math.min(styles.maxWidth ?? Number.POSITIVE_INFINITY, constraints.max.width - marginX),
            0
        );
        const maxHeight = Math.max(
            styles.height ?? Math.min(styles.maxHeight ?? Number.POSITIVE_INFINITY, constraints.max.height - marginY),
            0
        );
        return {
            min: {
                width: Math.max(styles.width ?? Math.min(Math.max(styles.minWidth ?? 0, minWidth), maxWidth), 0),
                height: Math.max(styles.height ?? Math.min(Math.max(styles.minHeight ?? 0, minHeight), maxHeight), 0)
            },
            max: {
                width: maxWidth,
                height: maxHeight
            }
        };
    }

    /**
     * Generates a new id based on the parent element
     *
     * @param layoutConfig the layout config of the element
     * @param parent the parent element
     * @returns the generated id
     */
    private generateId(layoutConfig: LayoutConfig, parent: LayoutElement | undefined): string {
        const parentIdWithGroup = parent == undefined ? layoutConfig.idGroup : `${parent.id}_${layoutConfig.idGroup}`;
        const counter = this.elementIdCounter.get(parentIdWithGroup) ?? 0;
        const id = parentIdWithGroup + counter;
        this.elementIdCounter.set(parentIdWithGroup, counter + 1);
        return id;
    }

    /**
     * Layouts an element, handles margin, alignment, min, max and absolute size
     *
     * @param element the element to layout
     * @param position the position of the element
     * @param size the size of the element
     * @returns the layouted element
     */
    layout(element: LayoutElement, position: Point, size: Size): Element[] {
        const styles = element.styles;

        const layoutInformation = element.layoutInformation!;

        const { x, width } = this.layoutX(styles, layoutInformation, element, size, position);
        const { y, height } = this.layoutY(styles, layoutInformation, element, size, position);

        const bounds = {
            position: { x, y },
            size: { width, height }
        };
        element.layoutBounds = bounds;
        const results = element.layoutConfig.layout(this, element, bounds.position, bounds.size, element.id);
        results.forEach((result) => {
            this.elementLookup[result.id] = result;
        });
        return results;
    }

    /**
     * Layouts an element in the x direction. Computes the x coordinate and the width of the element.
     *
     * @param styles styles providing alignment, min/max width and absolute width
     * @param layoutInformation layout information providing margin
     * @param element the element to layout
     * @param size the size of the element
     * @param position the position of the element
     * @returns the computed x coordinate and width
     */
    private layoutX(
        styles: Record<string, any>,
        layoutInformation: LayoutInformation,
        element: LayoutElement,
        size: Size,
        position: Point
    ): { x: number; width: number } {
        if (element.isCollapsed) {
            return { x: position.x, width: 0 };
        }
        const horizontalAlignment = styles.hAlign;
        const marginX = layoutInformation.marginLeft + layoutInformation.marginRight;
        let width = element.requestedSize!.width;
        if (!horizontalAlignment) {
            width = Math.max(width, size.width - marginX);
        }
        let x = position.x;
        if (styles.minWidth != undefined) {
            width = Math.max(width, styles.minWidth);
        }
        if (styles.maxWidth != undefined) {
            width = Math.min(width, styles.maxWidth);
        }
        if (styles.width != undefined) {
            width = styles.width;
        }
        if (element.size?.width != undefined) {
            width = element.size.width;
        }
        if (horizontalAlignment === HorizontalAlignment.RIGHT) {
            x += size.width - (width + layoutInformation.marginRight);
        } else if (horizontalAlignment === HorizontalAlignment.CENTER) {
            x += (size.width - width) / 2;
        } else {
            x += layoutInformation.marginLeft;
        }
        return { x, width };
    }

    /**
     * Layouts an element in the y direction. Computes the y coordinate and the height of the element.
     *
     * @param styles styles providing alignment, min/max height and absolute height
     * @param layoutInformation layout information providing margin
     * @param element the element to layout
     * @param size the size of the element
     * @param position the position of the element
     * @returns the computed y coordinate and height
     */
    private layoutY(
        styles: Record<string, any>,
        layoutInformation: LayoutInformation,
        element: LayoutElement,
        size: Size,
        position: Point
    ): { y: number; height: number } {
        if (element.isCollapsed) {
            return { y: position.y, height: 0 };
        }
        const verticalAlignment = styles.vAlign;
        const marginY = layoutInformation.marginTop + layoutInformation.marginBottom;
        let height = element.requestedSize!.height;
        if (!verticalAlignment) {
            height = Math.max(height, size.height - marginY);
        }
        let y = position.y;
        if (styles.minHeight != undefined) {
            height = Math.max(height, styles.minHeight);
        }
        if (styles.maxHeight != undefined) {
            height = Math.min(height, styles.maxHeight);
        }
        if (styles.height != undefined) {
            height = styles.height;
        }
        if (element.size?.height != undefined) {
            height = element.size.height;
        }
        if (verticalAlignment === VerticalAlignment.BOTTOM) {
            y += size.height - (height + layoutInformation.marginBottom);
        } else if (verticalAlignment === VerticalAlignment.CENTER) {
            y += (size.height - height) / 2;
        } else {
            y += layoutInformation.marginTop;
        }
        return { y, height };
    }

    /**
     * Create the outline of an element
     * Requires that the element has been measured and layouted
     *
     * @param element the element to get the outline of
     * @returns the outline of the element
     */
    outline(element: LayoutElement): Line {
        return element.layoutConfig.outline(
            this,
            element,
            element.layoutBounds!.position,
            element.layoutBounds!.size,
            element.id
        );
    }

    /**
     * Gets the id of an element
     *
     * @param element the element to get the id of
     * @returns the id of the content element
     */
    getElementId(element: FullObject): string {
        const elementId = this.elementIdLookup.get(element);
        if (!elementId) {
            throw new RuntimeError(`Could not find ID of the element. Did you register ${element} in the canvas?`);
        }
        return elementId;
    }

    /**
     * Checks if an element is a child of another element
     *
     * @param parent the potential parent element
     * @param child the potential child element
     * @returns true if the child is a child of the parent, otherwise false
     */
    isChildElement(parent: LayoutElement, child: LayoutElement): boolean {
        let currentElement: LayoutElement | undefined = child;
        while (currentElement != undefined) {
            if (currentElement === parent) {
                return true;
            }
            currentElement = currentElement.parent;
        }
        return false;
    }
}

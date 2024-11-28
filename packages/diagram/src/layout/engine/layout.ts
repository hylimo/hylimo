import { assertString, BaseObject, FullObject, nativeToList, RuntimeError } from "@hylimo/core";
import { Element, Line, Point, Size } from "@hylimo/diagram-common";
import { FontCollection } from "../../font/fontCollection.js";
import { FontFamily } from "../../font/fontFamily.js";
import { Selector, SelectorType, Style, StyleList } from "../../styles.js";
import {
    addToSize,
    HorizontalAlignment,
    LayoutElement,
    LayoutInformation,
    matchToConstraints,
    SizeConstraints,
    VerticalAlignment
} from "../layoutElement.js";
import { LayoutEngine } from "./layoutEngine.js";
import { generateEdits } from "./edits.js";
import { CanvasLayoutEngine } from "./canvasLayoutEngine.js";

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
     */
    private readonly elementIdCounter: Map<string, number> = new Map();

    /**
     * Canvas layout engine to layout all canvases
     */
    readonly layoutEngine = new CanvasLayoutEngine(this);

    /**
     * Creates a new layout
     *
     * @param engine the engine which provides fonts
     * @param styles styles to possibly apply to elements
     * @param fonts fonts to use
     * @param defaultFont the default font to use
     */
    constructor(
        readonly engine: LayoutEngine,
        readonly styles: StyleList,
        readonly fonts: FontCollection,
        readonly defaultFont: FontFamily
    ) {}

    /**
     * Checks if an element matches a selector
     * @param element the element to check
     * @param selector the selector to check
     * @returns true if the element matches the selector, otherwise false
     */
    private matchesSelector(element: LayoutElement, selector: Selector): boolean {
        if (selector.type === SelectorType.CLASS) {
            return element.class.has(selector.value);
        } else if (selector.type === SelectorType.TYPE) {
            return element.layoutConfig.type === selector.value;
        }
        return selector.type === SelectorType.ANY;
    }

    /**
     * Checks if a style should be applied to an element
     *
     * @param element the element to which the style may be applied
     * @param style the style to check
     * @returns true if the style should be applied
     */
    private matchesStyle(element: LayoutElement, style: Style): boolean {
        let currentElement: LayoutElement | undefined = element;
        const initialElementIndex = style.selectorChain.length - 1;
        let i = initialElementIndex;

        while (currentElement) {
            if (this.matchesSelector(currentElement, style.selectorChain[i])) {
                i--;
                if (i < 0) {
                    return true;
                }
            } else if (i == initialElementIndex) {
                return false;
            }
            currentElement = currentElement.parent;
        }
        return false;
    }

    /**
     * Updates the styles of the provided layoutElement
     *
     * @param layoutElement the layout element where the styles should be updated
     */
    private applyStyles(layoutElement: LayoutElement): void {
        const styleAttributes = layoutElement.layoutConfig.styleAttributes;
        const matchingStyles: FullObject[] = [];
        for (const style of this.styles.styles) {
            if (this.matchesStyle(layoutElement, style)) {
                matchingStyles.push(style.fields);
            }
        }
        matchingStyles.push(layoutElement.element);
        matchingStyles.reverse();
        const styles: Record<string, any> = {};
        for (const attributeConfig of styleAttributes) {
            const attribute = attributeConfig.name;
            for (const style of matchingStyles) {
                const entry = style.getLocalFieldOrUndefined(attribute);
                if (entry != undefined) {
                    styles[attribute] = this.applyStyle(entry.value, matchingStyles);
                    break;
                }
            }
        }
        layoutElement.styles = layoutElement.layoutConfig.postprocessStyles(layoutElement, styles);
    }

    /**
     * Applies a style rule to an element
     * The value can either be a primitive value, a variable reference, or unset
     *
     * @param value the value to set the attribute to
     * @param matchingStyles matching styles to extract variable values from
     */
    private applyStyle(value: BaseObject, matchingStyles: FullObject[]): any {
        const parsedValue = value.toNative();
        if (typeof value === "object" && typeof parsedValue._type === "string") {
            if (parsedValue._type === "unset") {
                return undefined;
            } else if (parsedValue._type === "var") {
                return this.extractVariableValue(matchingStyles, parsedValue.name);
            } else {
                throw new Error(`Unknown style value: ${value}`);
            }
        } else {
            return parsedValue;
        }
    }

    /**
     * Extracts a variable value from all matching styles
     *
     * @param matchingStyles the matching styles
     * @param name the name of the variable
     * @returns the value of the variable. if not found, undefined is returned
     */
    private extractVariableValue(matchingStyles: FullObject[], name: string): any {
        for (const style of matchingStyles) {
            const variables = style.getLocalFieldOrUndefined("variables")?.value;
            if (variables instanceof FullObject) {
                const entry = variables.getLocalFieldOrUndefined(name);
                if (entry != undefined) {
                    return this.parseVariableValue(entry.value);
                }
            }
        }
        return undefined;
    }

    /**
     * Parses a variable value
     *
     * @param value the value to parse
     * @returns the parsed value
     */
    private parseVariableValue(value: BaseObject): any {
        const parsedValue = value.toNative();
        if (typeof parsedValue === "object" && typeof parsedValue._type === "string") {
            if (parsedValue._type === "unset") {
                return undefined;
            } else if (parsedValue._type === "var") {
                throw new Error("Variables cannot be set to other variables");
            } else {
                throw new Error(`Unknown style value: ${parsedValue}`);
            }
        } else {
            return parsedValue;
        }
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

    /**
     * Calls measure on the element and generates a LayoutElement for it.
     * computes the styles
     *
     * @param element the element to measure
     * @param parent the parent element if existing
     * @param constraints size constraitns required for measure
     * @returns the generated LayoutElement
     */
    measure(element: FullObject, parent: LayoutElement | undefined, constraints: SizeConstraints): LayoutElement {
        const type = assertString(element.getLocalFieldOrUndefined("type")!.value, "type");
        const cls = nativeToList(element.getLocalFieldOrUndefined("class")?.value?.toNative() ?? {});
        const id = this.generateId(parent);
        const layoutElement: LayoutElement = {
            id,
            element,
            parent,
            styles: {},
            layoutConfig: this.engine.layoutConfigs.get(type)!,
            class: new Set(cls),
            edits: generateEdits(element)
        };
        this.elementIdLookup.set(element, id);
        this.layoutElementLookup.set(id, layoutElement);
        this.applyStyles(layoutElement);
        const styles = layoutElement.styles;
        const layoutInformation = this.computeLayoutInformation(layoutElement.styles);
        layoutElement.layoutInformation = layoutInformation;
        const marginX = layoutInformation.marginLeft + layoutInformation.marginRight;
        const marginY = layoutInformation.marginTop + layoutInformation.marginBottom;
        const computedConstraints = this.computeSizeConstraints(styles, constraints, marginX, marginY);
        const requestedSize = layoutElement.layoutConfig.measure(this, layoutElement, computedConstraints);
        const computedSize = addToSize(requestedSize, marginX, marginY);
        const realSize = matchToConstraints(computedSize, constraints);
        layoutElement.measuredSize = realSize;
        layoutElement.requestedSize = requestedSize;
        return layoutElement;
    }

    /**
     * Generates a new id based on the parent element
     *
     * @param parent the parent element
     * @returns the generated id
     */
    private generateId(parent: LayoutElement | undefined): string {
        const parentId = parent?.id ?? "";
        const counter = this.elementIdCounter.get(parentId) ?? 0;
        const id = `${parentId}_${counter}`;
        this.elementIdCounter.set(parentId, counter + 1);
        return id;
    }

    /**
     * Computes size constraints for measure based on the provided styles and margin, and the constraints.
     *
     * @param styles styles providing min/max width/height
     * @param constraints constraints to further limit
     * @param marginX margin in x direction
     * @param marginY margin in y direction
     * @returns the computed size constraints
     */
    private computeSizeConstraints(
        styles: Record<string, any>,
        constraints: SizeConstraints,
        marginX: number,
        marginY: number
    ): SizeConstraints {
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
}

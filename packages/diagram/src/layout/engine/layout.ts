import {
    FullObject,
    assertString,
    nativeToList,
    RuntimeError,
    InterpreterContext,
    isObject,
    LabeledValue,
    isNull,
    ExecutableConstExpression
} from "@hylimo/core";
import { Line, Point, Size } from "@hylimo/diagram-common";
import { FontCollection } from "../font/fontCollection.js";
import { StyleList, Selector, SelectorType, Style } from "../../styles.js";
import {
    LayoutElement,
    LayoutInformation,
    SizeConstraints,
    addToSize,
    matchToConstraints,
    HorizontalAlignment,
    VerticalAlignment
} from "../layoutElement.js";
import { LayoutEngine } from "./layoutEngine.js";
import { Element } from "@hylimo/diagram-common";
import { applyEdits } from "./edits.js";
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
     * @param defaultFontFamily the default font to use
     * @param context the interpreter context to use for computing styles
     */
    constructor(
        readonly engine: LayoutEngine,
        readonly styles: StyleList,
        readonly fonts: FontCollection,
        readonly defaultFontFamily: string,
        readonly context: InterpreterContext
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
     * Computes the styles based on the provided element
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
        matchingStyles.reverse();
        const styleValueParser = new StyleValueParser(matchingStyles, this.context);
        const styles: Record<string, any> = {};
        for (const attributeConfig of styleAttributes) {
            const name = attributeConfig.name;
            const elementValue = layoutElement.element.getField(name, this.context)?.value;
            if (elementValue != undefined && !isNull(elementValue)) {
                styles[name] = elementValue.toNative();
            }
            const styleValue = styleValueParser.getValue(name);
            if (styleValue != undefined) {
                layoutElement.element.setField(name, styleValue, this.context);
                styles[name] = layoutElement.element.getField(name, this.context)?.value?.toNative();
            }
        }
        layoutElement.styles = styles;
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
        const id = this.generateId(parent);
        const layoutConfig = this.engine.layoutConfigs.get(type)!;
        const layoutElement: LayoutElement = {
            id,
            element,
            parent,
            children: [],
            styles: {},
            layoutConfig,
            class: new Set(cls),
            edits: {}
        };
        layoutElement.children.push(
            ...layoutConfig.getChildren(layoutElement).map((child) => this.create(child, layoutElement))
        );
        this.elementIdLookup.set(element, id);
        this.layoutElementLookup.set(id, layoutElement);
        this.applyStyles(layoutElement);
        applyEdits(layoutElement);
        const layoutInformation = this.computeLayoutInformation(layoutElement.styles);
        layoutElement.layoutInformation = layoutInformation;
        return layoutElement;
    }

    /**
     * Calls measure on the element and generates a LayoutElement for it.
     * computes the styles
     *
     * @param layoutElement the element to measure
     * @param constraints size constraitns required for measure
     * @returns the generated LayoutElement
     */
    measure(layoutElement: LayoutElement, constraints: SizeConstraints): LayoutElement {
        const styles = layoutElement.styles;
        const layoutInformation = layoutElement.layoutInformation!;
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
     * @param id the id of the element
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
            throw new RuntimeError("Id of element not found");
        }
        return elementId;
    }
}

/**
 * Helper class to get style values from a set of matching style objects
 */
class StyleValueParser {
    /**
     * Cached variable values
     * During computation, a variable value is set to null to detect circular dependencies
     */
    private readonly variableValues = new Map<string, LabeledValue | null>();

    /**
     * All variable objects from the matching styles
     */
    private readonly variables: FullObject[];

    /**
     * Creates a new style value parser
     *
     * @param matchingStyles all matching styles
     * @param context the context to use for variable resolution
     */
    constructor(
        readonly matchingStyles: FullObject[],
        readonly context: InterpreterContext
    ) {
        this.variables = matchingStyles
            .map((style) => style.getLocalFieldOrUndefined("variables")?.value)
            .filter((variables) => variables instanceof FullObject);
    }

    /**
     * Gets the value of a style attribute
     *
     * @param name the name of the attribute
     * @returns the value of the attribute, undefined if none of the matching styles provides the attribute
     */
    getValue(name: string): LabeledValue | undefined {
        for (const style of this.matchingStyles) {
            const value = style.getLocalFieldOrUndefined(name);
            if (value != undefined) {
                return this.parse(value);
            }
        }
        return undefined;
    }

    /**
     * Parses a labeled value, resolving calc, var and unset special values
     *
     * @param labeledValue the labeled value to parse
     * @returns the parsed labeled value
     */
    private parse(labeledValue: LabeledValue): LabeledValue {
        const value = labeledValue.value;
        if (!isObject(value)) {
            return labeledValue;
        }
        const type = value.getLocalFieldOrUndefined("_type")?.value?.toNative();
        if (type == undefined) {
            return labeledValue;
        }
        if (type === "unset") {
            return { value: this.context.null };
        } else if (type === "var") {
            const variableName = value.getLocalFieldOrUndefined("name")?.value?.toNative();
            return this.getVariableValue(variableName);
        } else if (type === "calc") {
            const operator = value.getLocalField("operator", this.context).value;
            const result = operator.invoke(
                [
                    { value: new ExecutableConstExpression(this.parse(value.getLocalField("left", this.context))) },
                    { value: new ExecutableConstExpression(this.parse(value.getLocalField("right", this.context))) }
                ],
                this.context
            );
            return { value: result.value, source: labeledValue.source };
        } else {
            throw new Error(`Unknown style value type: ${type}`);
        }
    }

    /**
     * Gets the value of a variable
     *
     * @param name the name of the variable
     * @returns the value of the variable
     */
    private getVariableValue(name: string): LabeledValue {
        const variableValue = this.variableValues.get(name);
        if (variableValue != undefined) {
            return variableValue;
        }
        if (variableValue === null) {
            throw new Error(`Circular dependency while evaluating variable ${name}`);
        }
        this.variableValues.set(name, null);
        for (const variables of this.variables) {
            const entry = variables.getLocalFieldOrUndefined(name);
            if (entry != undefined) {
                const value = this.parse(entry);
                this.variableValues.set(name, value);
                return value;
            }
        }
        return { value: this.context.null };
    }
}

import {
    FullObject,
    assertString,
    nativeToList,
    assertObject,
    SemanticFieldNames,
    isNull,
    BaseObject,
    isString,
    assertNumber,
    isWrapperObject,
    Expression,
    assertWrapperObject,
    FunctionExpression,
    AbstractInvocationExpression,
    ParenthesisExpressionMetadata,
    ListEntry,
    Range,
    RuntimeError
} from "@hylimo/core";
import {
    Point,
    Size,
    EditSpecification,
    TemplateEntry,
    EditSpecificationEntry,
    ReplaceEditSpecificationEntry,
    AddEditSpecificationEntry,
    AddArgEditSpecificationEntry
} from "@hylimo/diagram-common";
import { FontCollection } from "../../font/fontCollection.js";
import { FontFamily } from "../../font/fontFamily.js";
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
        } else if (selector.type === SelectorType.ANY) {
            return true;
        } else {
            return false;
        }
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
                    const value = entry.value.toNative();
                    if (typeof value === "object" && typeof value._type === "string") {
                        if (value._type === "unset") {
                            styles[attribute] = undefined;
                        } else if (value._type === "var") {
                            const variableValue = this.extractVariableValue(matchingStyles, value.name);
                            styles[attribute] = variableValue;
                        } else {
                            throw new Error(`Unknown style value: ${value}`);
                        }
                    } else {
                        styles[attribute] = value;
                    }
                    break;
                }
            }
        }
        layoutElement.styles = layoutElement.layoutConfig.postprocessStyles(layoutElement, styles);
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
                    const value = entry.value.toNative();
                    if (typeof value === "object" && typeof value._type === "string") {
                        if (value._type === "unset") {
                            return undefined;
                        } else if (value._type === "var") {
                            throw new Error("Variables cannot be set to other variables");
                        } else {
                            throw new Error(`Unknown style value: ${value}`);
                        }
                    } else {
                        return value;
                    }
                }
            }
        }
        return undefined;
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
            edits: this.generateEdits(element)
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
        return {
            min: {
                width: Math.max(styles.width ?? Math.max(styles.minWidth ?? 0, minWidth), 0),
                height: Math.max(styles.height ?? Math.max(styles.minHeight ?? 0, minHeight), 0)
            },
            max: {
                width: Math.max(
                    styles.width ??
                        Math.min(styles.maxWidth ?? Number.POSITIVE_INFINITY, constraints.max.width - marginX),
                    0
                ),
                height: Math.max(
                    styles.height ??
                        Math.min(styles.maxHeight ?? Number.POSITIVE_INFINITY, constraints.max.height - marginY),
                    0
                )
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
        results.forEach((result) => (this.elementLookup[result.id] = result));
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
     * Converts the element to a EditSpecification
     *
     * @param expressions expression with associated key
     * @returns the generated EditSpecification
     */
    private generateEdits(element: FullObject): EditSpecification {
        const edits = element.getLocalFieldOrUndefined("edits")!.value;
        assertObject(edits);
        const res: EditSpecification = {};
        for (const [key, { value }] of edits.fields.entries()) {
            if (key != SemanticFieldNames.PROTO && !isNull(value)) {
                assertObject(value);
                const type = assertString(value.getLocalFieldOrUndefined("type")!.value, "type");
                const template = value.getLocalFieldOrUndefined("template")!.value;
                const parsedTemplate: TemplateEntry[] = this.parseTemplate(template);
                const target = value.getLocalFieldOrUndefined("target")!.value;
                res[key] = this.generateEditSpecificationEntry(target, type, parsedTemplate, value);
            }
        }
        return res;
    }

    /**
     * Parses a template used in an edit
     *
     * @param template the template to parse
     * @returns the parsed template
     */
    private parseTemplate(template: BaseObject): TemplateEntry[] {
        if (isString(template)) {
            return [template.value];
        }
        assertObject(template);
        const parsedTemplate: TemplateEntry[] = [];
        const length = assertNumber(template.getLocalFieldOrUndefined("length")!.value);
        for (let i = 0; i < length; i++) {
            const entry = template.getLocalFieldOrUndefined(i)!.value;
            if (isString(entry)) {
                parsedTemplate.push(entry.value);
            } else if (isWrapperObject(entry) && entry.wrapped instanceof Expression) {
                const expression = entry.wrapped as Expression;
                parsedTemplate.push({ range: expression.range });
            } else {
                throw new Error("Invalid template entry");
            }
        }
        return parsedTemplate;
    }

    /**
     * Generates an EditSpecificationEntry based on the provided target, type and parsed template
     *
     * @param target the target which is edited
     * @param type the type of the edit
     * @param parsedTemplate the parsed template
     * @returns the generated EditSpecificationEntry
     */
    private generateEditSpecificationEntry(
        target: BaseObject,
        type: string,
        parsedTemplate: TemplateEntry[],
        value: FullObject
    ): EditSpecificationEntry {
        assertWrapperObject(target);
        const targetExpression = target.wrapped as Expression;
        if (type === "add") {
            return this.generateAddEditSpecificationEntry(targetExpression, parsedTemplate);
        } else if (type == "add-arg") {
            return this.generateAddArgExitSpecificationEntry(value, targetExpression, parsedTemplate);
        } else if (type === "replace") {
            return {
                type,
                range: targetExpression.range,
                template: parsedTemplate
            } satisfies ReplaceEditSpecificationEntry;
        } else {
            throw new Error(`Unknown type ${type}`);
        }
    }

    /**
     * Generates an AddEditSpecificationEntry based on the provided target expression and parsed template
     *
     * @param targetExpression the target expression
     * @param parsedTemplate the parsed template
     * @returns the generated AddEditSpecificationEntry
     */
    private generateAddEditSpecificationEntry(
        targetExpression: Expression,
        parsedTemplate: TemplateEntry[]
    ): AddEditSpecificationEntry {
        if (!(targetExpression instanceof FunctionExpression)) {
            throw new Error("Target must be a function expression");
        }
        let rangeStart: number;
        if (targetExpression.expressions.length === 0) {
            rangeStart = targetExpression.range[0] + 1;
        } else {
            rangeStart = targetExpression.expressions[targetExpression.expressions.length - 1].range[1];
        }
        return {
            type: "add",
            range: [rangeStart, targetExpression.range[1]],
            functionRange: targetExpression.range,
            template: parsedTemplate
        };
    }

    /**
     * Generates an AddArgEditSpecificationEntry based on the provided value, target expression and parsed template
     *
     * @param value the original edit object
     * @param targetExpression the target expression
     * @param parsedTemplate the parsed template
     * @returns the generated AddArgEditSpecificationEntry
     */
    private generateAddArgExitSpecificationEntry(
        value: FullObject,
        targetExpression: Expression,
        parsedTemplate: TemplateEntry[]
    ): AddArgEditSpecificationEntry {
        const key = value.getLocalFieldOrUndefined("key")?.value?.toNative();
        if (typeof key !== "string" && typeof key !== "number") {
            throw new Error("Key must be a string or number");
        }
        if (!(targetExpression instanceof AbstractInvocationExpression)) {
            throw new Error("Target must be an invocation expression");
        }
        const listEntries = targetExpression.innerArgumentExpressions;
        const [targetPos, requiredPreceeding] = this.calculateAddArgPos(
            key,
            listEntries,
            targetExpression.trailingArgumentExpressions.length > 0
        );
        const parenthesisRange = (targetExpression.metadata as ParenthesisExpressionMetadata).parenthesisRange;
        const range = this.calculateAddArgRange(targetPos, listEntries, parenthesisRange);
        return {
            type: "add-arg",
            key,
            template: parsedTemplate,
            range,
            listRange: parenthesisRange,
            isFirst: targetPos <= 0,
            isLast: targetPos >= listEntries.length,
            requiredPreceeding
        };
    }

    /**
     * Calculates the range which should be replaced when inserting an argument
     *
     * @param targetPos the position where the argument should be inserted
     * @param listEntries the inner argument expressions
     * @param parenthesisRange the range of the whole parenthesis
     * @returns the range which should be replaced
     */
    private calculateAddArgRange(targetPos: number, listEntries: ListEntry[], parenthesisRange: Range): Range {
        if (targetPos <= 0) {
            if (listEntries.length === 0) {
                return parenthesisRange;
            } else {
                return [parenthesisRange[0], listEntries[0].value.range[0]];
            }
        } else if (targetPos >= listEntries.length) {
            return [listEntries.at(-1)!.value.range[1], parenthesisRange[1]];
        } else {
            return [listEntries[targetPos - 1].value.range[1], listEntries[targetPos].value.range[0]];
        }
    }

    /**
     * Calculates the position where an argument should be added.
     * Semantics: Index where the argument should be inserted (e.g. 0 for the first)
     *
     * @param key the key of the argument
     * @param listEntries the inner argument expressions
     * @param hasTrailingArg true if the call expression has a trailing argument
     * @returns the position where the argument should be added, and the amount of required before-inserted arguments
     */
    private calculateAddArgPos(
        key: string | number,
        listEntries: ListEntry[],
        hasTrailingArg: boolean
    ): [number, number | undefined] {
        if (typeof key === "string") {
            return [listEntries.length, undefined];
        }
        let foundIndexArgs = 0;
        let targetPos = 0;
        for (const entry of listEntries) {
            if (entry.name == undefined) {
                foundIndexArgs++;
            }
            if (foundIndexArgs >= key + 1) {
                break;
            }
            targetPos++;
        }
        if (key + 1 > foundIndexArgs && hasTrailingArg) {
            throw new Error("Cannot add argument after or in between trailing function expressions");
        }
        if (Number.isInteger(key) && key >= 0) {
            if (foundIndexArgs >= key + 1) {
                throw new Error("Cannot add argument at index " + key + " as it is already occupied");
            }
            return [targetPos, key - foundIndexArgs];
        } else {
            return [targetPos, undefined];
        }
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

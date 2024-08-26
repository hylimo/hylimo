import {
    AbstractInvocationExpression,
    assertNumber,
    assertObject,
    assertWrapperObject,
    BaseObject,
    Expression,
    FullObject,
    FunctionExpression,
    isNull,
    isString,
    isWrapperObject,
    nativeToList,
    ParenthesisExpressionMetadata,
    Range,
    SemanticFieldNames
} from "@hylimo/core";
import { assertString } from "@hylimo/core";
import {
    Element,
    Size,
    Point,
    Stroke,
    EditSpecification,
    TemplateEntry,
    EditSpecificationEntry,
    ReplaceEditSpecificationEntry,
    AddEditSpecificationEntry,
    AddArgEditSpecificationEntry
} from "@hylimo/diagram-common";
import { FontManager } from "../font/fontManager.js";
import { TextLayoutResult, TextLayouter } from "../font/textLayouter.js";
import { generateStyles, Selector, SelectorType, Style, StyleList } from "../styles.js";
import { LayoutedDiagram } from "./diagramLayoutResult.js";
import {
    addToSize,
    HorizontalAlignment,
    LayoutElement,
    LayoutConfig,
    LayoutInformation,
    matchToConstraints,
    SizeConstraints,
    VerticalAlignment
} from "./layoutElement.js";
import { layouts } from "./layouts.js";
import { FontCollection } from "../font/fontCollection.js";
import { LayoutCache } from "./layoutCache.js";
import { StretchMode } from "./elements/pathLayoutConfig.js";
import { FontFamily } from "../font/fontFamily.js";

/**
 * The amount of iterations which are cached
 */
const CACHE_TTL = 3;

/**
 * Key of the text cache
 */
interface TextCacheKey {
    /**
     * the max width provided to layout
     */
    maxWidth: number;
    /**
     * The styles of the spans the text consists of
     */
    spans: Record<string, any>[];
}

/**
 * Cache key for path layouting
 */
interface PathCacheKey {
    /**
     * The path to layout
     */
    path: string;
    /**
     * The stroke required for layouting
     */
    stroke: Stroke | undefined;
    /**
     * The size constraints
     */
    constraints: SizeConstraints;
    /**
     * The stretch mode
     */
    stretch: StretchMode;
}

/**
 * Cache entry of layouted paths
 */
export interface LayoutedPath {
    /**
     * The layouted path
     */
    path: string;
    /**
     * The size of the layouted path
     */
    size: Size;
}

/**
 * Performs layout, generates a model as a result
 */
export class LayoutEngine {
    /**
     * Lookup for layout configs
     */
    readonly layoutConfigs: Map<string, LayoutConfig> = new Map();

    /**
     * Used to get fonts
     */
    readonly fontManager = new FontManager();

    /**
     * Text layout engine
     */
    readonly textLayouter = new TextLayouter();

    /**
     * Cache used for text layouting
     */
    readonly textCache = new LayoutCache<TextCacheKey, TextLayoutResult>(CACHE_TTL);

    /**
     * Cache for path layouting
     */
    readonly pathCache = new LayoutCache<PathCacheKey, LayoutedPath>(CACHE_TTL);

    /**
     * Creates a new layout engine
     */
    constructor() {
        for (const config of layouts) {
            this.layoutConfigs.set(config.type, config);
        }
    }

    /**
     * Layouts a diagram defined using syncscript
     *
     * @param diagram the diagram to layout
     * @returns the layouted diagram
     */
    async layout(diagram: BaseObject): Promise<LayoutedDiagram> {
        this.assertDiagram(diagram);
        const nativeFonts = diagram.getLocalFieldOrUndefined("fonts")?.value?.toNative();
        let cacheMiss = false;
        const fontFamilies = await Promise.all(
            nativeToList(nativeFonts).map(async (config) => {
                const { fontFamily, cacheHit } = await this.fontManager.getFontFamily(config);
                cacheMiss = cacheMiss || !cacheHit;
                return fontFamily;
            })
        );
        if (cacheMiss) {
            this.textCache.clear();
        } else {
            this.textCache.nextIteration();
        }
        this.pathCache.nextIteration();
        const fontFamilyConfigs = fontFamilies.map((family) => family.config);
        const layout = new Layout(
            this,
            generateStyles(diagram.getLocalFieldOrUndefined("styles")?.value as FullObject),
            new FontCollection(fontFamilies),
            fontFamilies[0]
        );
        const layoutElement = layout.measure(
            diagram.getLocalFieldOrUndefined("element")?.value as FullObject,
            undefined,
            {
                min: {
                    width: 0,
                    height: 0
                },
                max: {
                    width: Number.POSITIVE_INFINITY,
                    height: Number.POSITIVE_INFINITY
                }
            }
        );
        const elements = layout.layout(layoutElement, Point.ORIGIN, layoutElement.measuredSize!, "0");
        return {
            rootElement: {
                type: "root",
                id: "root",
                children: elements,
                fonts: fontFamilyConfigs,
                edits: {}
            },
            elementLookup: layout.elementLookup,
            layoutElementLookup: layout.layoutElementLookup
        };
    }

    /**
     * Asserts that the provided diagram is a valid diagram
     *
     * @param diagram the diagram to check
     */
    private assertDiagram(diagram: BaseObject): asserts diagram is FullObject {
        if (!(diagram instanceof FullObject)) {
            throw new Error("A Diagram must be an Object");
        }
        if (!diagram.hasField("element") || !diagram.hasField("fonts") || !diagram.hasField("styles")) {
            throw new Error("A Diagram must have an element, fonts and styles fields");
        }
    }
}

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
        const layoutElement: LayoutElement = {
            element,
            parent,
            styles: {},
            layoutConfig: this.engine.layoutConfigs.get(type)!,
            class: new Set(cls),
            edits: this.generateEdits(element)
        };
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
    layout(element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const styles = element.styles;

        const layoutInformation = element.layoutInformation!;

        const { x, width } = this.layoutX(styles, layoutInformation, element, size, position);
        const { y, height } = this.layoutY(styles, layoutInformation, element, size, position);

        this.layoutElementLookup.set(id, element);

        const bounds = {
            position: { x, y },
            size: { width, height }
        };
        element.layoutBounds = bounds;
        const results = element.layoutConfig.layout(this, element, bounds.position, bounds.size, id);
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
            } else if (isWrapperObject(entry)) {
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
                type,
                range: [rangeStart, targetExpression.range[1]],
                functionRange: targetExpression.range,
                template: parsedTemplate
            } satisfies AddEditSpecificationEntry;
        } else if (type == "add-arg") {
            const key = value.getLocalFieldOrUndefined("key")?.value?.toNative();
            if (typeof key !== "string" && typeof key !== "number") {
                throw new Error("Key must be a string or number");
            }
            if (!(targetExpression instanceof AbstractInvocationExpression)) {
                throw new Error("Target must be an invocation expression");
            }
            const listEntries = targetExpression.innerArgumentExpressions;
            let targetPos = -1;
            if (typeof key === "string") {
                targetPos = listEntries.length;
            } else {
                let foundIndexArgs = 0;
                while (targetPos < listEntries.length && foundIndexArgs < key) {
                    if (listEntries[targetPos].name != undefined) {
                        foundIndexArgs++;
                    }
                    targetPos++;
                }
            }
            // TODO more extensive validation
            const parenthesisRange = (targetExpression.metadata as ParenthesisExpressionMetadata).parenthesisRange;
            let range: Range;
            if (targetPos < 0) {
                if (listEntries.length === 0) {
                    range = parenthesisRange;
                } else {
                    range = [parenthesisRange[0], listEntries[0].value.range[0]];
                }
            } else if (targetPos >= listEntries.length) {
                range = [listEntries.at(-1)!.value.range[1], parenthesisRange[1]];
            } else {
                range = [listEntries[targetPos].value.range[0], listEntries[targetPos].value.range[1]];
            }
            return {
                type,
                key,
                template: parsedTemplate,
                range,
                listRange: parenthesisRange,
                isFirst: targetPos < 0,
                isLast: targetPos >= listEntries.length
            } satisfies AddArgEditSpecificationEntry;
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
}

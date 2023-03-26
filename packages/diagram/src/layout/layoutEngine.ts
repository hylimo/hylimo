import { BaseObject, FieldEntry, FullObject, nativeToList } from "@hylimo/core";
import { assertString } from "@hylimo/core";
import { Element, Size, Point, FontFamily } from "@hylimo/diagram-common";
import { FontManager } from "../font/fontManager";
import { TextLayouter } from "../font/textLayouter";
import { generateStyles, Selector, SelectorType, Style, StyleList } from "../styles";
import { LayoutedDiagram } from "./diagramLayoutResult";
import {
    addToSize,
    HorizontalAlignment,
    LayoutElement,
    LayoutConfig,
    LayoutInformation,
    matchToConstraints,
    SizeConstraints,
    VerticalAlignment
} from "./layoutElement";
import { layouts } from "./layouts";
import { FontCollection } from "../font/fontCollection";

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
     */
    async layout(diagram: BaseObject): Promise<LayoutedDiagram> {
        this.assertDiagram(diagram);
        const nativeFonts = diagram.getLocalFieldOrUndefined("fonts")?.value?.toNative();
        const fontFamilies = await Promise.all(
            nativeToList(nativeFonts).map(async (config) => this.fontManager.getFontFamily(config))
        );
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
                fonts: fontFamilyConfigs
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
        for (const attributeConfig of styleAttributes) {
            const attribute = attributeConfig.name;
            for (const style of matchingStyles) {
                const entry = style.getLocalFieldOrUndefined(attribute);
                if (entry != undefined) {
                    const value = entry.value.toNative();
                    if (typeof value === "object" && typeof value._type === "string") {
                        if (value._type === "unset") {
                            layoutElement.styles[attribute] = undefined;
                            layoutElement.styleSources.set(attribute, entry);
                        } else if (value._type === "var") {
                            const [variableValue, variableSource] = this.extractVariableValue(
                                matchingStyles,
                                value.name
                            );
                            layoutElement.styles[attribute] = variableValue;
                            layoutElement.styleSources.set(attribute, variableSource ?? entry);
                        } else {
                            throw new Error(`Unknown style value: ${value}`);
                        }
                    } else {
                        layoutElement.styles[attribute] = value;
                        layoutElement.styleSources.set(attribute, entry);
                    }
                    break;
                }
            }
        }
    }

    /**
     * Extracts a variable value from all matching styles
     *
     * @param matchingStyles the matching styles
     * @param name the name of the variable
     * @returns the value and source of the variable. if not found, undefined is returned for both
     */
    private extractVariableValue(matchingStyles: FullObject[], name: string): [any, FieldEntry | undefined] {
        for (const style of matchingStyles) {
            const variables = style.getLocalFieldOrUndefined("variables")?.value;
            if (variables instanceof FullObject) {
                const entry = variables.getLocalFieldOrUndefined(name);
                if (entry != undefined) {
                    const value = entry.value.toNative();
                    if (typeof value === "object" && typeof value._type === "string") {
                        if (value._type === "unset") {
                            return [undefined, entry];
                        } else if (value._type === "var") {
                            throw new Error("Variables cannot be set to other variables");
                        } else {
                            throw new Error(`Unknown style value: ${value}`);
                        }
                    } else {
                        return [value, entry];
                    }
                }
            }
        }
        return [undefined, undefined];
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
            styleSources: new Map(),
            layoutConfig: this.engine.layoutConfigs.get(type)!,
            class: new Set(cls)
        };
        this.applyStyles(layoutElement);
        const styles = layoutElement.styles;
        const layoutInformation = this.computeLayoutInformation(layoutElement.styles);
        layoutElement.layoutInformation = layoutInformation;
        const marginX = layoutInformation.marginLeft + layoutInformation.marginRight;
        const marginY = layoutInformation.marginTop + layoutInformation.marginBottom;
        const computedConstraints: SizeConstraints = this.computeSizeConstraints(styles, constraints, marginX, marginY);
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
        return {
            min: {
                width: Math.max(styles.width ?? Math.max(styles.minWidth ?? 0, constraints.min.width - marginX), 0),
                height: Math.max(styles.height ?? Math.max(styles.minHeight ?? 0, constraints.min.height - marginY), 0)
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
        if (verticalAlignment === VerticalAlignment.BOTTOM) {
            y += size.height - (height + layoutInformation.marginBottom);
        } else if (verticalAlignment === VerticalAlignment.CENTER) {
            y += (size.height - height) / 2;
        } else {
            y += layoutInformation.marginTop;
        }
        return { y, height };
    }
}

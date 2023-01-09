import { FullObject, nativeToList } from "@hylimo/core";
import { assertString } from "@hylimo/core";
import { FontFamily } from "../../../diagram-common/src/font/font";
import { FontFamilyConfig, Element, Size, Point } from "@hylimo/diagram-common";
import { FontManager } from "../font/fontManager";
import { TextLayouter } from "../font/textLayouter";
import { generateStyles, Selector, SelectorType, Style, StyleList } from "../styles";
import { LayoutedDiagram } from "./layoutedDiagram";
import {
    addToSize,
    HorizontalAlignment,
    LayoutElement,
    LayoutElementConfig,
    LayoutInformation,
    matchToConstraints,
    SizeConstraints,
    VerticalAlignment
} from "./layoutElement";
import { layouts } from "./layouts";

/**
 * Performs layout, generates a model as a result
 */
export class LayoutEngine {
    /**
     * Lookup for layout configs
     */
    readonly layoutConfigs: Map<string, LayoutElementConfig> = new Map();

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
    async layout(diagram: FullObject): Promise<LayoutedDiagram> {
        const nativeFonts = diagram.getLocalFieldOrUndefined("fonts")?.value?.toNative();
        const fontMap = new Map<string, FontFamily>();
        const fontFamilyConfigs: FontFamilyConfig[] = [];
        const fontFamilies = await Promise.all(
            nativeToList(nativeFonts).map(async (config) => this.fontManager.getFontFamily(config))
        );
        for (const fontFamily of fontFamilies) {
            const config = fontFamily.config;
            fontMap.set(config.fontFamily, fontFamily);
            fontFamilyConfigs.push(config);
        }
        const layout = new Layout(
            this,
            generateStyles(diagram.getLocalFieldOrUndefined("styles")?.value as FullObject),
            fontMap,
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
        const elements = layout.layout(layoutElement, { x: 0, y: 0 }, layoutElement.measuredSize!, "0");
        return {
            rootElement: {
                type: "root",
                id: "root",
                children: elements,
                fonts: fontFamilyConfigs
            },
            layoutElementLookup: layout.layoutElementLookup
        };
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
        readonly fonts: Map<string, FontFamily>,
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
        const matchingStyles = [layoutElement.element];
        for (const style of this.styles.styles) {
            if (this.matchesStyle(layoutElement, style)) {
                matchingStyles.push(style.fields);
            }
        }
        matchingStyles.reverse();
        for (const attributeConfig of styleAttributes) {
            const attribute = attributeConfig.name;
            for (const style of matchingStyles) {
                const entry = style.getLocalFieldOrUndefined(attribute);
                if (entry && entry.value != this.styles.default) {
                    if (entry.value != this.styles.unset) {
                        layoutElement.styles[attribute] = entry.value.toNative();
                    } else {
                        layoutElement.styles[attribute] = undefined;
                    }
                    layoutElement.styleSources.set(attribute, entry);
                    break;
                }
            }
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
        const type = assertString(element.getLocalFieldOrUndefined("type")?.value!, "type");
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
        const computedConstraints: SizeConstraints = {
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
        const requestedSize = layoutElement.layoutConfig.measure(this, layoutElement, computedConstraints);
        const computedSize = addToSize(requestedSize, marginX, marginY);
        const realSize = matchToConstraints(computedSize, constraints);
        layoutElement.measuredSize = realSize;
        layoutElement.requestesSize = requestedSize;
        return layoutElement;
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
        const horizontalAlignment = styles.hAlign;
        const verticalAlignment = styles.vAlign;
        const layoutInformation = element.layoutInformation!;
        const marginX = layoutInformation.marginLeft + layoutInformation.marginRight;
        const marginY = layoutInformation.marginTop + layoutInformation.marginBottom;
        let realWidth = element.requestesSize!.width;
        if (!horizontalAlignment) {
            realWidth = Math.max(realWidth, size.width - marginX);
        }
        let realHeight = element.requestesSize!.height;
        if (!verticalAlignment) {
            realHeight = Math.max(realHeight, size.height - marginY);
        }
        let posX = position.x;
        let posY = position.y;
        if (styles.minWidth != undefined) {
            realWidth = Math.max(realWidth, styles.minWidth);
        }
        if (styles.maxWidth != undefined) {
            realWidth = Math.min(realWidth, styles.maxWidth);
        }
        if (styles.width != undefined) {
            realWidth = styles.width;
        }
        if (horizontalAlignment === HorizontalAlignment.RIGHT) {
            posX += size.width - (realWidth + layoutInformation.marginRight);
        } else if (horizontalAlignment === HorizontalAlignment.CENTER) {
            posX += (size.width - realWidth) / 2;
        } else {
            posX += layoutInformation.marginLeft;
        }

        if (styles.minHeight != undefined) {
            realHeight = Math.max(realHeight, styles.minHeight);
        }
        if (styles.maxHeight != undefined) {
            realHeight = Math.min(realHeight, styles.maxHeight);
        }
        if (styles.height != undefined) {
            realHeight = styles.height;
        }
        if (verticalAlignment === VerticalAlignment.BOTTOM) {
            posY += size.height - (realHeight + layoutInformation.marginBottom);
        } else if (verticalAlignment === VerticalAlignment.CENTER) {
            posY += (size.height - realHeight) / 2;
        } else {
            posY += layoutInformation.marginTop;
        }

        this.layoutElementLookup.set(id, element);

        return element.layoutConfig.layout(
            this,
            element,
            { x: posX, y: posY },
            { width: realWidth, height: realHeight },
            id
        );
    }
}

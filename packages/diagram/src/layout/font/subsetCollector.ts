import { FontStyle, FontWeight } from "@hylimo/diagram-common";
import { LayoutElement } from "../layoutElement.js";

/**
 * Contains the subsets of fonts
 * Only the present entries are used, the rest should be ignored during subset creation
 */
export interface SubsetConfig {
    /**
     * The normal font subset
     */
    normal?: string;
    /**
     * The italic font subset
     */
    italic?: string;
    /**
     * The bold font subset
     */
    bold?: string;
    /**
     * The bold italic font subset
     */
    boldItalic?: string;
}

/**
 * Helper for computing font subsets
 * Each set contains all characters used for a specific font style
 */
interface TemporarySubsetConfig {
    /**
     * The normal font subset
     */
    normal: Set<string>;
    /**
     * The italic font subset
     */
    italic: Set<string>;
    /**
     * The bold font subset
     */
    bold: Set<string>;
    /**
     * The bold italic font subset
     */
    boldItalic: Set<string>;
}

/**
 * Helper to collect font subsets
 */
export class SubsetCollector {
    /**
     * Temporary subsets
     */
    private readonly temporarySubsets: Map<string, TemporarySubsetConfig> = new Map();

    /**
     * The computed subsets
     */
    readonly subsets: Map<string, SubsetConfig> = new Map();

    /**
     * Creats a new subset collector
     * Results are stored in the subsets field, which can be accessed after construction
     *
     * @param element the element to collect the font subset information for
     * @param defaultFont the default font to use if no font is specified for a span
     */
    constructor(
        element: LayoutElement,
        private readonly defaultFont: string
    ) {
        this.collect(element);
        for (const [fontFamily, subsetConfig] of this.temporarySubsets) {
            const subset: SubsetConfig = {
                normal: this.convertToSubset(subsetConfig.normal),
                italic: this.convertToSubset(subsetConfig.italic),
                bold: this.convertToSubset(subsetConfig.bold),
                boldItalic: this.convertToSubset(subsetConfig.boldItalic)
            };
            this.subsets.set(fontFamily, subset);
        }
    }

    /**
     * Recursively collects the font subset information of the given element
     *
     * @param element the element to collect the subset information for
     */
    private collect(element: LayoutElement) {
        if (element.layoutConfig.type == "span") {
            const subset: Set<string> = this.getSubset(element);
            const text = element.element.getLocalFieldOrUndefined("text")!.value.toNative();
            for (const char of text) {
                subset.add(char);
            }
            subset.add("");
        }
        for (const child of element.children) {
            this.collect(child);
        }
    }

    /**
     * Gets the subsets based on the font family, weight and style
     * Assumes that the provided element is a span
     *
     * @returns the subset for the given font family, weight and style
     */
    private getSubset(element: LayoutElement): Set<string> {
        const styles = element.styles;
        const fontFamily = styles.fontFamily ?? this.defaultFont;
        const fontWeight = styles.fontWeight ?? FontWeight.Normal;
        const fontStyle = styles.fontStyle ?? FontStyle.Normal;
        let subsetConfig = this.temporarySubsets.get(fontFamily);
        if (subsetConfig == undefined) {
            subsetConfig = {
                normal: new Set(),
                italic: new Set(),
                bold: new Set(),
                boldItalic: new Set()
            };
            this.temporarySubsets.set(fontFamily, subsetConfig);
        }
        let subset: Set<string>;
        if (fontStyle == FontStyle.Normal) {
            subset = fontWeight == FontWeight.Bold ? subsetConfig.bold : subsetConfig.normal;
        } else {
            subset = fontWeight == FontWeight.Bold ? subsetConfig.boldItalic : subsetConfig.italic;
        }
        return subset;
    }

    /**
     * Converts a temporary subset to a subset config
     * If the temporary subset is empty, undefined is returned
     *
     * @param temporary the temporary subset
     * @returns the subset config
     */
    private convertToSubset(temporary: Set<string>): string | undefined {
        if (temporary.size == 0) {
            return undefined;
        }
        return Array.from(temporary).sort().join("");
    }
}

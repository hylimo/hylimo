import { FullObject, toNativeList } from "@hylimo/core";

/**
 * Different types of selectors
 */
export enum SelectorType {
    /**
     * Class selector, matches class
     */
    CLASS = "class",
    /**
     * Type selector, matches type
     */
    TYPE = "type"
}

/**
 * A selector which is part of the selector chain
 */
export interface Selector {
    /**
     * The type of the selector
     */
    type: SelectorType;
    /**
     * The value of the selector
     */
    value: string;
}

/**
 * A single style
 */
export interface Style {
    /**
     * Defines the selectors to match in reverse order
     */
    selectorChain: Selector[];
    /**
     * The fields which are applied if the selector matches
     */
    fields: { [key: string]: any };
}

/**
 * Generates the styles based on the provided styles
 *
 * @param styles the syncscript styles version
 * @returns the computed styles
 */
export function generateStyles(styles: any): Style[] {
    return generateStylesForStyles([], styles.styles);
}

/**
 * Generates styles for styles entries
 *
 * @param selectorChain the current selector chain
 * @param styles the styles to map
 * @returns a list of styles
 */
function generateStylesForStyles(selectorChain: Selector[], styles: any[]): Style[] {
    return toNativeList(styles).flatMap((value) => generateStylesRecursive(selectorChain, value));
}

/**
 * Generates styles for the current style if necessary and for all sub styles
 *
 * @param selectorChain the current selecto rchain
 * @param currentObject contains current styles
 * @returns a list of styles
 */
function generateStylesRecursive(selectorChain: Selector[], currentObject: any): Style[] {
    const currentSelectorChain: Selector[] = [
        ...selectorChain,
        {
            type: currentObject.selectorType,
            value: currentObject.selectorValue
        }
    ];
    const styles: Style[] = [];
    if (currentObject.hasOwnProperty("styles")) {
        styles.push(...generateStylesForStyles(currentSelectorChain, currentObject.styles));
    }
    if (Object.keys(currentObject).length > 3) {
        styles.push({
            selectorChain: currentSelectorChain,
            fields: currentObject
        });
    }
    return styles;
}

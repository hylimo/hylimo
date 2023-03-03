import { FullObject, objectToList } from "@hylimo/core";
import { assertString } from "@hylimo/core";

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
    TYPE = "type",
    /**
     * Any selector, maches any element
     */
    ANY = "any"
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
    fields: FullObject;
}

/**
 * A list of styles
 */
export interface StyleList {
    /**
     * The actual list of styles
     */
    styles: Style[];
}

/**
 * Generates the styles based on the provided styles
 *
 * @param styles the syncscript styles version
 * @returns the computed styles
 */
export function generateStyles(styles: FullObject): StyleList {
    const elements = generateStylesForStyles([], styles.getLocalFieldOrUndefined("styles")?.value as FullObject);
    return {
        styles: elements
    };
}

/**
 * Generates styles for styles entries
 *
 * @param selectorChain the current selector chain
 * @param styles the styles to map
 * @returns a list of styles
 */
function generateStylesForStyles(selectorChain: Selector[], styles: FullObject): Style[] {
    return objectToList(styles).flatMap((value) => generateStylesRecursive(selectorChain, value as FullObject));
}

/**
 * Generates styles for the current style if necessary and for all sub styles
 *
 * @param selectorChain the current selecto rchain
 * @param currentObject contains current styles
 * @returns a list of styles
 */
function generateStylesRecursive(selectorChain: Selector[], currentObject: FullObject): Style[] {
    const currentSelectorChain: Selector[] = [
        ...selectorChain,
        {
            type: assertString(
                currentObject.getLocalFieldOrUndefined("selectorType")!.value,
                "selectorType"
            ) as SelectorType,
            value: assertString(currentObject.getLocalFieldOrUndefined("selectorValue")!.value, "selectorValue")
        }
    ];
    const styles: Style[] = [];
    if (currentObject.getLocalFieldOrUndefined("styles")) {
        styles.push(
            ...generateStylesForStyles(
                currentSelectorChain,
                currentObject.getLocalFieldOrUndefined("styles")?.value as FullObject
            )
        );
    }
    if (currentObject.fields.size > 4) {
        styles.push({
            selectorChain: currentSelectorChain,
            fields: currentObject
        });
    }
    return styles;
}

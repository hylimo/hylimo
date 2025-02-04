import { Element } from "@hylimo/diagram-common";
import { Edit, IncrementalUpdate } from "@hylimo/diagram-protocol";
import { Config } from "../../config.js";

/**
 * Handles transactional edits to a TextDocument
 *
 * @param E the type of edit handled
 */
export interface EditHandler<E extends Edit> {
    /**
     * The type of the action
     */
    type: NonNullable<E["types"]>[0] | RegExp;

    /**
     * Predicts the action diff based on the layouted diagram and the last applied action
     * Only computes an incremental update, should not modify the elements
     *
     * @param lastApplied the values that caused the last full update
     * @param newest the newest values
     * @param elements the elements to apply the prediction to
     * @param elementLookup a lookup table for all current elements, can be used if updating another element is necessary
     * @returns the incremental updates generated by the prediction
     */
    predictActionDiff(
        lastApplied: E["values"] | undefined,
        newest: E["values"],
        elements: Element[],
        elementLookup: Record<string, Element>
    ): IncrementalUpdate[];

    /**
     * Transforms the action based on settings and other values
     *
     * @param edit the action to transform
     * @param config the language server config
     */
    transformEdit(edit: E, config: Config): void;
}

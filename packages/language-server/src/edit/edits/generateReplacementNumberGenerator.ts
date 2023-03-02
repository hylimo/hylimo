import { FieldEntry } from "@hylimo/core";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { ReplacementNumberGenerator } from "../generators/replacementNumberGenerator";

/**
 * Generates a new EditGeneratorEntry based on the provided FieldEntry to modify.
 * Replaces the entry in all cases with a number literal.
 *
 * @param entry the FieldEntry to modify
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
export function generateReplacementNumberGenerator(entry: FieldEntry, meta: any): EditGeneratorEntry {
    const source = entry.source;
    const position = source?.position;
    if (source == undefined) {
        throw new Error("entry and its source must not be undefined");
    }
    return {
        start: position!.startOffset,
        end: position!.endOffset,
        generator: ReplacementNumberGenerator.create(),
        meta
    };
}

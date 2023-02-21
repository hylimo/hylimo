import { OriginalValueNumberGenerator } from "./originalValueNumberGenerator";
import { EditEngine } from "./editGenerator";

/**
 * EditGenerator which adds / removes a specified value from the original value and replaces the whole number
 */
export interface DeltaReplacementNumberGenerator extends OriginalValueNumberGenerator {
    type: typeof DeltaReplacementNumberGenerator.TYPE;
}

export namespace DeltaReplacementNumberGenerator {
    export const TYPE = "deltaReplacementNumberGenerator";

    /**
     * Creates a new DeltaReplacementNumberGenerator
     *
     * @param originalValue the original value
     * @returns the created DeltaReplacementNumberGenerator
     */
    export function create(originalValue: number): DeltaReplacementNumberGenerator {
        return {
            type: TYPE,
            originalValue
        };
    }
}

/**
 * EditEngine for DeltaReplacementNumberGenerator
 */
export const deltaReplacementNumberEngine: EditEngine<number, DeltaReplacementNumberGenerator> = {
    type: DeltaReplacementNumberGenerator.TYPE,
    generateEdit(delta: number, generator: DeltaReplacementNumberGenerator) {
        return (generator.originalValue + delta).toString();
    }
};

import { printNumber } from "../printNumber.js";
import { EditEngine } from "./editGenerator.js";
import { OriginalValueNumberGenerator } from "./originalValueNumberGenerator.js";

/**
 * EditGenerator which replaces the whole number with a factor multiplied by the original value
 */
export interface FactorReplacementNumberGenerator extends OriginalValueNumberGenerator {
    type: typeof FactorReplacementNumberGenerator.TYPE;
}

export namespace FactorReplacementNumberGenerator {
    export const TYPE = "factorReplacementNumberGenerator";

    /**
     * Creates a new FactorReplacementNumberGenerator
     *
     * @param originalValue the original value
     * @returns the created FactorReplacementNumberGenerator
     */
    export function create(originalValue: number): FactorReplacementNumberGenerator {
        return {
            type: TYPE,
            originalValue
        };
    }
}

/**
 * EditEngine for FactorReplacementNumberGenerator
 */
export const factorReplacementNumberEngine: EditEngine<number, FactorReplacementNumberGenerator> = {
    type: FactorReplacementNumberGenerator.TYPE,
    generateEdit(factor: number, generator: FactorReplacementNumberGenerator) {
        return printNumber(generator.originalValue * factor);
    }
};

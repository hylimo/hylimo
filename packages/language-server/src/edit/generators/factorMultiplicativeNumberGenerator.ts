import { EditEngine } from "./editGenerator";
import { OriginalValueNumberGenerator } from "./originalValueNumberGenerator";

/**
 * EditGenerator for modifying a number expression with a * / constant based on a factor
 */
export interface FactorMultiplicativeNumberGenerator extends OriginalValueNumberGenerator {
    type: typeof FactorMultiplicativeNumberGenerator.TYPE;
}

export namespace FactorMultiplicativeNumberGenerator {
    export const TYPE = "factorMultiplicativeNumberGenerator";

    /**
     * Creates a new FactorMultiplicativeNumberGenerator
     *
     * @param originalValue the original value
     * @returns the created FactorMultiplicativeNumberGenerator
     */
    export function create(originalValue: number): FactorMultiplicativeNumberGenerator {
        return {
            type: TYPE,
            originalValue
        };
    }
}

/**
 * EditEngine for FactorMultiplicativeNumberGenerator
 */
export const factorMultiplicativeNumberEngine: EditEngine<number, FactorMultiplicativeNumberGenerator> = {
    type: FactorMultiplicativeNumberGenerator.TYPE,
    generateEdit(factor: number, generator: FactorMultiplicativeNumberGenerator) {
        const newValue = generator.originalValue * factor;
        if (newValue === 1) {
            return "";
        } else if (newValue > 1) {
            return ` * ${newValue}`;
        } else {
            return ` / ${1 / newValue}`;
        }
    }
};

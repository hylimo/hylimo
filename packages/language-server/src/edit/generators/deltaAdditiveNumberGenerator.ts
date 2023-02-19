import { DeltaNumberGenerator } from "./deltaNumberGenerator";
import { EditEngine } from "./editGenerator";

/**
 * EditGenerator for modifying a number expression with a + - constant based on a delta
 */
export interface DeltaAdditiveNumberGenerator extends DeltaNumberGenerator {
    type: typeof DeltaAdditiveNumberGenerator.TYPE;
}

export namespace DeltaAdditiveNumberGenerator {
    export const TYPE = "deltaAdditiveNumberGenerator";

    /**
     * Creates a new DeltaAdditiveNumberGenerator
     *
     * @param originalValue the original value
     * @returns the created DeltaAdditiveNumberGenerator
     */
    export function create(originalValue: number): DeltaAdditiveNumberGenerator {
        return {
            type: TYPE,
            originalValue
        };
    }
}

/**
 * EditEngine for DeltaAdditiveNumberGenerator
 */
export const deltaAdditiveNumberEngine: EditEngine<number, DeltaAdditiveNumberGenerator> = {
    type: DeltaAdditiveNumberGenerator.TYPE,
    generateEdit(delta: number, generator: DeltaAdditiveNumberGenerator) {
        const newValue = generator.originalValue + delta;
        if (newValue === 0) {
            return "";
        } else if (newValue > 0) {
            return ` + ${newValue}`;
        } else {
            return ` - ${-newValue}`;
        }
    }
};

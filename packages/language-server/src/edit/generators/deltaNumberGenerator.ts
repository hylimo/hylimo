import { EditGenerator } from "./editGenerator";

/**
 * Base class for DeltaReplacementNumberGenerator and DeltaAdditiveNumberGeneator
 */
export abstract class DeltaNumberGenerator implements EditGenerator<number> {
    /**
     * Creates a new DeltaNumberGenerator based on the original value of the expression
     *
     * @param originalValue the original number value of the literal expression
     */
    constructor(protected readonly originalValue: number) {}

    abstract generateEdit(delta: number): string;
}

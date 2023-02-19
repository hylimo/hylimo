import { EditGenerator } from "./editGenerator";

/**
 * Base interface for DeltaReplacementNumberGenerator and DeltaAdditiveNumberGeneator
 */
export interface DeltaNumberGenerator extends EditGenerator {
    /**
     * The original value
     */
    readonly originalValue: number;
}

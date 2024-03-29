import { EditGenerator } from "./editGenerator";

/**
 * Base interface for generators that require the original value
 */
export interface OriginalValueNumberGenerator extends EditGenerator {
    /**
     * The original value
     */
    readonly originalValue: number;
}

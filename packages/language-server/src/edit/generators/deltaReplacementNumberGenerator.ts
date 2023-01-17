import { DeltaNumberGenerator } from "./deltaNumberGenerator";

/**
 * EditGenerator which adds / removes a specified value from the original value and replaces the whole number
 */
export class DeltaReplacementNumberGenerator extends DeltaNumberGenerator {
    override generateEdit(delta: number): string {
        return (this.originalValue + delta).toString();
    }
}

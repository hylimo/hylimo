import { DeltaNumberGenerator } from "./deltaNumberGenerator";

/**
 * EditGenerator for modifying a number expression with a + - constant based on a delta
 */
export class DeltaAdditiveNumberGenerator extends DeltaNumberGenerator {
    override generateEdit(delta: number): string {
        const newValue = this.originalValue + delta;
        if (newValue === 0) {
            return "";
        } else if (newValue > 0) {
            return ` + ${newValue}`;
        } else {
            return ` - ${-newValue}`;
        }
    }
}

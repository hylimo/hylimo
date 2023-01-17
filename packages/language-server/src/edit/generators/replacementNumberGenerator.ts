import { EditGenerator } from "./editGenerator";

/**
 * EditGenerator which replaces a number complately
 */
export class ReplacementNumberGenerator implements EditGenerator<number> {
    generateEdit(data: number): string {
        return data.toString();
    }
}

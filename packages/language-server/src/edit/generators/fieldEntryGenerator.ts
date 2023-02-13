import { EditGenerator } from "./editGenerator";

/**
 * EditGenerator which can add multiple fields
 * Also adds a prefix and suffix.
 */
export class FieldEntryGenerator implements EditGenerator<Record<string, string>> {
    /**
     * Creates a new ReplacementGenerator
     *
     * @param prefix the prefix to add
     * @param suffix the suffix to add
     * @param indentation the indentation to use before each line
     */
    constructor(readonly prefix: string, readonly suffix: string, readonly indentation: string) {}

    generateEdit(data: Record<string, string>): string {
        const entries = Object.entries(data).map(([key, value]) => `${this.indentation}${key} = ${value}`);
        return `${this.prefix}${entries.join("\n")}${this.suffix}`;
    }
}

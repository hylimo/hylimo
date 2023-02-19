import { EditEngine, EditGenerator } from "./editGenerator";

/**
 * EditGenerator which can add multiple fields
 * Also adds a prefix and suffix.
 */
export interface FieldEntryGenerator extends EditGenerator {
    type: typeof FieldEntryGenerator.TYPE;
    /**
     * The prefix to add before the fields
     */
    readonly prefix: string;
    /**
     * The suffix to add after the fields
     */
    readonly suffix: string;
    /**
     * The indentation to use for each field
     */
    readonly indentation: string;
}

export namespace FieldEntryGenerator {
    export const TYPE = "fieldEntryGenerator";

    /**
     * Creates a new FieldEntryGenerator
     *
     * @param prefix the prefix to add before the fields
     * @param suffix the suffix to add after the fields
     * @param indentation the indentation to use for each field
     * @returns the created FieldEntryGenerator
     */
    export function create(prefix: string, suffix: string, indentation: string): FieldEntryGenerator {
        return {
            type: TYPE,
            prefix,
            suffix,
            indentation
        };
    }
}

/**
 * EditEngine for FieldEntryGenerator
 */
export const fieldEntryEngine: EditEngine<Record<string, string>, FieldEntryGenerator> = {
    type: FieldEntryGenerator.TYPE,
    generateEdit(data: Record<string, string>, generator: FieldEntryGenerator) {
        const entries = Object.entries(data).map(([key, value]) => `${generator.indentation}${key} = ${value}`);
        return `${generator.prefix}${entries.join("\n")}${generator.suffix}`;
    }
};

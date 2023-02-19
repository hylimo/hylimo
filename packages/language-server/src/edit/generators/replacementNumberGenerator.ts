import { EditEngine, EditGenerator } from "./editGenerator";

/**
 * EditGenerator which replaces a number complately
 */
export interface ReplacementNumberGenerator extends EditGenerator {
    type: typeof ReplacementNumberGenerator.TYPE;
}

export namespace ReplacementNumberGenerator {
    export const TYPE = "replacementNumberGenerator";

    /**
     * Creates a new ReplacementNumberGenerator
     *
     * @returns the created ReplacementNumberGenerator
     */
    export function create(): ReplacementNumberGenerator {
        return {
            type: TYPE
        };
    }
}

/**
 * EditEngine for ReplacementNumberGenerator
 */
export const replacementNumberEngine: EditEngine<number, ReplacementNumberGenerator> = {
    type: ReplacementNumberGenerator.TYPE,
    generateEdit(data: number, _generator: ReplacementNumberGenerator) {
        return data.toString();
    }
};

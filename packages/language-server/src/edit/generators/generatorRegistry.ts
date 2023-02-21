import { deltaAdditiveNumberEngine } from "./deltaAdditiveNumberGenerator";
import { deltaReplacementNumberEngine } from "./deltaReplacementNumberGenerator";
import { EditEngine, EditGenerator } from "./editGenerator";
import { factorMultiplicativeNumberEngine } from "./factorMultiplicativeNumberGenerator";
import { factorReplacementNumberEngine } from "./factorReplacementNumberGenerator";
import { fieldEntryEngine } from "./fieldEntryGenerator";
import { replacementNumberEngine } from "./replacementNumberGenerator";

/**
 * Registry for EditEngines
 */
export class GeneratorRegistry {
    /**
     * Map of all registered generators
     */
    private readonly generators: Map<string, EditEngine<any, any>> = new Map();

    /**
     * Creates a new GeneratorRegistry
     *
     * @param engines the engines to register
     */
    constructor(engines: EditEngine<any, any>[]) {
        engines.forEach((engine) => this.generators.set(engine.type, engine));
    }

    /**
     * Generates an edit for the given generator and data.
     * If no engine is found for the generator type, an error is thrown.
     *
     * @param data the data to apply
     * @param generator the generator to use
     * @returns the generated edit
     */
    generateEdit(data: any, generator: EditGenerator) {
        const engine = this.generators.get(generator.type);
        if (engine === undefined) {
            throw new Error(`No engine found for generator type ${generator.type}`);
        }
        return engine.generateEdit(data, generator);
    }
}

/**
 * Default registry for all generators
 */
export const defaultGeneratorRegistry = new GeneratorRegistry([
    deltaAdditiveNumberEngine,
    replacementNumberEngine,
    deltaReplacementNumberEngine,
    fieldEntryEngine,
    factorMultiplicativeNumberEngine,
    factorReplacementNumberEngine
]);

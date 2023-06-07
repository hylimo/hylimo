import { defaultGeneratorRegistry } from "../generators/generatorRegistry";
import { AxisAlignedSegmentEditEngine } from "./axisAlignedSegmentEdit";
import { LineMoveEditEngine } from "./lineMoveEdit";
import { ResizeEditEngine } from "./resizeEdit";
import { RotationEditEngine } from "./rotationEdit";
import { TransactionalEditEngine } from "./transactionalEdit";
import { TranslationMoveEditEngine } from "./translationMoveEdit";

/**
 * Registry for all edit engines
 */
export class TransactionalEditRegistory {
    /**
     * Map of all edit engines
     */
    private readonly engines: Map<string, TransactionalEditEngine<any, any>> = new Map();

    /**
     * Creates a new TransactionalEditRegistory
     *
     * @param engines the edit engines to register
     */
    constructor(engines: TransactionalEditEngine<any, any>[]) {
        engines.forEach((edit) => this.engines.set(edit.actionType, edit));
    }

    /**
     * Returns the edit engine for the given type.
     * If no engine is found for the type, an error is thrown.
     *
     * @param actionKind the type of the edit to get the engine for
     * @returns the edit engine
     */
    getEditEngine(actionKind: string): TransactionalEditEngine<any, any> {
        const engine = this.engines.get(actionKind);
        if (engine === undefined) {
            throw new Error(`No engine found for action type ${actionKind}`);
        }
        return engine;
    }
}

/**
 * Default registry for all edits
 */
export const defaultEditRegistry = new TransactionalEditRegistory([
    new LineMoveEditEngine(defaultGeneratorRegistry),
    new TranslationMoveEditEngine(defaultGeneratorRegistry),
    new RotationEditEngine(defaultGeneratorRegistry),
    new ResizeEditEngine(defaultGeneratorRegistry),
    new AxisAlignedSegmentEditEngine(defaultGeneratorRegistry)
]);

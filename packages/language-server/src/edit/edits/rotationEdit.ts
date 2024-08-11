import { LayoutedDiagram } from "@hylimo/diagram";
import { CanvasElement } from "@hylimo/diagram-common";
import { EditGeneratorEntry } from "./editGeneratorEntry.js";
import { EditGenerator } from "../generators/editGenerator.js";
import { generateAddFieldToScopeGenerator } from "./generateAddFieldToScopeGenerator.js";
import { generateReplacementNumberGenerator } from "./generateReplacementNumberGenerator.js";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit.js";
import { GeneratorRegistry } from "../generators/generatorRegistry.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { RotationAction, IncrementalUpdate, DynamicLanguageServerConfig } from "@hylimo/diagram-protocol";
import { printNumber } from "../printNumber.js";

/**
 * Edit for RotationAction
 */
export interface RotationEdit extends TransactionalEdit {
    type: typeof RotationEdit.TYPE;
}

export namespace RotationEdit {
    export const TYPE = "rotationEdit";

    /**
     * Creates a RotationEdit from a RotationAction and a LayoutedDiagram
     *
     * @param action the action which created the edit
     * @param diagram the diagram the action was applied to#
     * @param document the document the diagram was created from
     * @returns the created RotationEdit
     */
    export function create(action: RotationAction, diagram: LayoutedDiagram, document: TextDocument): RotationEdit {
        const canvasElement = diagram.layoutElementLookup.get(action.element);
        if (canvasElement?.layoutConfig.type !== CanvasElement.TYPE) {
            throw new Error("Only CanvasElements are supported");
        }
        const rotationField = canvasElement.element.getLocalFieldOrUndefined("rotation");
        let generatorEntry: EditGeneratorEntry;
        if (rotationField != undefined) {
            generatorEntry = generateReplacementNumberGenerator(rotationField, "rotation");
        } else {
            generatorEntry = generateAddFieldToScopeGenerator(
                canvasElement.element,
                "layout",
                document,
                "scopeRotation"
            );
        }
        return {
            type: RotationEdit.TYPE,
            generatorEntries: [generatorEntry]
        };
    }
}

/**
 * EditEngine for RotationEdits
 */
export class RotationEditEngine extends TransactionalEditEngine<RotationAction, RotationEdit> {
    /**
     * Creates a new RotationEditEngine
     *
     * @param generatorRegistry the generator registry to use
     */
    constructor(generatorRegistry: GeneratorRegistry) {
        super(RotationEdit.TYPE, RotationAction.KIND, generatorRegistry);
    }

    override applyActionToGenerator(
        edit: RotationEdit,
        action: RotationAction,
        generator: EditGenerator,
        meta: any
    ): string {
        if (meta === "rotation") {
            return this.generatorRegistory.generateEdit(action.rotation, generator);
        } else if (meta === "scopeRotation") {
            return this.generatorRegistory.generateEdit({ rotation: printNumber(action.rotation) }, generator);
        } else {
            throw new Error(`Unknown meta information for RotationEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        edit: RotationEdit,
        layoutedDiagram: LayoutedDiagram,
        lastApplied: RotationAction | undefined,
        newest: RotationAction
    ): IncrementalUpdate[] {
        const element = layoutedDiagram.elementLookup[newest.element];
        if (element != undefined && CanvasElement.isCanvasElement(element)) {
            element.rotation = newest.rotation;
            return [
                {
                    target: element.id,
                    changes: {
                        rotation: newest.rotation
                    }
                }
            ];
        } else {
            return [];
        }
    }

    override transformAction(action: RotationAction, config: DynamicLanguageServerConfig): RotationAction {
        return {
            ...action,
            rotation: this.round(action.rotation, config.settings.rotationPrecision)
        };
    }
}

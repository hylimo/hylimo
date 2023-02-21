import { BaseDiagramLayoutResult, DiagramLayoutResult, LayoutElement } from "@hylimo/diagram";
import { CanvasElement, IncrementalUpdate, ResizeAction } from "@hylimo/diagram-common";
import { TextDocument } from "vscode-languageserver-textdocument";
import { EditGenerator } from "../generators/editGenerator";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { generateAddFieldToScopeGenerator } from "./generateAddFieldToScopeGenerator";
import { generateFactorNumberGenerator } from "./generateFactorNumberGenerator";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit";

interface ResizeMetadata {
    /**
     * The type of the resize
     */
    type: "width" | "height";
    /**
     * If given, it is a scope edit and the current size is stored here
     */
    originalValue?: number;
}

/**
 * Generates EditGeneratorEntries for a resize action applied to a canvas element
 *
 * @param element the canvas element to resize
 * @param document the document which contains the element
 * @param action the resize action
 * @returns EditGeneratorEntries for "width" and "height" and their values are changed
 */
function generateResizeGeneratorEntries(
    element: LayoutElement,
    document: TextDocument,
    action: ResizeAction
): EditGeneratorEntry[] {
    if (element.layoutConfig.type !== CanvasElement.TYPE) {
        throw new Error(`Resize is only supported for canvas elements, not: ${element.layoutConfig.type}`);
    }
    const result: EditGeneratorEntry[] = [];
    const bounds = element.layoutBounds!.size;
    if (action.factorX != undefined) {
        const widthField = element.styleSources.get("width");
        if (widthField?.source == undefined) {
            result.push(
                generateAddFieldToScopeGenerator(element.element, "layout", document, {
                    type: "width",
                    originalValue: bounds.width
                })
            );
        } else {
            result.push(generateFactorNumberGenerator(widthField, { type: "width" }));
        }
    }
    if (action.factorY != undefined) {
        const heightField = element.styleSources.get("height");
        if (heightField?.source == undefined) {
            result.push(
                generateAddFieldToScopeGenerator(element.element, "layout", document, {
                    type: "height",
                    originalValue: bounds.height
                })
            );
        } else {
            result.push(generateFactorNumberGenerator(heightField, { type: "height" }));
        }
    }
    return result;
}

/**
 * TransactionalEdit for ResizeActions
 */
export interface ResizeEdit extends TransactionalEdit {
    type: typeof ResizeEdit.TYPE;
}

export namespace ResizeEdit {
    export const TYPE = "resizeEdit";

    /**
     * Creates a ResizeEdit from a ResizeAction and a LayoutedDiagram
     *
     * @param action the action which created the edit
     * @param diagram the diagram the action was applied to
     * @param document the document the diagram was created from
     * @returns the created ResizeEdit
     */
    export function create(action: ResizeAction, diagram: DiagramLayoutResult, document: TextDocument): ResizeEdit {
        const generatorEntries = action.elements.flatMap((elementId) => {
            const element = diagram.layoutElementLookup.get(elementId);
            if (element == undefined) {
                throw new Error(`Unknown canvas element: ${elementId}`);
            }
            return generateResizeGeneratorEntries(element, document, action);
        });
        return {
            type: ResizeEdit.TYPE,
            generatorEntries
        };
    }
}

/**
 * EditEngine for ResizeEdits
 */
export class ResizeEditEngine extends TransactionalEditEngine<ResizeAction, ResizeEdit> {
    /**
     * Creates a new ResizeEditEngine
     *
     * @param generatorRegistory the generator registry to use
     */
    constructor(generatorRegistory: GeneratorRegistry) {
        super(ResizeEdit.TYPE, ResizeAction.KIND, generatorRegistory);
    }

    protected override applyActionToGenerator(
        edit: ResizeEdit,
        action: ResizeAction,
        generator: EditGenerator,
        meta: any
    ): string {
        meta as ResizeMetadata;
        const factor = meta.type === "width" ? action.factorX! : action.factorY!;
        if (meta.originalValue == undefined) {
            return this.generatorRegistory.generateEdit(factor, generator);
        } else {
            return this.generatorRegistory.generateEdit({ [meta.type]: meta.originalValue * factor }, generator);
        }
    }

    override predictActionDiff(
        edit: ResizeEdit,
        layoutedDiagram: BaseDiagramLayoutResult,
        lastApplied: ResizeAction | undefined,
        newest: ResizeAction
    ): IncrementalUpdate[] {
        const scaleX = newest.factorX != undefined ? newest.factorX / (lastApplied?.factorX ?? 1) : 1;
        const scaleY = newest.factorY != undefined ? newest.factorY / (lastApplied?.factorY ?? 1) : 1;
        const updates: IncrementalUpdate[] = [];
        for (const elementId of newest.elements) {
            const element = layoutedDiagram.elementLookup[elementId];
            if (element != undefined && CanvasElement.isCanvasElement(element)) {
                const changes: Record<string, number> = {};
                if (scaleX != 1) {
                    element.width *= scaleX;
                    changes.width = element.width;
                }
                if (scaleY != 1) {
                    element.height *= scaleY;
                    changes.height = element.height;
                }
                updates.push({
                    target: elementId,
                    changes
                });
            }
        }
        return updates;
    }
}

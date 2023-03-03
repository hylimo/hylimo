import { BaseDiagramLayoutResult, DiagramLayoutResult, LayoutElement } from "@hylimo/diagram";
import { CanvasElement } from "@hylimo/diagram-common";
import { ResizeAction, IncrementalUpdate } from "@hylimo/diagram-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import { EditGenerator } from "../generators/editGenerator";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { generateAddFieldToScopeGenerator } from "./generateAddFieldToScopeGenerator";
import { generateFactorNumberGenerator } from "./generateFactorNumberGenerator";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit";

/**
 * Metadata for generateAddFieldToScopeGenerator
 */
interface AddToScopeResizeMetadata {
    /**
     * The original width
     */
    originalWidth?: number;
    /**
     * The original height
     */
    originalHeight?: number;
}

/**
 * Metadata for ResizeEdit
 */
type ResizeMetadata = "width" | "height" | AddToScopeResizeMetadata;

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
    const addToScopeMeta: AddToScopeResizeMetadata = {};
    if (action.factorX != undefined) {
        const widthField = element.styleSources.get("width");
        if (widthField?.source == undefined) {
            addToScopeMeta.originalWidth = bounds.width;
        } else {
            result.push(generateFactorNumberGenerator(widthField, "width"));
        }
    }
    if (action.factorY != undefined) {
        const heightField = element.styleSources.get("height");
        if (heightField?.source == undefined) {
            addToScopeMeta.originalHeight = bounds.height;
        } else {
            result.push(generateFactorNumberGenerator(heightField, "height"));
        }
    }
    if (Object.keys(addToScopeMeta).length > 0) {
        result.push(generateAddFieldToScopeGenerator(element.element, "layout", document, addToScopeMeta));
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
        if (meta === "width") {
            return this.generatorRegistory.generateEdit(action.factorX, generator);
        } else if (meta === "height") {
            return this.generatorRegistory.generateEdit(action.factorY, generator);
        } else {
            const data: Record<string, number> = {};
            if (meta.originalWidth != undefined) {
                data.width = meta.originalWidth * (action.factorX ?? 1);
            }
            if (meta.originalHeight != undefined) {
                data.height = meta.originalHeight * (action.factorY ?? 1);
            }
            return this.generatorRegistory.generateEdit(data, generator);
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
                    element.x *= scaleX;
                    element.width *= scaleX;
                    changes.x = element.x;
                    changes.width = element.width;
                }
                if (scaleY != 1) {
                    element.y *= scaleY;
                    changes.y = element.y;
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

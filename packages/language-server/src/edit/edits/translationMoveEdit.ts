import { LayoutedDiagram, LayoutElement } from "@hylimo/diagram";
import { AbsolutePoint, CanvasElement, RelativePoint } from "@hylimo/diagram-common";
import { TextDocument } from "vscode-languageserver-textdocument";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { EditGenerator } from "../generators/editGenerator";
import { generateAddFieldToScopeGenerator } from "./generateAddFieldToScopeGenerator";
import { generateDeltaNumberGenerator } from "./generateDeltaNumberGenerator";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { TranslationMoveAction, IncrementalUpdate, DynamicLanguageServerConfig } from "@hylimo/diagram-protocol";
import { printNumber } from "../printNumber";

/**
 * Generates EditGeneratorEntries for absolute and relative points
 *
 * @param element the canvas element or point to modify
 * @param document the document which contains the element
 * @returns EditGeneratorEntries for "x" and "y"
 */
function generatePointGeneratorEntries(element: LayoutElement, document: TextDocument): EditGeneratorEntry[] {
    if (element.layoutConfig.type === AbsolutePoint.TYPE) {
        return [
            generateDeltaNumberGenerator(element.element.getLocalFieldOrUndefined("x")!, "x"),
            generateDeltaNumberGenerator(element.element.getLocalFieldOrUndefined("y")!, "y")
        ];
    } else if (element.layoutConfig.type === RelativePoint.TYPE) {
        return [
            generateDeltaNumberGenerator(element.element.getLocalFieldOrUndefined("offsetX")!, "x"),
            generateDeltaNumberGenerator(element.element.getLocalFieldOrUndefined("offsetY")!, "y")
        ];
    } else if (element.layoutConfig.type === CanvasElement.TYPE) {
        return [generateAddFieldToScopeGenerator(element.element, "layout", document, "pos")];
    } else {
        throw new Error(`Unknown point type: ${element.layoutConfig.type}`);
    }
}

/**
 * TransactionalEdit for TranslationMoveActions
 */
export interface TranslationMoveEdit extends TransactionalEdit {
    type: typeof TranslationMoveEdit.TYPE;
    /**
     * Indicates if the edit creates a new point
     * In this case, no predication should be applied as it may be applied to the wrong point.
     */
    readonly hasNewPoint: boolean;
}

export namespace TranslationMoveEdit {
    export const TYPE = "translationMoveEdit";

    /**
     * Creates a TranslationMoveEdit from a TranslationMoveAction and a LayoutedDiagram
     *
     * @param action the action which created the edit
     * @param diagram the diagram the action was applied to
     * @param document the document the diagram was created from
     * @returns the created TranslationMoveEdit
     */
    export function create(
        action: TranslationMoveAction,
        diagram: LayoutedDiagram,
        document: TextDocument
    ): TranslationMoveEdit {
        let hasNewPoint = false;
        const generatorEntries = action.elements.flatMap((elementId) => {
            const element = diagram.layoutElementLookup.get(elementId);
            if (element == undefined) {
                throw new Error(`Unknown point: ${elementId}`);
            }
            if (element.layoutConfig.type == CanvasElement.TYPE) {
                hasNewPoint = true;
            }
            return generatePointGeneratorEntries(element, document);
        });
        return {
            type: TranslationMoveEdit.TYPE,
            generatorEntries: EditGeneratorEntry.sortAndValidate(generatorEntries),
            hasNewPoint
        };
    }
}

/**
 * EditEngine for TranslationMoveEdits
 */
export class TranslationMoveEditEngine extends TransactionalEditEngine<TranslationMoveAction, TranslationMoveEdit> {
    /**
     * Creates a new TranslationMoveEditEngine
     *
     * @param generatorRegistry the generator registry to use
     */
    constructor(generatorRegistry: GeneratorRegistry) {
        super(TranslationMoveEdit.TYPE, TranslationMoveAction.KIND, generatorRegistry);
    }

    protected override applyActionToGenerator(
        edit: TranslationMoveEdit,
        action: TranslationMoveAction,
        generator: EditGenerator,
        meta: any
    ): string {
        if (meta === "x") {
            return this.generatorRegistory.generateEdit(action.offsetX, generator);
        } else if (meta === "y") {
            return this.generatorRegistory.generateEdit(action.offsetY, generator);
        } else if (meta === "pos") {
            return this.generatorRegistory.generateEdit(
                { pos: `apos(${printNumber(action.offsetX)}, ${printNumber(action.offsetY)})` },
                generator
            );
        } else {
            throw new Error(`Unknown meta information for TranslationMoveEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        edit: TranslationMoveEdit,
        layoutedDiagram: LayoutedDiagram,
        lastApplied: TranslationMoveAction | undefined,
        newest: TranslationMoveAction
    ): IncrementalUpdate[] {
        if (edit.hasNewPoint) {
            return [];
        }
        const deltaX = newest.offsetX - (lastApplied?.offsetX ?? 0);
        const deltaY = newest.offsetY - (lastApplied?.offsetY ?? 0);
        const updates: IncrementalUpdate[] = [];
        for (const pointId of newest.elements) {
            const point = layoutedDiagram.elementLookup[pointId];
            if (point != undefined) {
                if (AbsolutePoint.isAbsolutePoint(point)) {
                    point.x += deltaX;
                    point.y += deltaY;
                    updates.push({
                        target: pointId,
                        changes: {
                            x: point.x,
                            y: point.y
                        }
                    });
                } else if (RelativePoint.isRelativePoint(point)) {
                    point.offsetX += deltaX;
                    point.offsetY += deltaY;
                    updates.push({
                        target: pointId,
                        changes: {
                            offsetX: point.offsetX,
                            offsetY: point.offsetY
                        }
                    });
                }
            }
        }
        return updates;
    }

    override transformAction(
        action: TranslationMoveAction,
        config: DynamicLanguageServerConfig
    ): TranslationMoveAction {
        return {
            ...action,
            offsetX: this.round(action.offsetX, config.settings.translationPrecision),
            offsetY: this.round(action.offsetY, config.settings.translationPrecision)
        };
    }
}

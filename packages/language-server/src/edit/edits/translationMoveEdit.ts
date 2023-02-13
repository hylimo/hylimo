import { LayoutedDiagram, LayoutElement } from "@hylimo/diagram";
import { AbsolutePoint, CanvasElement, RelativePoint, TranslationMoveAction } from "@hylimo/diagram-common";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagram } from "../../diagram";
import { EditGeneratorEntry } from "../editGeneratorEntry";
import { EditGenerator } from "../generators/editGenerator";
import { TransactionalEdit } from "../transactionalEdit";
import { generateAddFieldToScopeGenerator } from "./generateAddFieldToScopeGenerator";
import { generateDeltaNumberGenerator } from "./generateDeltaNumberGenerator";

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
export class TranslationMoveEdit extends TransactionalEdit<TranslationMoveAction> {
    /**
     * Indicates if the edit creates a new point
     * In this case, no predication should be applied as it may be applied to the wrong point.
     */
    private readonly hasNewPoint: boolean;

    /**
     * Creates a new TranslationMoveEdit based on an initial action and the used diagram
     * Requires that the diagram was already layouted
     *
     * @param action the initial TranslationMoveAction
     * @param diagram the associated diagram
     */
    constructor(action: TranslationMoveAction, diagram: Diagram) {
        const layoutedDiagram = diagram.layoutedDiagram;
        if (layoutedDiagram == undefined) {
            throw new Error("requires initial LayoutedDiagram");
        }
        let hasNewPoint = false;
        const generatorEntries = action.elements.flatMap((elementId) => {
            const element = layoutedDiagram.layoutElementLookup.get(elementId);
            if (element == undefined) {
                throw new Error(`Unknown point: ${elementId}`);
            }
            if (element.layoutConfig.type == CanvasElement.TYPE) {
                hasNewPoint = true;
            }
            return generatePointGeneratorEntries(element, diagram.document);
        });
        super(generatorEntries, diagram.document);
        this.hasNewPoint = hasNewPoint;
    }

    override applyActionToGenerator(
        action: TranslationMoveAction,
        generator: EditGenerator<number | Record<string, string>>,
        meta: any
    ): string {
        if (meta === "x") {
            return generator.generateEdit(action.offsetX);
        } else if (meta === "y") {
            return generator.generateEdit(action.offsetY);
        } else if (meta === "pos") {
            return generator.generateEdit({ pos: `apos(${action.offsetX}, ${action.offsetY})` });
        } else {
            throw new Error(`Unknown meta information for TranslationMoveEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        layoutedDiagram: LayoutedDiagram,
        lastApplied: TranslationMoveAction,
        newest: TranslationMoveAction
    ): void {
        if (this.hasNewPoint) {
            return;
        }
        const deltaX = newest.offsetX - lastApplied.offsetX;
        const deltaY = newest.offsetY - lastApplied.offsetY;
        for (const pointId of newest.elements) {
            const point = layoutedDiagram.elementLookup.get(pointId);
            if (point != undefined) {
                if (AbsolutePoint.isAbsolutePoint(point)) {
                    point.x += deltaX;
                    point.y += deltaY;
                } else if (RelativePoint.isRelativePoint(point)) {
                    point.offsetX += deltaX;
                    point.offsetY += deltaY;
                }
            }
        }
    }
}

import { LayoutElement } from "@hylimo/diagram";
import { AbsolutePoint, RelativePoint, TranslationMoveAction } from "@hylimo/diagram-common";
import { Diagram } from "../../diagram";
import { EditGeneratorEntry } from "../editGeneratorEntry";
import { EditGenerator } from "../generators/editGenerator";
import { TransactionalEdit } from "../transactionalEdit";
import { generateDeltaNumberGenerator } from "./generateDeltaNumberGenerator";

/**
 * Generates EditGeneratorEntries for absolute and relative points
 *
 * @param point the point to modify
 * @returns EditGeneratorEntries for "x" and "y"
 */
function generatePointGeneratorEntries(point: LayoutElement): EditGeneratorEntry[] {
    if (point.layoutConfig.type === AbsolutePoint.TYPE) {
        return [
            generateDeltaNumberGenerator(point.element.getLocalFieldOrUndefined("x")!, "x"),
            generateDeltaNumberGenerator(point.element.getLocalFieldOrUndefined("y")!, "y")
        ];
    } else if (point.layoutConfig.type === RelativePoint.TYPE) {
        return [
            generateDeltaNumberGenerator(point.element.getLocalFieldOrUndefined("offsetX")!, "x"),
            generateDeltaNumberGenerator(point.element.getLocalFieldOrUndefined("offsetY")!, "y")
        ];
    } else {
        throw new Error(`Unknown point type: ${point.layoutConfig.type}`);
    }
}

/**
 * TransactionalEdit for TranslationMoveActions
 */
export class TranslationMoveEdit extends TransactionalEdit<TranslationMoveAction> {
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
        const generatorEntries = action.points.flatMap((pointId) => {
            const point = layoutedDiagram.layoutElementLookup.get(pointId);
            if (point == undefined) {
                throw new Error(`Unknown point: ${pointId}`);
            }
            return generatePointGeneratorEntries(point);
        });
        super(generatorEntries, diagram.document);
    }

    applyActionToGenerator(action: TranslationMoveAction, generator: EditGenerator<number>, meta: any): string {
        if (meta === "x") {
            return generator.generateEdit(action.offsetX);
        } else if (meta === "y") {
            return generator.generateEdit(action.offsetY);
        } else {
            throw new Error(`Unknown meta information for TranslationMoveEdit: ${meta}`);
        }
    }
}

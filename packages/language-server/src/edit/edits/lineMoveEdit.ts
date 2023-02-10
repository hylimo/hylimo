import { LayoutedDiagram } from "@hylimo/diagram";
import { LineMoveAction, LinePoint } from "@hylimo/diagram-common";
import { Diagram } from "../../diagram";
import { EditGenerator } from "../generators/editGenerator";
import { TransactionalEdit } from "../transactionalEdit";
import { generateReplacementNumberGenerator } from "./generateReplacementNumberGenerator";

/**
 * TransactionalEdit for LineMoveActions
 */
export class LineMoveEdit extends TransactionalEdit<LineMoveAction> {
    /**
     * Creates a new LineMoveEdit based on an initial action and the used diagram
     * Requires that the diagram was already layouted
     *
     * @param action the initial LineMoveAction
     * @param diagram the associated diagram
     */
    constructor(action: LineMoveAction, diagram: Diagram) {
        const layoutedDiagram = diagram.layoutedDiagram;
        if (layoutedDiagram == undefined) {
            throw new Error("requires initial LayoutedDiagram");
        }
        const point = layoutedDiagram.layoutElementLookup.get(action.point);
        if (point?.layoutConfig.type !== LinePoint.TYPE) {
            throw new Error("Only LinePoints are supported");
        }
        const generatorEntries = [
            generateReplacementNumberGenerator(point.element.getLocalFieldOrUndefined("pos")!, "pos")
        ];
        if (action.distance != undefined) {
            generatorEntries.push(
                generateReplacementNumberGenerator(point.element.getLocalFieldOrUndefined("distance")!, "distance")
            );
        }
        super(generatorEntries, diagram.document);
    }

    override applyActionToGenerator(action: LineMoveAction, generator: EditGenerator<number>, meta: any): string {
        if (meta === "pos") {
            return generator.generateEdit(action.pos);
        } else if (meta === "distance") {
            return generator.generateEdit(action.distance!);
        } else {
            throw new Error(`Unknown meta information for LineMoveEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        layoutedDiagram: LayoutedDiagram,
        lastApplied: LineMoveAction,
        newest: LineMoveAction
    ): void {
        const point = layoutedDiagram.elementLookup.get(newest.point);
        if (point != undefined && LinePoint.isLinePoint(point)) {
            point.pos = newest.pos;
        }
    }
}

import { LayoutedDiagram } from "@hylimo/diagram";
import { CanvasElement, RotationAction } from "@hylimo/diagram-common";
import { Diagram } from "../../diagram";
import { EditGenerator } from "../generators/editGenerator";
import { TransactionalEdit } from "../transactionalEdit";
import { generateReplacementNumberGenerator } from "./generateReplacementNumberGenerator";

/**
 * Edit for RotationAction
 */
export class RotationEdit extends TransactionalEdit<RotationAction> {
    /**
     * Creates a new RotationEdit based on initial action and the used diagram
     * Requires that the diagram was already layouted
     *
     * @param action the initial RotationAction
     * @param diagram the associated diagram
     */
    constructor(action: RotationAction, diagram: Diagram) {
        const layoutedDiagram = diagram.layoutedDiagram;
        if (layoutedDiagram == undefined) {
            throw new Error("requires initial LayoutedDiagram");
        }
        const canvasElement = layoutedDiagram.layoutElementLookup.get(action.element);
        if (canvasElement?.layoutConfig.type !== CanvasElement.TYPE) {
            throw new Error("Only CanvasElements are supported");
        }
        const generatorEntries = [
            generateReplacementNumberGenerator(canvasElement.element.getLocalFieldOrUndefined("rotation")!, "rotation")
        ];
        super(generatorEntries, diagram.document);
    }

    override applyActionToGenerator(action: RotationAction, generator: EditGenerator<number>, meta: any): string {
        if (meta === "rotation") {
            return generator.generateEdit(action.rotation);
        } else {
            throw new Error(`Unknown meta information for RotationEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        layoutedDiagram: LayoutedDiagram,
        lastApplied: RotationAction,
        newest: RotationAction
    ): void {
        const element = layoutedDiagram.elementLookup.get(newest.element);
        if (element != undefined && CanvasElement.isCanvasElement(element)) {
            element.rotation = newest.rotation;
        }
    }
}

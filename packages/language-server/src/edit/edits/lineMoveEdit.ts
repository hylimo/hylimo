import { DiagramLayoutResult } from "@hylimo/diagram";
import { IncrementalUpdate, LineMoveAction, LinePoint } from "@hylimo/diagram-common";
import { EditGenerator } from "../generators/editGenerator";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { generateReplacementNumberGenerator } from "./generateReplacementNumberGenerator";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit";

/**
 * TransactionalEdit for LineMoveActions
 */
export interface LineMoveEdit extends TransactionalEdit {
    type: typeof LineMoveEdit.TYPE;
}

export namespace LineMoveEdit {
    export const TYPE = "lineMoveEdit";

    /**
     * Creates a LineMoveEdit from a LineMoveAction and a LayoutedDiagram
     *
     * @param action the action which created the edit
     * @param diagram the diagram the action was applied to
     * @returns the created LineMoveEdit
     */
    export function create(action: LineMoveAction, diagram: DiagramLayoutResult): LineMoveEdit {
        const point = diagram.layoutElementLookup.get(action.point);
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
        return {
            type: LineMoveEdit.TYPE,
            generatorEntries
        };
    }
}

/**
 * EditEngine for LineMoveEdits
 */
export class LineMoveEditEngine extends TransactionalEditEngine<LineMoveAction, LineMoveEdit> {
    /**
     * Creates a new LineMoveEditEngine
     *
     * @param generatorRegistry the generator registry to use
     */
    constructor(generatorRegistry: GeneratorRegistry) {
        super(LineMoveEdit.TYPE, LineMoveAction.KIND, generatorRegistry);
    }

    override applyActionToGenerator(
        edit: LineMoveEdit,
        action: LineMoveAction,
        generator: EditGenerator,
        meta: any
    ): string {
        if (meta === "pos") {
            return this.generatorRegistory.generateEdit(action.pos, generator);
        } else if (meta === "distance") {
            return this.generatorRegistory.generateEdit(action.distance!, generator);
        } else {
            throw new Error(`Unknown meta information for LineMoveEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        edit: LineMoveEdit,
        layoutedDiagram: DiagramLayoutResult,
        lastApplied: LineMoveAction | undefined,
        newest: LineMoveAction
    ): IncrementalUpdate[] {
        const point = layoutedDiagram.elementLookup[newest.point];
        if (point != undefined && LinePoint.isLinePoint(point)) {
            point.pos = newest.pos;
            return [
                {
                    target: point.id,
                    changes: {
                        pos: newest.pos
                    }
                }
            ];
        } else {
            return [];
        }
    }
}

import { LayoutedDiagram } from "@hylimo/diagram";
import { LinePoint } from "@hylimo/diagram-common";
import { LineMoveAction, IncrementalUpdate, DynamicLanguageServerConfig } from "@hylimo/diagram-protocol";
import { EditGenerator } from "../generators/editGenerator";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { generateReplacementNumberGenerator } from "./generateReplacementNumberGenerator";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit";
import { EditGeneratorEntry } from "./editGeneratorEntry";

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
    export function create(action: LineMoveAction, diagram: LayoutedDiagram): LineMoveEdit {
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
        if (action.segment != undefined) {
            generatorEntries.push(
                generateReplacementNumberGenerator(point.element.getLocalFieldOrUndefined("segment")!, "segment")
            );
        }
        return {
            type: LineMoveEdit.TYPE,
            generatorEntries: EditGeneratorEntry.sortAndValidate(generatorEntries)
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
        } else if (meta === "segment") {
            return this.generatorRegistory.generateEdit(action.segment!, generator);
        } else {
            throw new Error(`Unknown meta information for LineMoveEdit: ${meta}`);
        }
    }

    override predictActionDiff(
        edit: LineMoveEdit,
        layoutedDiagram: LayoutedDiagram,
        lastApplied: LineMoveAction | undefined,
        newest: LineMoveAction
    ): IncrementalUpdate[] {
        const point = layoutedDiagram.elementLookup[newest.point];
        if (point != undefined && LinePoint.isLinePoint(point)) {
            point.pos = newest.pos;
            point.distance = newest.distance;
            point.segment = newest.segment;
            return [
                {
                    target: point.id,
                    changes: {
                        pos: newest.pos,
                        distance: newest.distance,
                        segment: newest.segment
                    }
                }
            ];
        } else {
            return [];
        }
    }

    override transformAction(action: LineMoveAction, config: DynamicLanguageServerConfig): LineMoveAction {
        return {
            ...action,
            pos: this.round(action.pos, config.settings.linePointPosPrecision),
            distance:
                action.distance != undefined
                    ? this.round(action.distance, config.settings.linePointDistancePrecision)
                    : undefined
        };
    }
}

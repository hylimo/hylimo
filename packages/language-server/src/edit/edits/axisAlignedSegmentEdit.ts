import { BaseDiagramLayoutResult, DiagramLayoutResult } from "@hylimo/diagram";
import { AxisAlignedSegmentEditAction, CanvasAxisAlignedSegment, IncrementalUpdate } from "@hylimo/diagram-common";
import { EditGenerator } from "../generators/editGenerator";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { generateReplacementNumberGenerator } from "./generateReplacementNumberGenerator";
import { TransactionalEdit, TransactionalEditEngine } from "./transactionalEdit";

/**
 * Edit for AxisAlignedSegmentEditAction
 */
export interface AxisAlignedSegmentEdit extends TransactionalEdit {
    type: typeof AxisAlignedSegmentEdit.TYPE;
}

export namespace AxisAlignedSegmentEdit {
    export const TYPE = "axisAlignedSegmentEdit";

    /**
     * Creates an AxisAlignedSegmentEdit from an AxisAlignedSegmentEditAction and a LayoutedDiagram
     *
     * @param action the action which created the edit
     * @param diagram the diagram the action was applied to
     * @returns the created AxisAlignedSegmentEdit
     */
    export function create(action: AxisAlignedSegmentEditAction, diagram: DiagramLayoutResult): AxisAlignedSegmentEdit {
        const canvasElement = diagram.layoutElementLookup.get(action.element);
        if (canvasElement?.layoutConfig.type !== CanvasAxisAlignedSegment.TYPE) {
            throw new Error("Only CanvasElements are supported");
        }
        const verticalPosField = canvasElement.element.getLocalFieldOrUndefined("verticalPos");
        if (verticalPosField == undefined) {
            throw new Error("verticalPos field not found");
        }
        const generatorEntry = generateReplacementNumberGenerator(verticalPosField, "verticalPos");
        return {
            type: AxisAlignedSegmentEdit.TYPE,
            generatorEntries: [generatorEntry]
        };
    }
}

/**
 * EditEngine for AxisAlignedSegmentEdits
 */
export class AxisAlignedSegmentEditEngine extends TransactionalEditEngine<
    AxisAlignedSegmentEditAction,
    AxisAlignedSegmentEdit
> {
    /**
     * Creates a new AxisAlignedSegmentEditEngine
     *
     * @param generatorRegistry the generator registry to use
     */
    constructor(generatorRegistry: GeneratorRegistry) {
        super(AxisAlignedSegmentEdit.TYPE, AxisAlignedSegmentEditAction.KIND, generatorRegistry);
    }

    protected override applyActionToGenerator(
        edit: AxisAlignedSegmentEdit,
        action: AxisAlignedSegmentEditAction,
        generator: EditGenerator,
        _meta: any
    ): string {
        return this.generatorRegistory.generateEdit(action.verticalPos, generator);
    }

    override predictActionDiff(
        edit: AxisAlignedSegmentEdit,
        layoutedDiagram: BaseDiagramLayoutResult,
        lastApplied: AxisAlignedSegmentEditAction | undefined,
        newest: AxisAlignedSegmentEditAction
    ): IncrementalUpdate[] {
        const element = layoutedDiagram.elementLookup[newest.element];
        if (element != undefined && CanvasAxisAlignedSegment.isCanvasAxisAlignedSegment(element)) {
            element.verticalPos = newest.verticalPos;
            return [
                {
                    target: element.id,
                    changes: {
                        verticalPos: newest.verticalPos
                    }
                }
            ];
        } else {
            return [];
        }
    }
}

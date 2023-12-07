import { LayoutedDiagram } from "@hylimo/diagram";
import { BaseLayoutedDiagram, CanvasAxisAlignedSegment } from "@hylimo/diagram-common";
import { AxisAlignedSegmentEditAction, DynamicLanguageServerConfig, IncrementalUpdate } from "@hylimo/diagram-protocol";
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
    export function create(action: AxisAlignedSegmentEditAction, diagram: LayoutedDiagram): AxisAlignedSegmentEdit {
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
        return this.generatorRegistory.generateEdit(action.pos, generator);
    }

    override predictActionDiff(
        edit: AxisAlignedSegmentEdit,
        layoutedDiagram: BaseLayoutedDiagram,
        lastApplied: AxisAlignedSegmentEditAction | undefined,
        newest: AxisAlignedSegmentEditAction
    ): IncrementalUpdate[] {
        const element = layoutedDiagram.elementLookup[newest.element];
        if (element != undefined && CanvasAxisAlignedSegment.isCanvasAxisAlignedSegment(element)) {
            element.pos = newest.pos;
            return [
                {
                    target: element.id,
                    changes: {
                        pos: newest.pos
                    }
                }
            ];
        } else {
            return [];
        }
    }

    override transformAction(
        action: AxisAlignedSegmentEditAction,
        config: DynamicLanguageServerConfig
    ): AxisAlignedSegmentEditAction {
        return {
            ...action,
            pos: this.round(action.pos, config.settings.axisAlignedPosPrecision)
        };
    }
}

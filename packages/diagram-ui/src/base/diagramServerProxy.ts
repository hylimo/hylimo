import {
    AxisAlignedSegmentEditAction,
    LineMoveAction,
    ResizeAction,
    RotationAction,
    TranslationMoveAction
} from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { ActionHandlerRegistry, DiagramServerProxy as SprottyDiagramServerProxy } from "sprotty";

/**
 * DiagramServerProxy which handles additional commands
 */
@injectable()
export abstract class DiagramServerProxy extends SprottyDiagramServerProxy {
    override initialize(registry: ActionHandlerRegistry): void {
        super.initialize(registry);

        registry.register(TranslationMoveAction.KIND, this);
        registry.register(LineMoveAction.KIND, this);
        registry.register(RotationAction.KIND, this);
        registry.register(ResizeAction.KIND, this);
        registry.register(AxisAlignedSegmentEditAction.KIND, this);
    }
}

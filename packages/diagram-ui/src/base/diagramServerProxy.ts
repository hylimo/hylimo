import { NavigateToSourceAction, TransactionalAction } from "@hylimo/diagram-protocol";
import { injectable } from "inversify";
import { ActionHandlerRegistry, DiagramServerProxy as SprottyDiagramServerProxy } from "sprotty";

/**
 * DiagramServerProxy which handles additional commands
 */
@injectable()
export abstract class DiagramServerProxy extends SprottyDiagramServerProxy {
    override initialize(registry: ActionHandlerRegistry): void {
        super.initialize(registry);

        registry.register(TransactionalAction.KIND, this);
        registry.register(NavigateToSourceAction.KIND, this);
    }
}

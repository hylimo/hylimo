import { injectable, inject } from "inversify";
import type { VNode } from "snabbdom";
import type { IVNodePostprocessor, SModelElementImpl } from "sprotty";
import { setAttr } from "sprotty";
import { TYPES } from "../types.js";
import type { TransactionStateProvider } from "../transaction/transactionStateProvider.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";

/**
 * IVNodePostprocessor that makes canvas contents that cannot be a target for a connection
 * invisible to mouse events.
 */
@injectable()
export class CreateConnectionVNodePostprocessor implements IVNodePostprocessor {
    /**
     * The transaction state provider that keeps track of the current transaction state.
     */
    @inject(TYPES.TransactionStateProvider) protected transactionStateProvider!: TransactionStateProvider;

    decorate(vnode: VNode, element: SModelElementImpl): VNode {
        if (element instanceof SCanvasElement || element instanceof SCanvasConnection) {
            if (this.transactionStateProvider.isInCreateConnectionTransaction && element.editExpression == undefined) {
                setAttr(vnode, "pointer-events", "none");
            }
        }
        return vnode;
    }

    postUpdate(): void {}
}

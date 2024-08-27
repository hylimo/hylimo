import { inject } from "inversify";
import { MouseListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { DefaultEditTypes, LineEngine } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment.js";
import { SplitCanvasSegmentEdit, TransactionalAction } from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { TransactionIdProvider } from "../transaction/transactionIdProvider.js";

/**
 * Listener for splitting canvas connection segments by shift-clicking on them
 */
export class SplitCanvasSegmentMouseListener extends MouseListener {
    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (event.shiftKey && target instanceof SCanvasConnection) {
            const canvas = target.parent;
            const coordinates = canvas.getEventCoordinates(event);
            const projectedPoint = LineEngine.DEFAULT.projectPoint(coordinates, target.line);
            const originSegmentId = target.line.line.segments[projectedPoint.segment].origin;
            const originSegment = target.root.index.getById(originSegmentId) as SCanvasConnectionSegment;
            const splitEdit = originSegment.edits[DefaultEditTypes.SPLIT_CANVAS_SEGMENT];
            if (splitEdit != undefined) {
                const edit: SplitCanvasSegmentEdit = {
                    types: [DefaultEditTypes.SPLIT_CANVAS_SEGMENT],
                    values: coordinates,
                    elements: [originSegmentId]
                };
                const action: TransactionalAction = {
                    kind: TransactionalAction.KIND,
                    transactionId: this.transactionIdProvider.generateId(),
                    sequenceNumber: 0,
                    commited: true,
                    edits: [edit]
                };
                return [action];
            }
        }
        return [];
    }
}

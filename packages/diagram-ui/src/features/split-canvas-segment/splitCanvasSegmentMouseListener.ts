import { inject, injectable } from "inversify";
import { MouseListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import {
    DefaultEditTypes,
    EditSpecification,
    LineEngine,
    Math2D,
    Point,
    ProjectionResult
} from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment.js";
import {
    AxisAlignedSegmentEdit,
    Edit,
    SplitCanvasAxisAlignedSegmentEdit,
    SplitCanvasBezierSegmentEdit,
    SplitCanvasLineSegmentEdit,
    TransactionalAction
} from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { TransactionIdProvider } from "../transaction/transactionIdProvider.js";
import { SCanvasLineSegment } from "../../model/canvas/sCanvasLineSegment.js";
import { SCanvasAxisAlignedSegment } from "../../model/canvas/sCanvasAxisAlignedSegment.js";
import { SCanvasBezierSegment } from "../../model/canvas/sCanvasBezierSegment.js";
import { Bezier } from "bezier-js";
import { applyToPoint } from "transformation-matrix";
import { UpdateSplitConnectionPreviewDataAction } from "./updateSplitConnectionPreviewData.js";

/**
 * Listener for splitting canvas connection segments by shift-clicking on them
 */
@injectable()
export class SplitCanvasSegmentMouseListener extends MouseListener {
    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (!this.canSplit(target, event)) {
            return [];
        }
        const projectedPoint = this.projectOnConnection(target, event);
        const projectedCoordinates = LineEngine.DEFAULT.getPoint(projectedPoint.pos, undefined, 0, target.line);
        const segment = target.line.line.segments[projectedPoint.segment];
        const originSegment = target.index.getById(segment.origin) as SCanvasConnectionSegment;
        if (!originSegment.canSplitSegment()) {
            return [];
        }
        const edits = this.computeSegmentEdits(originSegment, {
            projectedCoordinates,
            segmentIndex: segment.originSegment,
            projectedPoint,
            target
        });
        const action: TransactionalAction = {
            kind: TransactionalAction.KIND,
            transactionId: this.transactionIdProvider.generateId(),
            sequenceNumber: 0,
            committed: true,
            edits
        };
        return [action];
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (!(target instanceof SCanvasConnection && target.selected)) {
            return [];
        }
        if (!this.canSplit(target, event)) {
            return [this.generateUnsetSplitPreviewDataAction(target)];
        }
        const projectedPoint = this.projectOnConnection(target, event);
        const updateAction: UpdateSplitConnectionPreviewDataAction = {
            kind: UpdateSplitConnectionPreviewDataAction.KIND,
            connectionId: target.id,
            previewData: projectedPoint
        };
        return [updateAction];
    }

    override mouseOut(target: SModelElementImpl): Action[] {
        if (target instanceof SCanvasConnection && target.selected) {
            return [this.generateUnsetSplitPreviewDataAction(target)];
        }
        return [];
    }

    /**
     * Checks if a target could be split by the event
     *
     * @param target the target to check
     * @param event the event to check
     * @returns true if the target could be split by the event
     */
    private canSplit(target: SModelElementImpl, event: MouseEvent): target is SCanvasConnection {
        return (
            event.shiftKey && target instanceof SCanvasConnection && !(event.ctrlKey || event.altKey) && target.selected
        );
    }

    /**
     * Projects the event on the connection
     *
     * @param target the target connection
     * @param event the event to project
     * @returns the projected point
     */
    private projectOnConnection(target: SCanvasConnection, event: MouseEvent) {
        const canvas = target.parent;
        const matrix = canvas.getMouseTransformationMatrix();
        const coordinates = applyToPoint(matrix, { x: event.clientX, y: event.clientY });
        const projectedPoint = LineEngine.DEFAULT.projectPoint(coordinates, target.line);
        return projectedPoint;
    }

    /**
     * Generates an action to unset the split preview data
     *
     * @param target the target connection
     * @returns the action to unset the split preview data
     */
    private generateUnsetSplitPreviewDataAction(target: SCanvasConnection): UpdateSplitConnectionPreviewDataAction {
        return {
            kind: UpdateSplitConnectionPreviewDataAction.KIND,
            connectionId: target.id,
            previewData: undefined
        };
    }

    /**
     * Computes the edits for splitting a segment
     *
     * @param originSegment the segment to split
     * @param context the context for the edit computation
     * @returns the edits for splitting the segment
     */
    private computeSegmentEdits(originSegment: SCanvasConnectionSegment, context: SplitSegmentEditContext): Edit[] {
        if (originSegment instanceof SCanvasLineSegment) {
            return this.computeLineEdits(originSegment, context);
        } else if (originSegment instanceof SCanvasAxisAlignedSegment) {
            return this.computeAxisAlignedEdits(originSegment, context);
        } else if (originSegment instanceof SCanvasBezierSegment) {
            return this.computeBezierEdits(originSegment, context);
        } else {
            throw new Error("Unknown segment type");
        }
    }

    /**
     * Computes the edits for a line segment
     *
     * @param originSegment the origin line segment
     * @param context the context for the edit computation
     * @returns the edits for the line segment
     */
    private computeLineEdits(
        originSegment: SCanvasLineSegment,
        { projectedCoordinates }: SplitSegmentEditContext
    ): Edit[] {
        return [
            {
                types: [DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT],
                values: projectedCoordinates,
                elements: [originSegment.id]
            } satisfies SplitCanvasLineSegmentEdit
        ];
    }

    /**
     * Computes the edits for a bezier segment
     *
     * @param originSegment the origin bezier segment
     * @param context the context for the edit computation
     * @returns the edits for the bezier segment
     */
    private computeBezierEdits(
        originSegment: SCanvasBezierSegment,
        { target, projectedPoint, projectedCoordinates }: SplitSegmentEditContext
    ): Edit[] {
        const index = target.segments.indexOf(originSegment);
        const layout = target.layout.segments[index];
        const curve = new Bezier(
            layout.start,
            originSegment.startControlPointPosition,
            originSegment.endControlPointPosition,
            layout.end
        );
        const derivative = curve.derivative(projectedPoint.relativePos);
        const scaledDerivative = Math2D.scaleTo(derivative, 100);
        return [
            {
                types: [DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT],
                values: {
                    ...projectedCoordinates,
                    cx1: scaledDerivative.x,
                    cy1: scaledDerivative.y,
                    cx2: -scaledDerivative.x,
                    cy2: -scaledDerivative.y
                },
                elements: [originSegment.id]
            } satisfies SplitCanvasBezierSegmentEdit
        ];
    }

    /**
     * Computes the edit for an axis-aligned segment
     *
     * @param originSegment the origin axis-aligned segment
     * @param context the context for the edit computation
     * @returns the edits for the axis-aligned segment
     */
    private computeAxisAlignedEdits(
        originSegment: SCanvasAxisAlignedSegment,
        { projectedPoint, projectedCoordinates, segmentIndex }: SplitSegmentEditContext
    ): Edit[] {
        const edits: Edit[] = [];
        const { pos, nextPos } = this.calculatePosAndNextPos(segmentIndex, originSegment, projectedPoint);
        edits.push({
            types: [DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT],
            values: {
                ...projectedCoordinates,
                pos,
                nextPos
            },
            elements: [originSegment.id]
        } satisfies SplitCanvasAxisAlignedSegmentEdit);
        const editNextPos = originSegment.edits[DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS];
        const splitSegment = originSegment.edits[DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT];
        if (editNextPos != undefined && EditSpecification.isConsistent([[editNextPos], [splitSegment]])) {
            edits.push({
                types: [DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS],
                values: {
                    pos: nextPos
                },
                elements: [originSegment.id]
            } satisfies AxisAlignedSegmentEdit);
        }
        return edits;
    }

    /**
     * Calculates pos and nextPos for when splitting an axis-aligned segment into two parts
     *
     * @param segmentIndex the index of the sub-segment (0 to 2)
     * @param originSegment the original segment which should be split
     * @param projectedPoint the projected point on the segment
     * @returns an object containing the pos and nextPos values
     */
    private calculatePosAndNextPos(
        segmentIndex: number,
        originSegment: SCanvasAxisAlignedSegment,
        projectedPoint: ProjectionResult
    ): { pos: number; nextPos: number } {
        const originalPos = originSegment.pos;
        const relativePos = projectedPoint.relativePos;
        const invPos = originalPos + 1;
        if (segmentIndex == 0) {
            if (originalPos >= 0) {
                return {
                    pos: 1,
                    nextPos: (originalPos - relativePos * originalPos) / (1 - relativePos * originalPos)
                };
            } else {
                return {
                    pos: 0,
                    nextPos: (invPos - relativePos * invPos) / (1 - relativePos * invPos) - 1
                };
            }
        } else if (segmentIndex == 1) {
            if (originalPos >= 0) {
                return {
                    pos: 1,
                    nextPos: 0
                };
            } else {
                return {
                    pos: 0,
                    nextPos: -1
                };
            }
        } else {
            if (originalPos >= 0) {
                return {
                    pos: originalPos / (originalPos + relativePos * (1 - originalPos)),
                    nextPos: 0
                };
            } else {
                return {
                    pos: invPos / (invPos + relativePos * (1 - invPos)) - 1,
                    nextPos: -1
                };
            }
        }
    }
}

/**
 * Context required for computing the edits for splitting a segment
 */
interface SplitSegmentEditContext {
    /**
     * The projected coordinates of the point
     */
    projectedCoordinates: Point;
    /**
     * The index of the sub-segment of the origin segment
     */
    segmentIndex: number;
    /**
     * The projected point on the segment
     */
    projectedPoint: ProjectionResult;
    /**
     * The target canvas connection
     */
    target: SCanvasConnection;
}

import { inject } from "inversify";
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

/**
 * Listener for splitting canvas connection segments by shift-clicking on them
 */
export class SplitCanvasSegmentMouseListener extends MouseListener {
    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (event.shiftKey && target instanceof SCanvasConnection && !(event.ctrlKey || event.altKey)) {
            const canvas = target.parent;
            const coordinates = canvas.getEventCoordinates(event);
            const projectedPoint = LineEngine.DEFAULT.projectPoint(coordinates, target.line);
            const projectedCoordinates = LineEngine.DEFAULT.getPoint(projectedPoint.pos, undefined, 0, target.line);
            const segment = target.line.line.segments[projectedPoint.segment];
            const originSegment = target.index.getById(segment.origin) as SCanvasConnectionSegment;
            const edits = this.computeSegmentEdits(originSegment, {
                projectedCoordinates,
                segmentIndex: segment.originSegment,
                projectedPoint,
                target
            });
            if (edits.length == 0) {
                return [];
            }
            const action: TransactionalAction = {
                kind: TransactionalAction.KIND,
                transactionId: this.transactionIdProvider.generateId(),
                sequenceNumber: 0,
                commited: true,
                edits
            };
            return [action];
        }
        return [];
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
            const edit = originSegment.edits[DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT];
            if (edit != undefined && EditSpecification.isConsistent([[edit]])) {
                return [
                    {
                        types: [DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT],
                        values: context.projectedCoordinates,
                        elements: [originSegment.id]
                    } satisfies SplitCanvasLineSegmentEdit
                ];
            }
        } else if (originSegment instanceof SCanvasAxisAlignedSegment) {
            return this.computeAxisAlignedEdits(originSegment, context);
        } else if (originSegment instanceof SCanvasBezierSegment) {
            return this.computeBezierEdits(originSegment, context);
        } else {
            throw new Error("Unknown segment type");
        }
        return [];
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
        const edit = originSegment.edits[DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT];
        if (edit != undefined && EditSpecification.isConsistent([[edit]])) {
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
        return [];
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
        const edit = originSegment.edits[DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT];
        const edits: Edit[] = [];
        if (edit != undefined && EditSpecification.isConsistent([[edit]])) {
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
            if (editNextPos != undefined && EditSpecification.isConsistent([[editNextPos], [edit]])) {
                edits.push({
                    types: [DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS],
                    values: {
                        pos: nextPos
                    },
                    elements: [originSegment.id]
                } satisfies AxisAlignedSegmentEdit);
            }
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
            if (originalPos > 0) {
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
            if (originalPos > 0) {
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
            if (originalPos > 0) {
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

import { inject, injectable } from "inversify";
import type { SModelElementImpl } from "sprotty";
import { MouseListener } from "sprotty";
import type { Action } from "sprotty-protocol";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import type { Point, ProjectionResult } from "@hylimo/diagram-common";
import { DefaultEditTypes, EditSpecification, LineEngine, Math2D } from "@hylimo/diagram-common";
import type { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment.js";
import type { AxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import type { TransactionIdProvider } from "../transaction/transactionIdProvider.js";
import { SCanvasLineSegment } from "../../model/canvas/sCanvasLineSegment.js";
import { SCanvasAxisAlignedSegment } from "../../model/canvas/sCanvasAxisAlignedSegment.js";
import { SCanvasBezierSegment } from "../../model/canvas/sCanvasBezierSegment.js";
import { Bezier } from "bezier-js";
import { applyToPoint } from "transformation-matrix";
import { UpdateSplitConnectionPreviewDataAction } from "./updateSplitConnectionPreviewData.js";
import type { SplitSegmentMoveHandler } from "./handler/splitSegmentMoveHandler.js";
import { SplitLineSegmentMoveHandler } from "./handler/splitLineSegmentMoveHandler.js";
import type { Matrix } from "transformation-matrix";
import { SplitBezierSegmentMoveHandler } from "./handler/splitBezierSegmentMoveHandler.js";
import { SplitAxisAlignedSegmentMoveHandler } from "./handler/splitAxisAlignedSegmentMoveHandler.js";
import { TransactionalMoveAction } from "../move/transactionalMoveAction.js";
import { MoveEditCanvasContentMouseListener } from "../canvas-content-move-edit/moveEditCanvasContentMouseListener.js";
import { projectPointOnLine } from "../../base/projectPointOnLine.js";
import type { SettingsProvider } from "../settings/settingsProvider.js";

/**
 * Listener for splitting canvas connection segments by shift-clicking on them
 */
@injectable()
export class SplitCanvasSegmentMouseListener extends MouseListener {
    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    /**
     * The settings provider
     */
    @inject(TYPES.SettingsProvider) protected settingsProvider!: SettingsProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (!this.canSplit(target, event)) {
            return [];
        }
        const { projectedPoint, transformationMatrix } = this.projectOnConnection(target, event);
        const projectedCoordinates = LineEngine.DEFAULT.getPoint(projectedPoint.pos, undefined, 0, target.line);
        const segment = target.line.line.segments[projectedPoint.segment];
        const originSegment = target.index.getById(segment.origin) as SCanvasConnectionSegment;
        if (!originSegment.canSplitSegment()) {
            return [];
        }
        const context: SplitSegmentEditContext = {
            projectedCoordinates,
            segmentIndex: segment.originSegment,
            projectedPoint,
            transformationMatrix,
            target
        };
        const action: TransactionalMoveAction = {
            kind: TransactionalMoveAction.KIND,
            handlerProvider: () => this.createSegmentHandler(originSegment, context),
            maxUpdatesPerRevision: MoveEditCanvasContentMouseListener.MAX_UPDATES_PER_REVISION
        };
        return [action];
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (!(target instanceof SCanvasConnection && target.selected)) {
            return [];
        }
        const updateAction: UpdateSplitConnectionPreviewDataAction = {
            kind: UpdateSplitConnectionPreviewDataAction.KIND,
            connectionId: target.id,
            previewDataProvider: () => this.projectOnConnection(target, event).projectedPoint
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
     * @returns the projected point and the mouse transformation matrix
     */
    private projectOnConnection(
        target: SCanvasConnection,
        event: MouseEvent
    ): { projectedPoint: ProjectionResult; transformationMatrix: Matrix } {
        const canvas = target.parent;
        const transformationMatrix = canvas.getMouseTransformationMatrix();
        const coordinates = applyToPoint(transformationMatrix, { x: event.clientX, y: event.clientY });
        const projectedPoint = projectPointOnLine(
            coordinates,
            target.line,
            {
                posPrecision: this.settingsProvider.settings?.linePointPosPrecision,
                hasSegment: false
            },
            0
        );
        return { projectedPoint, transformationMatrix };
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
            previewDataProvider: undefined
        };
    }

    /**
     * Creates the edits for splitting a segment
     *
     * @param originSegment the segment to split
     * @param context the context for the edit computation
     * @returns the edits for splitting the segment
     */
    private createSegmentHandler(
        originSegment: SCanvasConnectionSegment,
        context: SplitSegmentEditContext
    ): SplitSegmentMoveHandler {
        if (originSegment instanceof SCanvasLineSegment) {
            return this.createLineHandler(originSegment, context);
        } else if (originSegment instanceof SCanvasAxisAlignedSegment) {
            return this.createAxisAlignedHandler(originSegment, context);
        } else if (originSegment instanceof SCanvasBezierSegment) {
            return this.createBezierHandler(originSegment, context);
        } else {
            throw new Error("Unknown segment type");
        }
    }

    /**
     * Creates the move handler for splitting a line segment
     *
     * @param originSegment the origin line segment
     * @param context the context for the edit computation
     * @returns the move handler for splitting the line segment
     */
    private createLineHandler(
        originSegment: SCanvasLineSegment,
        { transformationMatrix, projectedCoordinates }: SplitSegmentEditContext
    ): SplitLineSegmentMoveHandler {
        return new SplitLineSegmentMoveHandler(originSegment.id, transformationMatrix, projectedCoordinates);
    }

    /**
     * Creates the move handler for splitting a bezier segment
     *
     * @param originSegment the origin bezier segment
     * @param context the context for the edit computation
     * @returns the move handler for splitting the bezier segment
     */
    private createBezierHandler(
        originSegment: SCanvasBezierSegment,
        { target, projectedPoint, transformationMatrix, projectedCoordinates }: SplitSegmentEditContext
    ): SplitBezierSegmentMoveHandler {
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
        return new SplitBezierSegmentMoveHandler(
            originSegment.id,
            scaledDerivative.x,
            scaledDerivative.y,
            -scaledDerivative.x,
            -scaledDerivative.y,
            transformationMatrix,
            projectedCoordinates
        );
    }

    /**
     * Creates the move handler for splitting an axis-aligned segment
     *
     * @param originSegment the origin axis-aligned segment
     * @param context the context for the edit computation
     * @returns the move handler for splitting the axis-aligned segment
     */
    private createAxisAlignedHandler(
        originSegment: SCanvasAxisAlignedSegment,
        { projectedPoint, segmentIndex, transformationMatrix, projectedCoordinates }: SplitSegmentEditContext
    ): SplitAxisAlignedSegmentMoveHandler {
        const { pos, nextPos } = this.calculatePosAndNextPos(segmentIndex, originSegment, projectedPoint);
        const editNextPos = originSegment.edits[DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS];
        const splitSegment = originSegment.edits[DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT];
        let nextSegmentEdit: AxisAlignedSegmentEdit | undefined;
        if (editNextPos != undefined && EditSpecification.isConsistent([[editNextPos], [splitSegment]])) {
            nextSegmentEdit = {
                types: [DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS],
                values: {
                    pos: nextPos
                },
                elements: [originSegment.id]
            };
        }
        return new SplitAxisAlignedSegmentMoveHandler(
            originSegment.id,
            pos,
            nextPos,
            nextSegmentEdit,
            transformationMatrix,
            projectedCoordinates
        );
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
     * The mouse transformation matrix for the parent canvas
     */
    transformationMatrix: Matrix;
    /**
     * The target canvas connection
     */
    target: SCanvasConnection;
}

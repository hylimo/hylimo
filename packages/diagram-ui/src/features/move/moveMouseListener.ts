import { inject } from "inversify";
import {
    Math2D,
    EditSpecification,
    Point,
    DefaultEditTypes,
    EditSpecificationEntry,
    groupBy
} from "@hylimo/diagram-common";
import {
    findParentByFeature,
    isMoveable,
    isSelectable,
    MouseListener,
    SModelElementImpl,
    SModelRootImpl
} from "sprotty";
import { Action } from "sprotty-protocol";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint.js";
import { SCanvas } from "../../model/canvas/sCanvas.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { SLinePoint } from "../../model/canvas/sLinePoint.js";
import { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import { MoveHandler } from "./moveHandler.js";
import { TYPES } from "../types.js";
import { TransactionIdProvider } from "../transaction/transactionIdProvider.js";
import { TranslationMoveHandler } from "./translationMoveHandler.js";
import { LineMoveHandler } from "./lineMoveHandler.js";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import { CanvasElementView, ResizePosition } from "../../views/canvas/canvasElementView.js";
import { RotationHandler } from "./rotationHandler.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { SRoot } from "../../model/sRoot.js";
import { ElementsGroupedBySize, ResizeHandler } from "./resizeHandler.js";
import { SCanvasAxisAlignedSegment } from "../../model/canvas/sCanvasAxisAlignedSegment.js";
import { AxisAligedSegmentEditHandler } from "./axisAlignedSegmentEditHandler.js";
import { Matrix, compose, translate, applyToPoint } from "transformation-matrix";
import { MovedElementsSelector } from "./movedElementsSelector.js";

/**
 * The maximum number of updates that can be performed on the same revision.
 */
const maxUpdatesPerRevision = 5;

/**
 * If a resize scale exceeds this value, instead resize with scale 1 in the opposite direction is performed.
 */
const maxResizeScale = 10;

/**
 * Listener for mouse events to create move actions
 */
export class MoveMouseListener extends MouseListener {
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    /**
     * A transformation matrix which directly outputs dx/dy in the parent canvas coordinate system.
     */
    private transformationMatrix?: Matrix;
    /**
     * The target of the initial event
     */
    private targetElement?: Element;
    /**
     * Current moveHandler.
     * If null, creating a handler for the current move is not possible.
     */
    private moveHandler?: MoveHandler | null;
    /**
     * Sequence number for the next action.
     */
    private sequenceNumber = 0;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (event.button === 0 && !(event.ctrlKey || event.altKey)) {
            const moveableTarget = findParentByFeature(target, isMoveable);
            if (moveableTarget != undefined) {
                const parentCanvas = findParentByFeature(target, (element) => element instanceof SCanvas);
                if (parentCanvas == undefined) {
                    throw new Error("Cannot move an element without a parent canvas");
                }
                const matrix = parentCanvas.getMouseTransformationMatrix();
                const initialPoint = applyToPoint(matrix, { x: event.pageX, y: event.pageY });
                this.transformationMatrix = compose(translate(-initialPoint.x, -initialPoint.y), matrix);
                this.targetElement = event.target as Element | undefined;
            } else {
                this.transformationMatrix = undefined;
                this.targetElement = undefined;
            }
        }
        return [];
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (this.transformationMatrix != undefined) {
            const root = target.root as SRoot;
            if (this.moveHandler === undefined) {
                this.moveHandler = this.createHandler(target, this.targetElement);
                root.sequenceNumber = 0;
                this.sequenceNumber = 0;
            }
            const outstandingUpdates = this.sequenceNumber - root.sequenceNumber;
            if (this.moveHandler != undefined && outstandingUpdates < maxUpdatesPerRevision) {
                const translation = this.calculateTranslation(target, event);
                const result = this.moveHandler.generateAction(
                    translation.x,
                    translation.y,
                    this.sequenceNumber++,
                    false,
                    event
                );
                return [result];
            }
        }
        return [];
    }

    override mouseUp(target: SModelElementImpl, event: MouseEvent): Action[] {
        return this.commitMove(target, event);
    }

    override mouseEnter(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (event.buttons === 0) {
            return this.commitMove(target, event);
        } else {
            return [];
        }
    }

    /**
     * Commits the current mouse move
     * Removes the current move handler if present
     *
     * @param event last mouse event defining the last mouse position
     * @param target required for calculating the delta
     * @returns the generated actions
     */
    private commitMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (this.moveHandler === undefined || this.moveHandler === null) {
            this.transformationMatrix = undefined;
            this.moveHandler = undefined;
            return [];
        }
        const translation = this.calculateTranslation(target, event);
        const result = this.moveHandler.generateAction(
            translation.x,
            translation.y,
            this.sequenceNumber++,
            true,
            event
        );
        this.moveHandler = undefined;
        this.transformationMatrix = undefined;
        return [result];
    }

    /**
     * Calculates the translation based on a mouseEvent
     *
     * @param event defines the mouse position
     * @param target required for calculating the zoom level
     * @return the calculated translation
     */
    private calculateTranslation(target: SModelElementImpl, event: MouseEvent): Point {
        if (this.transformationMatrix == undefined) {
            throw new Error("Cannot calculate translation without a start position");
        }
        return applyToPoint(this.transformationMatrix, { x: event.pageX, y: event.pageY });
    }

    /**
     * Creats the handler for the current move
     *
     * @param target the element which was clicked
     * @param target the initial mouse down event
     * @returns the move handler if move is supported, otherwise null
     */
    private createHandler(target: SModelElementImpl, targetElement?: Element): MoveHandler | null {
        const classList = targetElement?.classList;
        if (target instanceof SCanvasElement && classList != undefined) {
            if (classList.contains(CanvasElementView.ROTATE_ICON_CLASS)) {
                return this.createRotationHandler(target);
            } else if (classList.contains(CanvasElementView.RESIZE_CLASS)) {
                return this.createResizeHandler(target, classList);
            }
        } else if (target instanceof SCanvasConnection && classList != undefined) {
            if (classList.contains(SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS_Y)) {
                return this.createAxisAlignedSegmentHandler(targetElement as HTMLElement, true);
            } else if (classList.contains(SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS_X)) {
                return this.createAxisAlignedSegmentHandler(targetElement as HTMLElement, false);
            }
        }
        return this.createMoveHandler(target);
    }

    /**
     * Creates a move handler for the given target.
     * Handles moving the vertical or horizontal pos of an axis aligned canvas connection segment
     *
     * @param targetElement the clicked svg element
     * @param vertical true if the vertical segment is moved, false if the horizontal segment is moved
     * @returns the move handler if move is supported, otherwise null
     */
    private createAxisAlignedSegmentHandler(
        targetElement: HTMLElement,
        vertical: boolean
    ): AxisAligedSegmentEditHandler | null {
        const dataset = targetElement.dataset;
        const id = dataset.id!;
        const start = Number.parseFloat(dataset.start!);
        const end = Number.parseFloat(dataset.end!);
        const current = Number.parseFloat(dataset.current!);
        return new AxisAligedSegmentEditHandler(
            id,
            this.transactionIdProvider.generateId(),
            current,
            start,
            end,
            vertical
        );
    }

    /**
     * Creates a move handler for the given target.
     * Handles resize events meaning resizing all selected canvas elements
     *
     * @param target the primary target of the resize
     * @param classList classes of the svg element on which the resize was triggered
     * @returns the resize handler if resize is supported, otherwise null
     */
    private createResizeHandler(target: SCanvasElement, classList: DOMTokenList): ResizeHandler | null {
        const resizedElements = this.getSelectedElements(target.root).filter(
            (element) => element instanceof SCanvasElement
        ) as SCanvasElement[];
        const scaleX = this.computeXResizeFactor(resizedElements, classList, target);
        const scaleY = this.computeYResizeFactor(resizedElements, classList, target);
        if (scaleX == undefined && scaleY == undefined) {
            return null;
        }
        const groupedElements = groupBy(resizedElements, (element) => {
            if (scaleX != undefined) {
                if (scaleY != undefined) {
                    return `${element.width}x${element.height}`;
                } else {
                    return element.width;
                }
            } else {
                return element.height;
            }
        });
        const { groupedEntries, elements } = this.computeResizeElements(groupedElements, scaleX, scaleY);
        if (!EditSpecification.isConsistent(groupedEntries)) {
            return null;
        }
        return new ResizeHandler(
            this.transactionIdProvider.generateId(),
            target.rotation,
            scaleX,
            scaleY,
            target.width,
            target.height,
            elements
        );
    }

    /**
     * For a resize, computes the grouped entries for consistency check and the grouped elements passed to the resize handler.
     * Assumes that groupedElements are grouped by scaleX and/or scaleY, depending on which is/are defined.
     *
     * @param groupedElements the elements grouped by size
     * @param scaleX the scale factor in x direction
     * @param scaleY the scale factor in y direction
     * @returns the grouped entries for consistency check and the grouped elements passed to the resize handler
     */
    private computeResizeElements(
        groupedElements: Map<string | number | undefined, SCanvasElement[]>,
        scaleX: number | undefined,
        scaleY: number | undefined
    ): { groupedEntries: EditSpecificationEntry[][]; elements: ElementsGroupedBySize[] } {
        const groupedEntries: EditSpecificationEntry[][] = [];
        const elements: ElementsGroupedBySize[] = [];
        for (const group of groupedElements.values()) {
            const entries: EditSpecificationEntry[] = [];
            let originalWidth: number | undefined = undefined;
            let originalHeight: number | undefined = undefined;
            if (scaleX != undefined) {
                entries.push(...group.map((element) => element.edits[DefaultEditTypes.RESIZE_WIDTH]));
                originalWidth = group[0].width;
            }
            if (scaleY != undefined) {
                entries.push(...group.map((element) => element.edits[DefaultEditTypes.RESIZE_HEIGHT]));
                originalHeight = group[0].height;
            }
            groupedEntries.push(entries);
            elements.push({
                elements: group.map((element) => element.id),
                originalWidth,
                originalHeight
            });
        }
        return { groupedEntries, elements };
    }

    /**
     * Computes the resize factor for the x direction.
     *
     * @param resizedElements the elements which are resized
     * @param classList classes of the svg element on which the resize was triggered
     * @param target the primary target of the resize
     * @returns the resize factor in x direction if possible, otherwise undefined
     */
    private computeXResizeFactor(
        resizedElements: SCanvasElement[],
        classList: DOMTokenList,
        target: SCanvasElement
    ): number | undefined {
        if (!resizedElements.every((element) => DefaultEditTypes.RESIZE_WIDTH in element.edits)) {
            return undefined;
        }
        let scaleX: number | undefined = undefined;
        if (classList.contains(ResizePosition.LEFT)) {
            scaleX = target.width / target.dx;
        } else if (classList.contains(ResizePosition.RIGHT)) {
            scaleX = target.width / (target.width + target.dx);
        }
        if (scaleX == undefined) {
            return undefined;
        }
        if (Math.abs(scaleX) > maxResizeScale) {
            scaleX = Math.sign(scaleX) * -1;
        }
        return scaleX;
    }

    /**
     * Computes the resize factor for the y direction.
     *
     * @param resizedElements the elements which are resized
     * @param classList classes of the svg element on which the resize was triggered
     * @param target the primary target of the resize
     * @returns the resize factor in y direction if possible, otherwise undefined
     */
    private computeYResizeFactor(
        resizedElements: SCanvasElement[],
        classList: DOMTokenList,
        target: SCanvasElement
    ): number | undefined {
        if (!resizedElements.every((element) => DefaultEditTypes.RESIZE_HEIGHT in element.edits)) {
            return undefined;
        }
        let scaleY: number | undefined = undefined;
        if (classList.contains(ResizePosition.TOP)) {
            scaleY = target.height / target.dy;
        } else if (classList.contains(ResizePosition.BOTTOM)) {
            scaleY = target.height / (target.height + target.dy);
        }
        if (scaleY == undefined) {
            return undefined;
        }
        if (Math.abs(scaleY) > maxResizeScale) {
            scaleY = Math.sign(scaleY) * -1;
        }
        return scaleY;
    }
    /**
     * Creates the handler for the current move based on the target.
     * Handles rotation events, meaning rotating CanvasElements.
     *
     * @param target the element to rotate
     * @returns the move handler if rotation is supported, otherwise null
     */
    private createRotationHandler(target: SCanvasElement): MoveHandler | null {
        if (!(DefaultEditTypes.ROTATE in target.edits)) {
            return null;
        }
        const origin = target.position;
        const distance = CanvasElementView.ROTATE_ICON_DISTANCE / findViewportZoom(target);
        const angleRad = (target.rotation / 180) * Math.PI;
        const handlePosition = Math2D.add(origin, Math2D.rotate({ x: 0, y: target.dy - distance }, angleRad));
        return new RotationHandler(target.id, this.transactionIdProvider.generateId(), origin, handlePosition);
    }

    /**
     * Creats the handler for the current move based on the selected elements.
     * Handles move events, meaning moving points on the canvas.
     *
     * @param target the element which was clicked
     * @returns the move handler if move is supported, otherwise null
     */
    private createMoveHandler(target: SModelElementImpl): MoveHandler | null {
        const selected = this.getSelectedElements(target.root).filter(
            (element) => element instanceof SCanvasPoint || element instanceof SCanvasElement
        ) as (SCanvasPoint | SCanvasElement)[];
        if (selected.length === 0) {
            return null;
        }

        const { movedPoints, movedElements, hasConflict } = new MovedElementsSelector(selected, target.index);
        if (hasConflict) {
            return null;
        }
        const editSpecifications = [...movedPoints, ...movedElements].flatMap((element) => {
            const entries: EditSpecificationEntry[] = [];
            if (element instanceof SLinePoint) {
                entries.push(element.edits[DefaultEditTypes.MOVE_LPOS_POS]);
                if (element.distance != undefined) {
                    entries.push(element.edits[DefaultEditTypes.MOVE_LPOS_DIST]);
                }
            } else {
                entries.push(element.edits[DefaultEditTypes.MOVE_X], element.edits[DefaultEditTypes.MOVE_Y]);
            }
            return entries;
        });
        if (!EditSpecification.isConsistent([editSpecifications])) {
            return null;
        }
        return this.createMoveHandlerForPointsAndElements(movedPoints, movedElements);
    }

    /**
     * Creates the move handler for moving the given points and elements.
     * If both line points and translateable elements (absolute & relative points, canvas elements) are given, null is returned.
     * If multiple line points are given, null is returned.
     * Otherwise, the corresponding handler is created and returned.
     *
     * @param pointsToMove the points to move
     * @param elements the elements to move
     * @returns the created move handler or null if no handler could be created
     */
    private createMoveHandlerForPointsAndElements(
        pointsToMove: Set<SCanvasPoint>,
        elements: Set<SCanvasElement>
    ): MoveHandler | null {
        let hasTranslatablePoint = elements.size > 0;
        let hasLinePoint = false;
        for (const point of pointsToMove) {
            if (point instanceof SRelativePoint || point instanceof SAbsolutePoint) {
                hasTranslatablePoint = true;
            } else if (point instanceof SLinePoint) {
                hasLinePoint = true;
            }
        }
        if (hasLinePoint && hasTranslatablePoint) {
            return null;
        }
        if (hasTranslatablePoint) {
            return new TranslationMoveHandler(
                [...pointsToMove, ...elements].map((point) => point.id),
                this.transactionIdProvider.generateId()
            );
        } else if (hasLinePoint) {
            if (pointsToMove.size !== 1) {
                return null;
            }
            const [linePoint] = pointsToMove as Set<SLinePoint>;
            return new LineMoveHandler(
                linePoint.id,
                this.transactionIdProvider.generateId(),
                linePoint.position,
                linePoint.edits[DefaultEditTypes.MOVE_LPOS_DIST] == undefined,
                linePoint.segment != undefined,
                linePoint.line
            );
        } else {
            return null;
        }
    }

    /**
     * Gets all elements which are selected.
     *
     * @param root the root element of the model
     * @returns all selected elements
     */
    private getSelectedElements(root: SModelRootImpl): SModelElementImpl[] {
        return [...root.index.all().filter((child) => isSelectable(child) && child.selected)];
    }
}

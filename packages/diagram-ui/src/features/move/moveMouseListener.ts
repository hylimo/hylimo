import { inject } from "inversify";
import {
    LinePoint,
    Math2D,
    EditSpecification,
    Point,
    DefaultEditTypes,
    EditSpecificationEntry,
    groupBy
} from "@hylimo/diagram-common";
import {
    findParentByFeature,
    IModelIndex,
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
import { SCanvasContent } from "../../model/canvas/sCanvasContent.js";
import { SRoot } from "../../model/sRoot.js";
import { ElementsGroupedBySize, ResizeHandler } from "./resizeHandler.js";
import { SCanvasAxisAlignedSegment } from "../../model/canvas/sCanvasAxisAlignedSegment.js";
import { AxisAligedSegmentEditHandler } from "./axisAlignedSegmentEditHandler.js";

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
     * Position where mouseDown occured
     */
    private startPosition?: Point;
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
        if (event.button === 0) {
            const moveableTarget = findParentByFeature(target, isMoveable);
            if (moveableTarget != undefined) {
                this.startPosition = { x: event.pageX, y: event.pageY };
                this.targetElement = event.target as Element | undefined;
            } else {
                this.startPosition = undefined;
                this.targetElement = undefined;
            }
        }
        return [];
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (this.startPosition) {
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
            this.startPosition = undefined;
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
        this.startPosition = undefined;
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
        if (this.startPosition == undefined) {
            throw new Error("Cannot calculate translation without a start position");
        }
        const zoom = findViewportZoom(target);
        return {
            x: (event.pageX - this.startPosition.x) / zoom,
            y: (event.pageY - this.startPosition.y) / zoom
        };
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
            scaleX = target.width / target.x;
        } else if (classList.contains(ResizePosition.RIGHT)) {
            scaleX = target.width / (target.width + target.x);
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
            scaleY = target.height / target.y;
        } else if (classList.contains(ResizePosition.BOTTOM)) {
            scaleY = target.height / (target.height + target.y);
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
        const handlePosition = Math2D.add(origin, Math2D.rotate({ x: 0, y: target.y - distance }, angleRad));
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
        const index = target.root.index;
        const selected = this.getSelectedElements(target.root).filter(
            (element) => element instanceof SCanvasPoint || element instanceof SCanvasElement
        ) as (SCanvasPoint | SCanvasElement)[];
        if (selected.length === 0) {
            return null;
        }
        const canvases = new Set(selected.map((element) => element.parent));
        if (canvases.size > 1) {
            return null;
        }
        const canvas = canvases.values().next().value;
        if (!(canvas instanceof SCanvas)) {
            return null;
        }
        const { points, elements } = this.computePoints(selected, index);
        const { points: pointsToMove, elements: elementsToMove } = this.getPointsAndElementsToMove(
            points,
            index,
            elements
        );

        const editSpecifications = [...pointsToMove, ...elementsToMove].flatMap((element) => {
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
        return this.createMoveHandlerForPointsAndElements(pointsToMove, elementsToMove);
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
        pointsToMove: SCanvasPoint[],
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
            if (pointsToMove.length !== 1) {
                return null;
            }
            const linePoint = pointsToMove[0] as SLinePoint;
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
     * Gets the points and elements which are required to move so that points are moved as a whole.
     * Returns the points which should be moved, and elements without points which should be moved
     *
     * @param points the points to move
     * @param index used for point lookup
     * @param elements elements which are moved by creating a new point
     * @returns the points and elements which are required to move to move the given points
     */
    private getPointsAndElementsToMove(
        points: Set<SCanvasPoint>,
        index: IModelIndex,
        elements: Set<SCanvasElement>
    ): { points: SCanvasPoint[]; elements: Set<SCanvasElement> } {
        const movedPoints = new Set(points);
        const movedElements = new Set(elements);
        let currentPoints: Set<SCanvasPoint> = points;
        do {
            const newPoints = new Set<SCanvasPoint>();
            for (const point of currentPoints) {
                const editable = DefaultEditTypes.MOVE_X in point.edits && DefaultEditTypes.MOVE_Y in point.edits;
                if (point instanceof SRelativePoint && !editable) {
                    let targetPoint: SCanvasPoint | undefined;
                    const target = index.getById(point.target) as SCanvasPoint | SCanvasElement;
                    if (target instanceof SCanvasPoint) {
                        targetPoint = target;
                    } else {
                        if (target.pos != undefined) {
                            targetPoint = index.getById(target.pos) as SCanvasPoint;
                        } else {
                            movedElements.add(target);
                        }
                    }
                    if (targetPoint != undefined) {
                        newPoints.add(targetPoint);
                        movedPoints.add(targetPoint);
                    }
                }
            }
            currentPoints = newPoints;
        } while (currentPoints.size > 0);

        const toMove = [...movedPoints].filter(
            (point) => !this.isPointImplicitelyMoved(point, index, movedPoints, elements)
        );
        return { points: toMove, elements: movedElements };
    }

    /**
     * Computes the points to move based on the selected elements.
     * Returns the points which are moved, and elements without points which are moved
     *
     * @param selected the selected elements
     * @param index index for element lookup
     * @returns the extracted points and elements without a position
     */
    private computePoints(
        selected: (SCanvasElement | SCanvasPoint)[],
        index: IModelIndex
    ): { points: Set<SCanvasPoint>; elements: Set<SCanvasElement> } {
        const points = new Set<SCanvasPoint>();
        const elements = new Set<SCanvasElement>();
        selected.map((element) => {
            if (element instanceof SCanvasPoint) {
                points.add(element);
            } else if (element instanceof SCanvasElement) {
                if (element.pos != undefined) {
                    points.add(index.getById(element.pos) as SCanvasPoint);
                } else {
                    elements.add(element);
                }
            } else {
                throw new Error("This should not be reachable");
            }
        });
        return { points, elements };
    }

    /**
     * Checks if a point is moved.
     *
     * @param point the point to check
     * @param index index for element lookup
     * @param movedPoints all points which are moved
     * @param movedElements elements which are moved without a position
     * @returns true if the point is moved, otherwise false
     */
    private isPointMoved(
        point: SCanvasPoint,
        index: IModelIndex,
        movedPoints: Set<SCanvasPoint>,
        movedElements: Set<SCanvasElement>
    ): boolean {
        if (movedPoints.has(point)) {
            return true;
        } else {
            return this.isPointImplicitelyMoved(point, index, movedPoints, movedElements);
        }
    }

    /**
     * Checks if an element is moved.
     * An element is moved if it has a position and the position is moved, or if it is in the set of moved elements.
     *
     * @param element the element to check
     * @param index index for element lookup
     * @param movedPoints all points which are moved
     * @param movedElements elements which are moved without a position
     * @returns true if the element is moved, otherwise false
     */
    private isElementMoved(
        element: SCanvasElement,
        index: IModelIndex,
        movedPoints: Set<SCanvasPoint>,
        movedElements: Set<SCanvasElement>
    ): boolean {
        if (element.pos != undefined) {
            return this.isPointMoved(index.getById(element.pos) as SCanvasPoint, index, movedPoints, movedElements);
        } else {
            return movedElements.has(element);
        }
    }

    /**
     * Checks if a point is a relative point and if the target is moved.
     *
     * @param point the point to check
     * @param index index for element lookup
     * @param movedPoints all points which are moved
     * @param movedElements elements which are moved without a position
     * @returns true if the point is a relative point and the target is moved, otherwise false
     */
    private isPointImplicitelyMoved(
        point: SCanvasPoint,
        index: IModelIndex,
        movedPoints: Set<SCanvasPoint>,
        movedElements: Set<SCanvasElement>
    ): boolean {
        if (point instanceof SRelativePoint) {
            const target = index.getById(point.target) as SCanvasPoint | SCanvasElement;
            if (target instanceof SCanvasPoint) {
                return this.isPointMoved(target, index, movedPoints, movedElements);
            } else {
                return this.isElementMoved(target, index, movedPoints, movedElements);
            }
        } else if (point instanceof SLinePoint) {
            const lineProviderId = point.lineProvider;
            const lineProvider = index.getById(lineProviderId) as SCanvasContent;
            if (lineProvider instanceof SCanvasElement) {
                return this.isElementMoved(lineProvider, index, movedPoints, movedElements);
            }
            if (lineProvider instanceof SCanvasConnection) {
                const affectedSegment = LinePoint.calcSegmentIndex(point.pos, lineProvider.segments.length);
                const points = [lineProvider.start, ...lineProvider.segments.map((segment) => segment.end)];
                const relevantPoints = [
                    index.getById(points[affectedSegment]),
                    index.getById(points[affectedSegment + 1])
                ] as SCanvasPoint[];
                return relevantPoints.every((point) => this.isPointMoved(point, index, movedPoints, movedElements));
            }
        }
        return false;
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

import { inject } from "inversify";
import { LinePoint, ModificationSpecification, Point } from "@hylimo/diagram-common";
import {
    findParentByFeature,
    IModelIndex,
    isMoveable,
    isSelectable,
    MouseListener,
    SModelElement,
    SModelRoot
} from "sprotty";
import { Action } from "sprotty-protocol";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint";
import { SCanvas } from "../../model/canvas/sCanvas";
import { SCanvasElement } from "../../model/canvas/sCanvasElement";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint";
import { SLinePoint } from "../../model/canvas/sLinePoint";
import { SRelativePoint } from "../../model/canvas/sRelativePoint";
import { MoveHandler } from "./moveHandler";
import { TYPES } from "../types";
import { TransactionIdProvider } from "../transaction/transactionIdProvider";
import { TranslationMoveHandler } from "./translation/translationMoveHandler";
import { LineMoveHandler } from "./line/lineMoveHandler";
import { findViewportZoom } from "../../base/findViewportZoom";
import { CanvasElementView } from "../../views/canvas/canvasElementView";
import { RotationHandler } from "./rotation/rotationHandler";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection";
import { SCanvasContent } from "../../model/canvas/sCanvasContent";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment";

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

    override mouseDown(target: SModelElement, event: MouseEvent): Action[] {
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

    override mouseMove(target: SModelElement, event: MouseEvent): Action[] {
        if (this.startPosition) {
            if (this.moveHandler === undefined) {
                this.moveHandler = this.createHandler(target, this.targetElement!);
            }
            if (this.moveHandler != undefined) {
                const translation = this.calculateTranslation(target, event);
                const result = this.moveHandler.generateAction(translation.x, translation.y, false);
                return [result];
            }
        }
        return [];
    }

    override mouseUp(target: SModelElement, event: MouseEvent): Action[] {
        return this.commitMove(target, event);
    }

    override mouseEnter(target: SModelElement, event: MouseEvent): Action[] {
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
    private commitMove(target: SModelElement, event: MouseEvent): Action[] {
        if (this.moveHandler === undefined || this.moveHandler === null) {
            this.startPosition = undefined;
            this.moveHandler = undefined;
            return [];
        }
        const translation = this.calculateTranslation(target, event);
        const result = this.moveHandler.generateAction(translation.x, translation.y, true);
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
    private calculateTranslation(target: SModelElement, event: MouseEvent): Point {
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
    private createHandler(target: SModelElement, targetElement?: Element): MoveHandler | null {
        if (
            target instanceof SCanvasElement &&
            targetElement?.classList?.contains(CanvasElementView.ROTATE_ICON_CLASS)
        ) {
            return this.createRotationHandler(target);
        } else {
            return this.createMoveHandler(target);
        }
    }

    /**
     * Creates the handler for the current move based on the target.
     * Handles rotation events, meaning rotating CanvasElements.
     *
     * @param target the element to rotate
     * @returns the move handler if rotation is supported, otherwise null
     */
    private createRotationHandler(target: SCanvasElement): MoveHandler | null {
        if (target.rotateable == undefined) {
            return null;
        }
        const origin = target.position;
        const distance = CanvasElementView.ROTATE_ICON_DISTANCE / findViewportZoom(target);
        const angleRad = (target.rotation / 360) * 2 * Math.PI;
        const handlePosition = {
            x: origin.x + distance * Math.sin(angleRad),
            y: origin.y - distance * Math.cos(angleRad)
        };
        return new RotationHandler(target.id, this.transactionIdProvider.generateId(), origin, handlePosition);
    }

    /**
     * Creats the handler for the current move based on the selected elements.
     * Handles move events, meaning moving points on the canvas.
     *
     * @param target the element which was clicked
     * @returns the move handler if move is supported, otherwise null
     */
    private createMoveHandler(target: SModelElement): MoveHandler | null {
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

        const movedPoints = new Set(points);
        let currentPoints: Set<SCanvasPoint> = points;
        do {
            const newPoints = new Set<SCanvasPoint>();
            for (const point of currentPoints) {
                if (point instanceof SRelativePoint && point.editable == null) {
                    const targetPoint = index.getById(point.target) as SCanvasPoint;
                    newPoints.add(targetPoint);
                    movedPoints.add(targetPoint);
                }
            }
            currentPoints = newPoints;
        } while (currentPoints.size > 0);

        if (movedPoints.size > 1) {
            const pointsToRemove: SLinePoint[] = [];
            for (const point of movedPoints) {
                if (point instanceof SLinePoint) {
                    const lineProviderId = point.lineProvider;
                    const lineProvider = index.getById(lineProviderId) as SCanvasContent;
                    if (lineProvider instanceof SCanvasElement) {
                        if (this.isElementMoved(lineProvider, index, movedPoints, elements)) {
                            pointsToRemove.push(point);
                        }
                    } else if (lineProvider instanceof SCanvasConnection) {
                        const affectedSegment = LinePoint.calcSegmentIndex(point.pos, lineProvider.children.length);
                        const points = [
                            lineProvider.start,
                            ...(lineProvider.children as SCanvasConnectionSegment[]).map((segment) => segment.end)
                        ];
                        if (
                            this.isPointMoved(
                                index.getById(points[affectedSegment]) as SCanvasPoint,
                                index,
                                movedPoints
                            ) &&
                            this.isPointMoved(
                                index.getById(points[affectedSegment + 1]) as SCanvasPoint,
                                index,
                                movedPoints
                            )
                        ) {
                            pointsToRemove.push(point);
                        }
                    }
                }
            }
            for (const point of pointsToRemove) {
                movedPoints.delete(point);
            }
        }

        const pointsToRemove: SCanvasPoint[] = [];
        for (const point of movedPoints) {
            if (point instanceof SRelativePoint) {
                if (point.editable == null || this.isPointMovedByTarget(point, index, movedPoints)) {
                    pointsToRemove.push(point);
                }
            }
        }
        for (const point of pointsToRemove) {
            movedPoints.delete(point);
        }

        for (const point of movedPoints) {
            if (point.editable == null) {
                return null;
            }
        }
        for (const element of elements) {
            if (element.moveable == null) {
                return null;
            }
        }

        const modificationSpecifications = [
            ...[...movedPoints].map((point) => point.editable),
            ...[...elements].map((element) => element.moveable)
        ];
        if (!ModificationSpecification.isConsistent(modificationSpecifications)) {
            return null;
        }

        let hasTranslatablePoint = false;
        let hasLinePoint = elements.size > 0;
        for (const point of movedPoints) {
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
                [...movedPoints].map((point) => point.id),
                this.transactionIdProvider.generateId()
            );
        } else if (hasLinePoint) {
            if (movedPoints.size !== 1) {
                return null;
            }
            const linePoint = movedPoints.values().next().value as SLinePoint;
            return new LineMoveHandler(
                linePoint.id,
                this.transactionIdProvider.generateId(),
                linePoint.position,
                linePoint.distance == undefined,
                linePoint.line
            );
        } else {
            throw new Error("This should not be reachable");
        }
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
     * @returns true if the point is moved, otherwise false
     */
    private isPointMoved(point: SCanvasPoint, index: IModelIndex, movedPoints: Set<SCanvasPoint>): boolean {
        if (movedPoints.has(point)) {
            return true;
        } else {
            return this.isPointMovedByTarget(point, index, movedPoints);
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
            return this.isPointMoved(index.getById(element.pos) as SCanvasPoint, index, movedPoints);
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
     * @returns true if the point is a relative point and the target is moved, otherwise false
     */
    private isPointMovedByTarget(point: SCanvasPoint, index: IModelIndex, movedPoints: Set<SCanvasPoint>): boolean {
        let targetPoint = point;
        while (targetPoint instanceof SRelativePoint) {
            targetPoint = index.getById(targetPoint.target) as SCanvasPoint;
            if (movedPoints.has(targetPoint)) {
                return true;
            }
        }
        return false;
    }

    private getSelectedElements(root: SModelRoot): SModelElement[] {
        return [...root.index.all().filter((child) => isSelectable(child) && child.selected)];
    }
}

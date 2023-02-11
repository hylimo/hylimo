import { inject } from "inversify";
import { Point } from "@hylimo/diagram-common";
import { findParentByFeature, isMoveable, isSelectable, MouseListener, SModelElement, SModelRoot } from "sprotty";
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
        const distance = CanvasElementView.ROTATE_ICON_DISTANCE;
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
        const selected = this.getSelectedElements(target.root) as (SCanvasPoint | SCanvasElement)[];
        if (selected.length === 0) {
            return null;
        }
        if (selected.some((element) => !isMoveable(element))) {
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
        const points = new Set(
            selected.map((element) => {
                if (element instanceof SCanvasPoint) {
                    return element;
                } else {
                    return index.getById(element.pos) as SCanvasPoint;
                }
            })
        );
        const editablePoints = new Set<SCanvasPoint>();
        for (let point of points) {
            while (point instanceof SRelativePoint && point.editable == undefined) {
                point = index.getById(point.target) as SCanvasPoint;
            }
            if (point.editable == undefined) {
                return null;
            }
            editablePoints.add(point);
        }
        const pointsToMove: SCanvasPoint[] = [];
        for (const point of editablePoints) {
            let targetPoint = point;
            let takePoint = true;
            while (targetPoint instanceof SRelativePoint) {
                targetPoint = index.getById(targetPoint.target) as SCanvasPoint;
                if (editablePoints.has(targetPoint)) {
                    takePoint = false;
                    break;
                }
            }
            if (takePoint) {
                pointsToMove.push(point);
            }
        }
        const editSources = new Set<number>();
        for (const point of pointsToMove) {
            const sources = point.editable!;
            for (const source of sources) {
                if (editSources.has(source)) {
                    return null;
                } else {
                    editSources.add(source);
                }
            }
        }
        let hasTranslatablePoint = false;
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
                pointsToMove.map((point) => point.id),
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
                linePoint.distance == undefined,
                linePoint.line
            );
        } else {
            throw new Error("This should not be reachable");
        }
    }

    private getSelectedElements(root: SModelRoot): SModelElement[] {
        return [...root.index.all().filter((child) => isSelectable(child) && child.selected)];
    }
}

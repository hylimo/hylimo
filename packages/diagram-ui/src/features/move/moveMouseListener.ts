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
import { Matrix, compose, translate, applyToPoint, inverse, decomposeTSR, scale, rotate } from "transformation-matrix";
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
     * The context of the current move
     */
    private context?: {
        /**
         * A transformation matrix which directly outputs dx/dy in the parent canvas coordinate system.
         */
        transformationMatrix: Matrix;
        /**
         * The target of the initial event
         */
        targetElement: Element;
        /**
         * The id of the canvas in which the edit is performed
         */
        canvasContext: string;
    };

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
                this.context = {
                    transformationMatrix: compose(translate(-initialPoint.x, -initialPoint.y), matrix),
                    targetElement: event.target as Element,
                    canvasContext: parentCanvas.id
                };
            } else {
                this.context = undefined;
            }
        }
        return [];
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (this.context != undefined) {
            const root = target.root as SRoot;
            if (this.moveHandler === undefined) {
                this.moveHandler = this.createHandler(target, this.context.targetElement);
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
            this.context = undefined;
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
        this.context = undefined;
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
        if (this.context == undefined) {
            throw new Error("Cannot calculate translation without a start position");
        }
        return applyToPoint(this.context.transformationMatrix, { x: event.pageX, y: event.pageY });
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

        const { movedElements, hasConflict } = new MovedElementsSelector(selected, target.index);
        if (hasConflict) {
            return null;
        }
        const linePoints: SLinePoint[] = [];
        const translateableElements: (SCanvasElement | SRelativePoint | SAbsolutePoint)[] = [];
        for (const element of movedElements) {
            if (element instanceof SLinePoint) {
                linePoints.push(element);
            } else {
                translateableElements.push(element as SCanvasElement | SRelativePoint | SAbsolutePoint);
            }
        }
        if (linePoints.length > 0) {
            if (linePoints.length > 1 || translateableElements.length > 0) {
                return null;
            }
            return this.createLineMoveHandler(linePoints[0]);
        }
        return this.createTranslationMoveHandler(translateableElements);
    }

    /**
     * Creates the line move handler for the given line point.
     *
     * @param linePoint the point to move
     * @returns the created move handler or null if no handler could be created
     */
    private createLineMoveHandler(linePoint: SLinePoint): MoveHandler | null {
        const editSpecifications: EditSpecificationEntry[] = [];
        editSpecifications.push(linePoint.edits[DefaultEditTypes.MOVE_LPOS_POS]);
        if (linePoint.edits[DefaultEditTypes.MOVE_LPOS_DIST] != undefined) {
            editSpecifications.push(linePoint.edits[DefaultEditTypes.MOVE_LPOS_DIST]);
        }
        if (!EditSpecification.isConsistent([editSpecifications])) {
            return null;
        }
        const root = linePoint.root as SRoot;
        return new LineMoveHandler(
            linePoint.id,
            this.transactionIdProvider.generateId(),
            root.layoutEngine.getPoint(linePoint.id, this.context!.canvasContext),
            linePoint.edits[DefaultEditTypes.MOVE_LPOS_DIST] == undefined,
            linePoint.segment != undefined,
            root.layoutEngine.layoutLine(
                root.index.getById(linePoint.lineProvider) as SCanvasConnection | SCanvasElement,
                this.context!.canvasContext
            )
        );
    }

    /**
     * Creates the translation move handler for the given points and elements.
     *
     * @param elements the elements to move
     * @returns the created move handler or null if no handler could be created
     */
    private createTranslationMoveHandler(
        elements: (SCanvasElement | SAbsolutePoint | SRelativePoint)[]
    ): MoveHandler | null {
        if (elements.length == 0) {
            return null;
        }
        const entries = this.computeTranslationMoveEntries(elements);
        const editSpecifications = entries.map((entry) => {
            return entry.elements.flatMap((element) => {
                return [element.edits[DefaultEditTypes.MOVE_X], element.edits[DefaultEditTypes.MOVE_Y]];
            });
        });
        if (!EditSpecification.isConsistent(editSpecifications)) {
            return null;
        }
        return new TranslationMoveHandler(
            entries.map((entry) => ({
                transformation: entry.transformation,
                elements: entry.elements.map((element) => element.id)
            })),
            this.transactionIdProvider.generateId()
        );
    }

    /**
     * Computes the translation move entries for the given elements.
     * Groups the elements by their transformation matrix (ignoring translation).
     *
     * @param elements the elements to move
     * @returns the translation move entries
     */
    private computeTranslationMoveEntries(
        elements: (SCanvasElement | SRelativePoint | SAbsolutePoint)[]
    ): TranslationMoveEntry[] {
        const entries = new Map<string, TranslationMoveEntry>();
        const root = elements[0].root as SRoot;
        const currentMatrix = root.layoutEngine.localToAncestor(this.context!.canvasContext, root.id);
        const transformationLookup = new Map<string, string>();
        for (const element of elements) {
            const parentCanvas = findParentByFeature(element, (element) => element instanceof SCanvas) as SCanvas;
            if (!transformationLookup.has(parentCanvas.id)) {
                const transformationMatrix = root.layoutEngine.localToAncestor(parentCanvas.id, root.id);
                const matrix = compose(inverse(transformationMatrix), currentMatrix);
                const { scale: tsrScale, rotation: tsrRotation } = decomposeTSR(matrix);
                const key = `${tsrRotation.angle} ${tsrScale.sx} ${tsrScale.sy}`;
                transformationLookup.set(parentCanvas.id, key);
                if (!entries.has(key)) {
                    entries.set(key, {
                        transformation: compose(scale(tsrScale.sx, tsrScale.sy), rotate(tsrRotation.angle)),
                        elements: []
                    });
                }
            }
            entries.get(transformationLookup.get(parentCanvas.id)!)!.elements.push(element);
        }
        return [...entries.values()];
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

/**
 * Entry for a translation move operation
 */
export interface TranslationMoveEntry {
    /**
     * The transformation applied to the dx and dy values
     */
    transformation: Matrix;
    /**
     * The elements to move
     */
    elements: (SCanvasElement | SRelativePoint | SAbsolutePoint)[];
}

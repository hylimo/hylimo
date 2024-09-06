import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import { findParentByFeature, IModelIndex } from "sprotty";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { SCanvasContent } from "../../model/canvas/sCanvasContent.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { SLinePoint } from "../../model/canvas/sLinePoint.js";
import { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import { SCanvas } from "../../model/canvas/sCanvas.js";
import { SMarker } from "../../model/canvas/sMarker.js";
import { SCanvasBezierSegment } from "../../model/canvas/sCanvasBezierSegment.js";

/**
 * Helper to select the points and elements which have to be modified during a move edit.
 * Automatically detects which points are implicitly moved by other points.
 * If a relative point is not editable, it tries to move the target instead.
 * After initialization the result can be found in the following fields:
 * - movedElements: Elements which are moved.
 * - movedPoints: Points which are moved.
 * - hasConflict: True if there is any conflict that prevents the move.
 */
export class MovedElementsSelector {
    /**
     * Elements which are moved.
     */
    movedElements: Set<SCanvasElement> = new Set();

    /**
     * Points which are moved
     */
    movedPoints: Set<SCanvasPoint> = new Set();

    /**
     * True if there is any conflict that prevents the move
     */
    hasConflict = false;

    /**
     * True if the element is moved
     */
    private readonly isMovedLookup: Map<string, boolean> = new Map();

    /**
     * Creates a new moved elements selector.
     * The results are available immediately after creation.
     *
     * @param selected the selected elements
     * @param index index for element lookup
     */
    constructor(
        selected: (SCanvasElement | SCanvasPoint)[],
        private readonly index: IModelIndex
    ) {
        this.registerElements(new Set(selected));
        this.pruneMovedElements();
    }

    /**
     * Registers the points and elements which are required to move so that elements are moved as a whole.
     * Does not perform pruning of implicitely moved elements
     *
     * @param points the points to move
     */
    private registerElements(elements: Set<SCanvasPoint | SCanvasElement>) {
        let currentElements: Set<SCanvasPoint | SCanvasElement> = elements;
        while (currentElements.size > 0) {
            const newElements = new Set<SCanvasPoint | SCanvasElement>();
            for (const element of currentElements) {
                if (element instanceof SCanvasElement) {
                    this.movedElements.add(element);
                    if (element.pos != undefined) {
                        newElements.add(this.index.getById(element.pos) as SCanvasPoint | SCanvasElement);
                    }
                } else if (element instanceof SRelativePoint) {
                    const editable =
                        DefaultEditTypes.MOVE_X in element.edits && DefaultEditTypes.MOVE_Y in element.edits;
                    this.movedPoints.add(element);
                    if (!editable) {
                        newElements.add(this.index.getById(element.target) as SCanvasPoint | SCanvasElement);
                    }
                } else {
                    this.movedPoints.add(element);
                }
            }
            currentElements = newElements;
        }
    }

    /**
     * Prunes the moved elements and points to remove implicitely moved elements.
     */
    private pruneMovedElements() {
        const elementsToRemove = new Set<SCanvasElement>();
        const pointsToRemove = new Set<SCanvasPoint>();
        for (const element of this.movedElements) {
            if (this.isElementImplicitelyMoved(element)) {
                elementsToRemove.add(element);
            }
        }
        for (const point of this.movedPoints) {
            if (this.isPointImplicitelyMoved(point)) {
                pointsToRemove.add(point);
            }
        }
        for (const element of elementsToRemove) {
            this.movedElements.delete(element);
        }
        for (const point of pointsToRemove) {
            this.movedPoints.delete(point);
        }
    }

    /**
     * Checks if a point or canvas element is moved.
     *
     * @param elementId the id of the element to check
     * @returns true if the element is moved, otherwise false
     */
    private isMoved(elementId: string): boolean {
        const fromLookup = this.isMovedLookup.get(elementId);
        if (fromLookup != undefined) {
            return fromLookup;
        }
        const element = this.index.getById(elementId);
        if (element instanceof SCanvasElement) {
            const isMoved = this.isElementMoved(element);
            this.isMovedLookup.set(elementId, isMoved);
            return isMoved;
        } else if (element instanceof SCanvasPoint) {
            const isMoved = this.isPointMoved(element);
            this.isMovedLookup.set(elementId, isMoved);
            return isMoved;
        } else {
            throw new Error("Invalid element (should not be reachable)");
        }
    }

    /**
     * Checks if a point is moved.
     *
     * @param point the point to check
     * @returns true if the point is moved, otherwise false
     */
    private isPointMoved(point: SCanvasPoint): boolean {
        if (this.movedPoints.has(point)) {
            return true;
        }
        return this.isPointImplicitelyMoved(point);
    }

    /**
     * Checks if an element is moved.
     * An element is moved if it has a position and the position is moved, or if it is in the set of moved elements.
     *
     * @param element the element to check
     * @returns true if the element is moved, otherwise false
     */
    private isElementMoved(element: SCanvasElement): boolean {
        if (this.movedElements.has(element)) {
            return true;
        }
        return this.isElementImplicitelyMoved(element);
    }

    /**
     * Checks if an element is implicitely moved.
     * If the element has a position, it is moved if the target is moved.
     * Otherwise, it is moved if the parent canvas is moved.
     *
     * @param element the element to check
     * @returns true if the element is implicitely moved, otherwise false
     */
    private isElementImplicitelyMoved(element: SCanvasElement): boolean {
        if (element.pos != undefined) {
            return this.isMoved(element.pos);
        }
        return this.isParentCanvasImplicitelyMoved(element);
    }

    /**
     * Checks if a point is implicitely moved.
     * - A relative point is moved if the target is moved.
     * - A line point is moved if the (relevant segment of the) line provider is moved.
     * - An absolute point is moved if the parent canvas is moved.
     *
     * @param point the point to check
     * @returns true if the point is implicitely moved, otherwise false
     */
    private isPointImplicitelyMoved(point: SCanvasPoint): boolean {
        if (point instanceof SRelativePoint) {
            return this.isMoved(point.target);
        } else if (point instanceof SLinePoint) {
            const lineProviderId = point.lineProvider;
            const lineProvider = this.index.getById(lineProviderId) as SCanvasContent;
            if (lineProvider instanceof SCanvasElement) {
                return this.isMoved(lineProviderId);
            }
            if (lineProvider instanceof SCanvasConnection) {
                const affectedSegment = LinePoint.calcSegmentIndex(point.pos, lineProvider.segments.length);
                return this.isCanvasConnectionSegmentMoved(lineProvider, affectedSegment);
            }
        } else if (point instanceof SAbsolutePoint) {
            return this.isParentCanvasImplicitelyMoved(point);
        }
        return false;
    }

    /**
     * Checks if a canvas connection segment is moved
     * It is moved if all relevant points (start, end, control points) are moved.
     * If only some points are moved, it is considered a conflict, for which the hasConflict flag is set.
     *
     * @param connection the connection to check
     * @param segmentIndex the index of the segment to check
     * @returns true if the segment is moved, otherwise false
     */
    private isCanvasConnectionSegmentMoved(connection: SCanvasConnection, segmentIndex: number): boolean {
        const relevantPoints: string[] = [];
        if (segmentIndex === 0) {
            relevantPoints.push(connection.start);
        } else {
            relevantPoints.push(connection.segments[segmentIndex - 1].end);
        }
        const segment = connection.segments[segmentIndex];
        relevantPoints.push(segment.end);
        if (segment instanceof SCanvasBezierSegment) {
            relevantPoints.push(segment.startControlPoint, segment.endControlPoint);
        }
        const isMoved = relevantPoints.map((point) => this.isMoved(point));
        if (isMoved.every((moved) => moved)) {
            return true;
        }
        if (isMoved.some((moved) => moved)) {
            this.hasConflict = true;
        }
        return false;
    }

    /**
     * Checks if an element is moved implicitly by a parent canvas (which is located inside another SCanvasElement or SMarker).
     *
     * @param element the element to check
     * @returns true if the element is moved implicitly by a parent canvas, otherwise false
     */
    private isParentCanvasImplicitelyMoved(element: SCanvasElement | SAbsolutePoint): boolean {
        const canvas = element.parent as SCanvas;
        const isCanvasMoved = this.isMovedLookup.get(canvas.id);
        if (isCanvasMoved != undefined) {
            return isCanvasMoved;
        }
        const parentCanvasContent = findParentByFeature(
            canvas,
            (parent) => parent instanceof SMarker || parent instanceof SCanvasElement
        ) as SMarker | SCanvasElement | undefined;
        let isParentCanvasMoved = false;
        if (parentCanvasContent instanceof SCanvasElement) {
            isParentCanvasMoved = this.isMoved(parentCanvasContent.id);
        } else if (parentCanvasContent instanceof SMarker) {
            const connection = parentCanvasContent.parent as SCanvasConnection;
            const segmentIndex = parentCanvasContent.pos == "start" ? 0 : connection.segments.length - 1;
            isParentCanvasMoved = this.isCanvasConnectionSegmentMoved(connection, segmentIndex);
        }
        this.isMovedLookup.set(canvas.id, isParentCanvasMoved);
        return isParentCanvasMoved;
    }
}

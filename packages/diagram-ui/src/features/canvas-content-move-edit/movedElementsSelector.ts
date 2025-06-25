import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import type { ModelIndexImpl, SParentElementImpl } from "sprotty";
import { findParentByFeature } from "sprotty";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { SCanvasContent } from "../../model/canvas/sCanvasContent.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { SLinePoint } from "../../model/canvas/sLinePoint.js";
import { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import { SMarker } from "../../model/canvas/sMarker.js";
import { SCanvasBezierSegment } from "../../model/canvas/sCanvasBezierSegment.js";
import type { CanvasLike } from "../../model/canvas/canvasLike.js";
import type { SElement } from "../../model/sElement.js";

/**
 * Helper to select the points and elements which have to be modified during a move edit.
 * Automatically detects which points are implicitly moved by other points.
 * If a relative point is not editable, it tries to move the target instead.
 * After initialization the result can be found in the following fields:
 * - movedElements: Elements which are moved.
 * - hasConflict: True if there is any conflict that prevents the move.
 */
export class MovedElementsSelector {
    /**
     * Elements (canvas elements and points) which are moved.
     */
    movedElementsX: Set<SCanvasElement | SCanvasPoint> = new Set();
    movedElementsY: Set<SCanvasElement | SCanvasPoint> = new Set();

    /**
     * Elements which are implicitely moved.
     */
    implicitlyMovedElementsX: Set<SCanvasElement | SCanvasPoint> = new Set();
    implicitlyMovedElementsY: Set<SCanvasElement | SCanvasPoint> = new Set();

    /**
     * True if there is any conflict that prevents the move
     */
    hasConflict = false;

    /**
     * True if the element is moved
     */
    private readonly isMovedXLookup: Map<string, boolean> = new Map();

    private readonly isMovedYLookup: Map<string, boolean> = new Map();

    private readonly dependencyAnalyzed = new Set<string>();

    private readonly dependedOnX: Map<string, DependencyEntry> = new Map();
    private readonly dependedOnY: Map<string, DependencyEntry> = new Map();
    private readonly dependsOnX: Map<string, DependencyEntry> = new Map();
    private readonly dependsOnY: Map<string, DependencyEntry> = new Map();

    /**
     * Returns the (implicitely) moved element ids
     */
    get movedOrImplicitlyMovedElementIds(): Set<string> {
        const movedOrImplicitlyMovedElementIds = new Set<string>();
        for (const element of this.movedElementsX) {
            movedOrImplicitlyMovedElementIds.add(element.id);
        }
        for (const element of this.movedElementsY) {
            movedOrImplicitlyMovedElementIds.add(element.id);
        }
        for (const element of this.implicitlyMovedElementsX) {
            movedOrImplicitlyMovedElementIds.add(element.id);
        }
        for (const element of this.implicitlyMovedElementsY) {
            movedOrImplicitlyMovedElementIds.add(element.id);
        }
        return movedOrImplicitlyMovedElementIds;
    }

    /**
     * Creates a new moved elements selector.
     * The results are available immediately after creation.
     *
     * @param selected the selected elements
     * @param index index for element lookup
     */
    constructor(
        readonly selected: (SCanvasElement | SCanvasPoint | SMarker)[],
        private readonly index: ModelIndexImpl,
        private readonly moveX: boolean,
        private readonly moveY: boolean
    ) {
        const actualSelected = new Set<SCanvasContent>();
        for (const element of selected) {
            if (element instanceof SCanvasElement || element instanceof SCanvasPoint) {
                actualSelected.add(element);
            } else if (element instanceof SMarker) {
                const posElement = this.index.getById(element.posId) as SCanvasContent;
                actualSelected.add(posElement);
            }
        }
        this.registerDependencies();
        this.registerElements(actualSelected, this.moveX, this.moveY);
        this.fixPartiallyMovedElements();
        this.pruneMovedElements();
        this.registerAdditionalImplicitlyMovedElements();
    }

    /**
     * Registers the points and elements which are required to move so that elements are moved as a whole.
     * Does not perform pruning of implicitly moved elements
     *
     * @param points the points to move
     */
    private registerElements(elements: Set<SCanvasContent>, moveX: boolean, moveY: boolean) {
        let currentElementsX: Set<SCanvasContent> = moveX ? elements : new Set();
        let currentElementsY: Set<SCanvasContent> = moveY ? elements : new Set();
        for (const element of elements) {
            if (moveX) {
                currentElementsX.add(element);
            }
            if (moveY) {
                currentElementsY.add(element);
            }
        }
        while (currentElementsX.size > 0 || currentElementsY.size > 0) {
            const newElementsX = new Set<SCanvasContent>();
            const newElementsY = new Set<SCanvasContent>();
            for (const element of currentElementsX) {
                let elementToAdd: SCanvasContent | undefined;
                if (element instanceof SCanvasConnection) {
                    elementToAdd = this.index.getById(element.segments.at(-1)!.end) as SCanvasContent;
                } else {
                    this.movedElementsX.add(element as SCanvasPoint | SCanvasElement);
                    if (element instanceof SCanvasElement) {
                        if (element.pos != undefined) {
                            elementToAdd = this.index.getById(element.pos) as SCanvasContent;
                        }
                    } else if (element instanceof SRelativePoint) {
                        if (!(DefaultEditTypes.MOVE_X in element.edits)) {
                            elementToAdd = this.index.getById(element.targetX) as SCanvasContent;
                        }
                    }
                }
                if (elementToAdd != undefined) {
                    const rotationDelta = this.getRotationDelta(element.parent, elementToAdd.parent);
                    if (rotationDelta % 180 !== 90) {
                        newElementsX.add(elementToAdd);
                    }
                    if (rotationDelta % 180 !== 0) {
                        newElementsY.add(elementToAdd);
                    }
                }
            }
            for (const element of currentElementsY) {
                let elementToAdd: SCanvasContent | undefined;
                if (element instanceof SCanvasConnection) {
                    elementToAdd = this.index.getById(element.segments.at(-1)!.end) as SCanvasContent;
                } else {
                    this.movedElementsY.add(element as SCanvasPoint | SCanvasElement);
                    if (element instanceof SCanvasElement) {
                        if (element.pos != undefined) {
                            elementToAdd = this.index.getById(element.pos) as SCanvasContent;
                        }
                    } else if (element instanceof SRelativePoint) {
                        if (!(DefaultEditTypes.MOVE_Y in element.edits)) {
                            elementToAdd = this.index.getById(element.targetY) as SCanvasContent;
                        }
                    }
                }
                if (elementToAdd != undefined) {
                    const rotationDelta = this.getRotationDelta(element.parent, elementToAdd.parent);
                    if (rotationDelta % 180 !== 90) {
                        newElementsY.add(elementToAdd);
                    }
                    if (rotationDelta % 180 !== 0) {
                        newElementsX.add(elementToAdd);
                    }
                }
            }
            currentElementsX = newElementsX;
            currentElementsY = newElementsY;
        }
    }

    private getRotationDelta(
        canvas1: SParentElementImpl & CanvasLike,
        canvas2: SParentElementImpl & CanvasLike
    ): number {
        const delta = canvas1.globalRotation - canvas2.globalRotation;
        return ((delta % 360) + 360) % 360;
    }

    private registerDependencies(): void {
        let elements: Set<SCanvasContent> = new Set();
        for (const element of this.index.all()) {
            if (element instanceof SCanvasContent) {
                elements.add(element);
            }
        }
        for (const element of elements) {
            if (this.dependencyAnalyzed.has(element.id)) {
                continue;
            }
            this.dependencyAnalyzed.add(element.id);
            let dependsOnX: SCanvasContent[] = [];
            let dependsOnY: SCanvasContent[] = [];
            if (element instanceof SCanvasConnection) {
                const end = this.index.getById(element.segments.at(-1)!.end) as SCanvasContent;
                dependsOnX.push(end);
                dependsOnY.push(end);
            } else if (element instanceof SCanvasElement) {
                const dependencies = this.getCanvasDependencies(element.parent);
                dependsOnX.push(...dependencies);
                dependsOnY.push(...dependencies);
            } else if (element instanceof SAbsolutePoint) {
                const dependencies = this.getCanvasDependencies(element.parent);
                dependsOnX.push(...dependencies);
                dependsOnY.push(...dependencies);
            } else if (element instanceof SRelativePoint) {
                dependsOnX.push(this.index.getById(element.targetX) as SCanvasContent);
                dependsOnY.push(this.index.getById(element.targetY) as SCanvasContent);
            } else if (element instanceof SLinePoint) {
                const lineProvider = this.index.getById(element.lineProvider) as SCanvasContent;
                if (lineProvider instanceof SCanvasElement) {
                    dependsOnX.push(lineProvider);
                    dependsOnY.push(lineProvider);
                }
                if (lineProvider instanceof SCanvasConnection) {
                    const affectedSegment = LinePoint.calcSegmentIndex(element.pos, lineProvider.segments.length);
                    const segmentDependencies = this.getCanvasConnectionSegmentDependencies(
                        lineProvider,
                        affectedSegment
                    );
                    dependsOnX.push(...segmentDependencies);
                    dependsOnY.push(...segmentDependencies);
                }
            }
            for (const depX of dependsOnX) {
                const rotationDelta = this.getRotationDelta(element.parent, depX.parent);
                if (rotationDelta % 180 !== 90) {
                    this.addDependency(element, depX, true, true);
                }
                if (rotationDelta % 180 !== 0) {
                    this.addDependency(element, depX, true, false);
                }
            }
            for (const depY of dependsOnY) {
                const rotationDelta = this.getRotationDelta(element.parent, depY.parent);
                if (rotationDelta % 180 !== 90) {
                    this.addDependency(element, depY, false, false);
                }
                if (rotationDelta % 180 !== 0) {
                    this.addDependency(element, depY, false, true);
                }
            }
        }
    }

    private addDependency(
        source: SCanvasContent,
        dependency: SCanvasContent,
        isXSource: boolean,
        isXTarget: boolean
    ): void {
        let entry: DependencyEntry | undefined;
        if (isXSource) {
            entry = this.dependsOnX.get(source.id);
            if (entry == undefined) {
                entry = { x: new Set(), y: new Set() };
                this.dependsOnX.set(source.id, entry);
            }
        } else {
            entry = this.dependsOnY.get(source.id);
            if (entry == undefined) {
                entry = { x: new Set(), y: new Set() };
                this.dependsOnY.set(source.id, entry);
            }
        }
        if (isXTarget) {
            entry.x.add(dependency);
        } else {
            entry.y.add(dependency);
        }
        let inverseEntry: DependencyEntry | undefined;
        if (isXTarget) {
            inverseEntry = this.dependedOnX.get(dependency.id);
            if (inverseEntry == undefined) {
                inverseEntry = { x: new Set(), y: new Set() };
                this.dependedOnX.set(dependency.id, inverseEntry);
            }
        } else {
            inverseEntry = this.dependedOnY.get(dependency.id);
            if (inverseEntry == undefined) {
                inverseEntry = { x: new Set(), y: new Set() };
                this.dependedOnY.set(dependency.id, inverseEntry);
            }
        }
        if (isXSource) {
            inverseEntry.x.add(source);
        } else {
            inverseEntry.y.add(source);
        }
    }

    private getCanvasDependencies(canvas: SParentElementImpl & CanvasLike): SCanvasContent[] {
        const parentCanvasContent = findParentByFeature(
            canvas,
            (parent) => parent instanceof SMarker || parent instanceof SCanvasElement
        ) as SMarker | SCanvasElement | undefined;
        if (parentCanvasContent instanceof SCanvasElement) {
            return [parentCanvasContent];
        } else if (parentCanvasContent instanceof SMarker) {
            const connection = parentCanvasContent.parent as SCanvasConnection;
            const segmentIndex = parentCanvasContent.pos == "start" ? 0 : connection.segments.length - 1;
            return this.getCanvasConnectionSegmentDependencies(connection, segmentIndex);
        } else {
            return [];
        }
    }

    private getCanvasConnectionSegmentDependencies(
        connection: SCanvasConnection,
        segmentIndex: number
    ): SCanvasContent[] {
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
        return relevantPoints.map((pointId) => this.index.getById(pointId) as SCanvasContent);
    }

    private fixPartiallyMovedElements(): void {
        let hasChanges = true;
        while (hasChanges) {
            hasChanges = false;
            const elementsToMoveY = new Set<SCanvasElement | SCanvasPoint>();
            const elementsToMoveX = new Set<SCanvasElement | SCanvasPoint>();
            for (const element of this.movedElementsX) {
                if (this.movedElementsY.has(element)) {
                    continue;
                }
                if (this.isInconsitentlyMoved(element.id)) {
                    elementsToMoveY.add(element);
                }
            }
            for (const element of this.movedElementsY) {
                if (this.movedElementsX.has(element)) {
                    continue;
                }
                if (this.isInconsitentlyMoved(element.id)) {
                    elementsToMoveX.add(element);
                }
            }
            if (elementsToMoveY.size > 0) {
                hasChanges = true;
                this.registerElements(elementsToMoveY, false, true);
            }
            if (elementsToMoveX.size > 0) {
                hasChanges = true;
                this.registerElements(elementsToMoveX, true, false);
            }
        }
    }

    private isInconsitentlyMoved(id: string): boolean {
        const dependedOnX = this.dependedOnX.get(id);
        const dependedOnY = this.dependedOnY.get(id);
        if (dependedOnX == undefined || dependedOnY == undefined) {
            return false;
        }
        let toCheckX = intersection(dependedOnX.x, dependedOnY.x);
        let toCheckY = intersection(dependedOnX.y, dependedOnY.y);
        const checkedX: Set<SElement> = new Set();
        const checkedY: Set<SElement> = new Set();
        while (toCheckX.size > 0 || toCheckY.size > 0) {
            const newToCheckX: Set<SCanvasContent> = new Set();
            const newToCheckY: Set<SCanvasContent> = new Set();
            for (const toCheck of toCheckX) {
                if (checkedX.has(toCheck)) {
                    continue;
                }
                checkedX.add(toCheck);
                if (this.movedElementsX.has(toCheck as any)) {
                    return true;
                }
                const dependedOn = this.dependsOnX.get(toCheck.id);
                if (dependedOn == undefined) {
                    continue;
                }
                for (const dep of dependedOn.x) {
                    newToCheckX.add(dep);
                }
                for (const dep of dependedOn.y) {
                    newToCheckY.add(dep);
                }
            }
            for (const toCheck of toCheckY) {
                if (checkedY.has(toCheck)) {
                    continue;
                }
                checkedY.add(toCheck);
                if (this.movedElementsY.has(toCheck as any)) {
                    return true;
                }
                const dependedOn = this.dependsOnY.get(toCheck.id);
                if (dependedOn == undefined) {
                    continue;
                }
                for (const dep of dependedOn.x) {
                    newToCheckX.add(dep);
                }
                for (const dep of dependedOn.y) {
                    newToCheckY.add(dep);
                }
            }
            toCheckX = newToCheckX;
            toCheckY = newToCheckY;
        }
        return false;
    }

    /**
     * Registers all elements which are implicitly moved.
     * This is done by checking if the element is moved and if it is not already in the moved elements set.
     */
    private registerAdditionalImplicitlyMovedElements(): void {
        for (const element of this.index.all()) {
            if (element instanceof SCanvasElement || element instanceof SCanvasPoint) {
                if (!this.movedElements.has(element) && this.isElementImplicitlyMoved(element, false)) {
                    this.implicitlyMovedElements.add(element);
                }
            }
        }
    }

    /**
     * Prunes the moved elements and points to remove implicitly moved elements.
     */
    private pruneMovedElements() {
        for (const element of this.movedElementsX) {
            if (this.isElementImplicitlyMoved(element, true)) {
                this.implicitlyMovedElements.add(element);
            }
        }
        for (const element of this.implicitlyMovedElements) {
            this.movedElements.delete(element);
        }
    }

    /**
     * Checks if an element is moved.
     *
     * @param elementId the id of the element to check
     * @param consistencyChecks if false, consistency checks are skipped
     * @returns true if the element is moved, otherwise false
     */
    private isMoved(elementId: string, consistencyChecks: boolean): boolean {
        const fromLookup = this.isMovedLookup.get(elementId);
        if (fromLookup != undefined) {
            return fromLookup;
        }
        const element = this.index.getById(elementId);
        if (element instanceof SCanvasElement || element instanceof SCanvasPoint) {
            const isMoved = this.isElementMoved(element, consistencyChecks);
            this.isMovedLookup.set(elementId, isMoved);
            return isMoved;
        } else {
            throw new Error("Invalid element (should not be reachable)");
        }
    }

    /**
     * Checks if an element is moved.
     *
     * @param element the element to check
     * @param consistencyChecks if false, consistency checks are skipped
     * @returns true if the element is moved, otherwise false
     */
    private isElementMoved(element: SCanvasElement | SCanvasPoint, consistencyChecks: boolean): boolean {
        if (this.movedElements.has(element)) {
            return true;
        }
        return this.isElementImplicitlyMoved(element, consistencyChecks);
    }

    /**
     * Checks if an element is implicitly moved.
     * - A canvas element is moved if its position is moved, if it is moved explicitly, or if the parent canvas is moved.
     * - A relative point is moved if the target is moved.
     * - A line point is moved if the (relevant segment of the) line provider is moved.
     * - An absolute point is moved if the parent canvas is moved.
     *
     * @param element the element to check
     * @param consistencyChecks if false, consistency checks are skipped
     * @returns true if the element is implicitly moved, otherwise false
     */
    private isElementImplicitlyMoved(element: SCanvasElement | SCanvasPoint, consistencyChecks: boolean): boolean {
        if (element instanceof SCanvasElement) {
            if (element.pos != undefined) {
                return this.isMoved(element.pos, consistencyChecks);
            }
            return this.isParentCanvasImplicitlyMoved(element, consistencyChecks);
        } else if (element instanceof SRelativePoint) {
            const target = this.index.getById(element.target) as SCanvasPoint | SCanvasElement | SCanvasConnection;
            if (target instanceof SCanvasConnection) {
                return this.isMoved(target.segments.at(-1)!.end, consistencyChecks);
            } else {
                return this.isMoved(element.target, consistencyChecks);
            }
        } else if (element instanceof SLinePoint) {
            const lineProviderId = element.lineProvider;
            const lineProvider = this.index.getById(lineProviderId) as SCanvasContent;
            if (lineProvider instanceof SCanvasElement) {
                return this.isMoved(lineProviderId, consistencyChecks);
            }
            if (lineProvider instanceof SCanvasConnection) {
                const affectedSegment = LinePoint.calcSegmentIndex(element.pos, lineProvider.segments.length);
                return this.isCanvasConnectionSegmentMoved(lineProvider, affectedSegment, consistencyChecks);
            }
        } else if (element instanceof SAbsolutePoint) {
            return this.isParentCanvasImplicitlyMoved(element, consistencyChecks);
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
     * @param consistencyChecks if false, consistency checks are skipped
     * @returns true if the segment is moved, otherwise false
     */
    private isCanvasConnectionSegmentMoved(
        connection: SCanvasConnection,
        segmentIndex: number,
        consistencyChecks: boolean
    ): boolean {
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
        const isMoved = relevantPoints.map((point) => this.isMoved(point, consistencyChecks));
        const result = isMoved.some((moved) => moved);
        if (consistencyChecks && result && isMoved.some((moved) => !moved)) {
            this.hasConflict = true;
        }
        return result;
    }

    /**
     * Checks if an element is moved implicitly by a parent canvas (which is located inside another SCanvasElement or SMarker).
     *
     * @param element the element to check
     * @param consistencyChecks if false, consistency checks are skipped
     * @returns true if the element is moved implicitly by a parent canvas, otherwise false
     */
    private isParentCanvasImplicitlyMoved(
        element: SCanvasElement | SAbsolutePoint,
        consistencyChecks: boolean
    ): boolean {
        const canvas = element.parent as CanvasLike & SElement;
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
            isParentCanvasMoved = this.isMoved(parentCanvasContent.id, consistencyChecks);
        } else if (parentCanvasContent instanceof SMarker) {
            const connection = parentCanvasContent.parent as SCanvasConnection;
            const segmentIndex = parentCanvasContent.pos == "start" ? 0 : connection.segments.length - 1;
            isParentCanvasMoved = this.isCanvasConnectionSegmentMoved(connection, segmentIndex, consistencyChecks);
        }
        this.isMovedLookup.set(canvas.id, isParentCanvasMoved);
        return isParentCanvasMoved;
    }
}

interface DependencyEntry {
    x: Set<SCanvasContent>;
    y: Set<SCanvasContent>;
}

function intersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of set1) {
        if (set2.has(item)) {
            result.add(item);
        }
    }
    return result;
}

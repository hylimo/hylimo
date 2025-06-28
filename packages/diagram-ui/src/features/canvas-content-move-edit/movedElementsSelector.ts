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
     * The actually selected elements after processing markers and filtering to canvas content.
     */
    private readonly actualSelected: Set<SCanvasContent> = new Set();

    /**
     * Elements (canvas elements and points) which are moved in the X direction.
     */
    movedElementsX: Set<SCanvasElement | SCanvasPoint> = new Set();
    /**
     * Elements (canvas elements and points) which are moved in the Y direction.
     */
    movedElementsY: Set<SCanvasElement | SCanvasPoint> = new Set();

    /**
     * Elements which are implicitly moved in the X direction.
     */
    private readonly implicitlyMovedElementsX: Set<SCanvasElement | SCanvasPoint> = new Set();
    /**
     * Elements which are implicitly moved in the Y direction.
     */
    private readonly implicitlyMovedElementsY: Set<SCanvasElement | SCanvasPoint> = new Set();

    /**
     * True if there is any conflict that prevents the move
     */
    hasConflict = false;

    /**
     * Lookup cache for X-axis movement status to avoid recomputation.
     */
    private readonly isMovedXLookup: Map<SCanvasContent, boolean> = new Map();

    /**
     * Lookup cache for Y-axis movement status to avoid recomputation.
     */
    private readonly isMovedYLookup: Map<SCanvasContent, boolean> = new Map();

    /**
     * Map of elements to their dependencies in the X direction (elements that depend on this element).
     */
    private readonly dependedOnX: Map<SCanvasContent, DependencyEntry> = new Map();
    /**
     * Map of elements to their dependencies in the Y direction (elements that depend on this element).
     */
    private readonly dependedOnY: Map<SCanvasContent, DependencyEntry> = new Map();
    /**
     * Map of elements to what they depend on in the X direction.
     */
    private readonly dependsOnX: Map<SCanvasContent, DependencyEntry> = new Map();
    /**
     * Map of elements to what they depend on in the Y direction.
     */
    private readonly dependsOnY: Map<SCanvasContent, DependencyEntry> = new Map();

    /**
     * Returns the (implicitely) moved element ids
     */
    get affectedElementIds(): Set<string> {
        const result = new Set<string>();
        const movedX = new Set<SCanvasContent>();
        const movedY = new Set<SCanvasContent>();
        let currentElementsX: Set<SCanvasContent> = new Set();
        let currentElementsY: Set<SCanvasContent> = new Set();
        for (const element of this.movedElementsX) {
            currentElementsX.add(element);
        }
        for (const element of this.movedElementsY) {
            currentElementsY.add(element);
        }
        for (const element of this.implicitlyMovedElementsX) {
            currentElementsX.add(element);
        }
        for (const element of this.implicitlyMovedElementsY) {
            currentElementsY.add(element);
        }
        while (currentElementsX.size > 0 || currentElementsY.size > 0) {
            const newElementsX = new Set<SCanvasContent>();
            const newElementsY = new Set<SCanvasContent>();
            for (const element of currentElementsX) {
                if (movedX.has(element)) {
                    continue;
                }
                movedX.add(element);
                result.add(element.id);
                const dependencies = this.dependsOnX.get(element);
                if (dependencies != undefined) {
                    for (const dep of dependencies.x) {
                        newElementsX.add(dep);
                    }
                    for (const dep of dependencies.y) {
                        newElementsY.add(dep);
                    }
                }
            }
            for (const element of currentElementsY) {
                if (movedY.has(element)) {
                    continue;
                }
                movedY.add(element);
                result.add(element.id);
                const dependencies = this.dependsOnY.get(element);
                if (dependencies != undefined) {
                    for (const dep of dependencies.x) {
                        newElementsX.add(dep);
                    }
                    for (const dep of dependencies.y) {
                        newElementsY.add(dep);
                    }
                }
            }
            currentElementsX = newElementsX;
            currentElementsY = newElementsY;
        }
        return result;
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
        private readonly index: ModelIndexImpl
    ) {
        for (const element of selected) {
            if (element instanceof SCanvasElement || element instanceof SCanvasPoint) {
                this.actualSelected.add(element);
            } else if (element instanceof SMarker) {
                const posElement = this.index.getById(element.posId) as SCanvasContent;
                this.actualSelected.add(posElement);
            }
        }
        this.registerDependencies();
    }

    /**
     * Initializes the selector for a specific move operation.
     * Clears previous state and registers elements that need to be moved.
     *
     * @param moveX whether to move elements in the X direction
     * @param moveY whether to move elements in the Y direction
     */
    initialize(moveX: boolean, moveY: boolean): void {
        this.isMovedXLookup.clear();
        this.isMovedYLookup.clear();
        this.movedElementsX.clear();
        this.movedElementsY.clear();
        this.implicitlyMovedElementsX.clear();
        this.implicitlyMovedElementsY.clear();
        this.hasConflict = false;

        this.validateConsistency(moveX, moveY);
        if (this.hasConflict) {
            return;
        }
        this.registerElements(this.actualSelected, moveX, moveY);
        this.fixPartiallyMovedElements();
        this.pruneMovedElements();
    }

    /**
     * Validates the consistency of the selected elements based on their global rotations.
     * If there are inconsistencies, sets hasConflict to true.
     * Conflicts can only occur if not both moveX and moveY are enabled.
     *
     * @param moveX whether to move elements in the X direction
     * @param moveY whether to move elements in the Y direction
     */
    private validateConsistency(moveX: boolean, moveY: boolean): void {
        if (moveX && moveY) {
            return;
        }
        const globalRotations: Set<number> = new Set();
        for (const element of this.actualSelected) {
            globalRotations.add(((element.parent.globalRotation % 360) + 360) % 180);
        }
        if (globalRotations.size > 2) {
            this.hasConflict = true;
            return;
        }
        if (globalRotations.size < 2) {
            return;
        }
        const [rotation1, rotation2] = Array.from(globalRotations);
        if (Math.abs(rotation1 - rotation2) % 180 !== 90) {
            this.hasConflict = true;
            return;
        }
    }

    /**
     * Registers the points and elements which are required to move so that elements are moved as a whole.
     * Does not perform pruning of implicitly moved elements
     *
     * @param elements the elements to move
     * @param moveX whether to move elements in the X direction
     * @param moveY whether to move elements in the Y direction
     */
    private registerElements(elements: Set<SCanvasContent>, moveX: boolean, moveY: boolean) {
        let currentElementsX: Set<SCanvasContent> = new Set();
        let currentElementsY: Set<SCanvasContent> = new Set();
        for (const element of elements) {
            const firstRotationCategory = ((element.parent.globalRotation % 360) + 360) % 180 < 90;
            if (moveX) {
                if (firstRotationCategory) {
                    currentElementsX.add(element);
                } else {
                    currentElementsY.add(element);
                }
            }
            if (moveY) {
                if (firstRotationCategory) {
                    currentElementsY.add(element);
                } else {
                    currentElementsX.add(element);
                }
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

    /**
     * Calculates the rotation difference between two canvas elements.
     *
     * @param canvas1 the first canvas element
     * @param canvas2 the second canvas element
     * @returns the rotation delta in degrees (0-359)
     */
    private getRotationDelta(
        canvas1: SParentElementImpl & CanvasLike,
        canvas2: SParentElementImpl & CanvasLike
    ): number {
        const delta = canvas1.globalRotation - canvas2.globalRotation;
        return ((delta % 360) + 360) % 360;
    }

    /**
     * Registers all dependency relationships between canvas elements.
     * This includes position dependencies, line provider dependencies, etc.
     */
    private registerDependencies(): void {
        const elements: Set<SCanvasContent> = new Set();
        for (const element of this.index.all()) {
            if (element instanceof SCanvasContent) {
                elements.add(element);
            }
        }
        for (const element of elements) {
            const dependsOnX: SCanvasContent[] = [];
            const dependsOnY: SCanvasContent[] = [];
            if (element instanceof SCanvasConnection) {
                const end = this.index.getById(element.segments.at(-1)!.end) as SCanvasContent;
                dependsOnX.push(end);
                dependsOnY.push(end);
            } else if (element instanceof SCanvasElement) {
                if (element.pos == undefined) {
                    const dependencies = this.getCanvasDependencies(element.parent);
                    dependsOnX.push(...dependencies);
                    dependsOnY.push(...dependencies);
                } else {
                    const target = this.index.getById(element.pos) as SCanvasContent;
                    dependsOnX.push(target);
                    dependsOnY.push(target);
                }
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
                } else if (lineProvider instanceof SCanvasConnection) {
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

    /**
     * Adds a dependency relationship between two canvas elements.
     *
     * @param source the element that depends on another element
     * @param dependency the element that the source depends on
     * @param isXSource whether the source dependency is in the X direction
     * @param isXTarget whether the target dependency is in the X direction
     */
    private addDependency(
        source: SCanvasContent,
        dependency: SCanvasContent,
        isXSource: boolean,
        isXTarget: boolean
    ): void {
        let entry: DependencyEntry | undefined;
        if (isXSource) {
            entry = this.dependsOnX.get(source);
            if (entry == undefined) {
                entry = { x: new Set(), y: new Set() };
                this.dependsOnX.set(source, entry);
            }
        } else {
            entry = this.dependsOnY.get(source);
            if (entry == undefined) {
                entry = { x: new Set(), y: new Set() };
                this.dependsOnY.set(source, entry);
            }
        }
        if (isXTarget) {
            entry.x.add(dependency);
        } else {
            entry.y.add(dependency);
        }
        let inverseEntry: DependencyEntry | undefined;
        if (isXTarget) {
            inverseEntry = this.dependedOnX.get(dependency);
            if (inverseEntry == undefined) {
                inverseEntry = { x: new Set(), y: new Set() };
                this.dependedOnX.set(dependency, inverseEntry);
            }
        } else {
            inverseEntry = this.dependedOnY.get(dependency);
            if (inverseEntry == undefined) {
                inverseEntry = { x: new Set(), y: new Set() };
                this.dependedOnY.set(dependency, inverseEntry);
            }
        }
        if (isXSource) {
            inverseEntry.x.add(source);
        } else {
            inverseEntry.y.add(source);
        }
    }

    /**
     * Gets the canvas dependencies for a given canvas element.
     * Returns elements that this canvas depends on for positioning.
     *
     * @param canvas the canvas to get dependencies for
     * @returns array of canvas content elements that this canvas depends on
     */
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

    /**
     * Gets the dependencies for a specific segment of a canvas connection.
     * Returns all points that affect the position of the specified segment.
     *
     * @param connection the canvas connection
     * @param segmentIndex the index of the segment to get dependencies for
     * @returns array of canvas content elements that this segment depends on
     */
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

    /**
     * Fixes elements that are partially moved by ensuring they are moved in both directions
     * when their dependencies require it. Continues until no more changes are needed.
     */
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
                if (this.isInconsitentlyMoved(element)) {
                    elementsToMoveY.add(element);
                }
            }
            for (const element of this.movedElementsY) {
                if (this.movedElementsX.has(element)) {
                    continue;
                }
                if (this.isInconsitentlyMoved(element)) {
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

    /**
     * Checks if an element is inconsistently moved (has dependencies that conflict).
     * An element is inconsistently moved if some of its dependencies are moved while others are not.
     *
     * @param element the element to check for inconsistent movement
     * @returns true if the element is inconsistently moved, false otherwise
     */
    private isInconsitentlyMoved(element: SCanvasContent): boolean {
        const dependedOnX = this.dependedOnX.get(element);
        const dependedOnY = this.dependedOnY.get(element);
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
                const dependedOn = this.dependedOnX.get(toCheck);
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
                const dependedOn = this.dependedOnY.get(toCheck);
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
     * Prunes the moved elements and points to remove implicitly moved elements.
     */
    private pruneMovedElements() {
        for (const element of this.movedElementsX) {
            if (this.isElementImplicitlyMoved(this.dependsOnX.get(element))) {
                this.implicitlyMovedElementsX.add(element);
            }
        }
        for (const element of this.movedElementsY) {
            if (this.isElementImplicitlyMoved(this.dependsOnY.get(element))) {
                this.implicitlyMovedElementsY.add(element);
            }
        }
        for (const element of this.implicitlyMovedElementsX) {
            this.movedElementsX.delete(element);
        }
        for (const element of this.implicitlyMovedElementsY) {
            this.movedElementsY.delete(element);
        }
    }

    /**
     * Checks if an element is moved in the X direction.
     * Uses caching to avoid recomputation.
     *
     * @param element the element to check
     * @returns true if the element is moved in the X direction, otherwise false
     */
    private isMovedX(element: SCanvasContent): boolean {
        const fromLookup = this.isMovedXLookup.get(element);
        if (fromLookup != undefined) {
            return fromLookup;
        }
        const isMoved =
            this.movedElementsX.has(element as any) || this.isElementImplicitlyMoved(this.dependsOnX.get(element));
        this.isMovedXLookup.set(element, isMoved);
        return isMoved;
    }

    /**
     * Checks if an element is moved in the Y direction.
     * Uses caching to avoid recomputation.
     *
     * @param element the element to check
     * @returns true if the element is moved in the Y direction, otherwise false
     */
    private isMovedY(element: SCanvasContent): boolean {
        const fromLookup = this.isMovedYLookup.get(element);
        if (fromLookup != undefined) {
            return fromLookup;
        }
        const isMoved =
            this.movedElementsY.has(element as any) || this.isElementImplicitlyMoved(this.dependsOnY.get(element));
        this.isMovedYLookup.set(element, isMoved);
        return isMoved;
    }

    /**
     * Checks if an element is implicitly moved.
     * - A canvas element is moved if its position is moved, if it is moved explicitly, or if the parent canvas is moved.
     * - A relative point is moved if the target is moved.
     * - A line point is moved if the (relevant segment of the) line provider is moved.
     * - An absolute point is moved if the parent canvas is moved.
     *
     * @param dependencies the dependency entry containing the elements this element depends on
     * @returns true if the element is implicitly moved, otherwise false
     */
    private isElementImplicitlyMoved(dependencies: DependencyEntry | undefined): boolean {
        if (dependencies == undefined) {
            return false;
        }
        let isAllMoved = true;
        let isSomeMoved = false;
        for (const element of dependencies.x) {
            if (this.isMovedX(element)) {
                isSomeMoved = true;
            } else {
                isAllMoved = false;
            }
        }
        for (const element of dependencies.y) {
            if (this.isMovedY(element)) {
                isSomeMoved = true;
            } else {
                isAllMoved = false;
            }
        }
        if (!isAllMoved && isSomeMoved) {
            this.hasConflict = true;
        }
        return isAllMoved && isSomeMoved;
    }
}

/**
 * Represents dependency relationships for an element in both X and Y directions.
 */
interface DependencyEntry {
    /**
     * Elements that this element depends on in the X direction
     */
    x: Set<SCanvasContent>;
    /**
     * Elements that this element depends on in the Y direction
     */
    y: Set<SCanvasContent>;
}

/**
 * Computes the intersection of two sets.
 *
 * @template T the type of elements in the sets
 * @param set1 the first set
 * @param set2 the second set
 * @returns a new set containing elements present in both input sets
 */
function intersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of set1) {
        if (set2.has(item)) {
            result.add(item);
        }
    }
    return result;
}

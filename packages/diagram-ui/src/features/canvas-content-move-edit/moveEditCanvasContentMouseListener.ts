import { inject, injectable } from "inversify";
import type { EditSpecificationEntry } from "@hylimo/diagram-common";
import { EditSpecification, DefaultEditTypes, groupBy, Marker } from "@hylimo/diagram-common";
import type { SModelElementImpl } from "sprotty";
import { findParentByFeature, isMoveable } from "sprotty";
import type { Action } from "sprotty-protocol";
import type { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { SLinePoint } from "../../model/canvas/sLinePoint.js";
import type { SRelativePoint } from "../../model/canvas/sRelativePoint.js";
import type { MoveHandler } from "../move/moveHandler.js";
import { TranslationMoveHandler, type ElementsGroupedByTransformation } from "./handler/translationMoveHandler.js";
import { LineMoveHandler } from "./handler/lineMoveHandler.js";
import { CanvasElementView, ResizePosition } from "../../views/canvas/canvasElementView.js";
import { RotationMoveHandler } from "./handler/rotationMoveHandler.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import type { SRoot } from "../../model/sRoot.js";
import type { ElementsGroupedBySize } from "./handler/resizeMoveHandler.js";
import { ResizeMoveHandler } from "./handler/resizeMoveHandler.js";
import type { SCanvasAxisAlignedSegment } from "../../model/canvas/sCanvasAxisAlignedSegment.js";
import { AxisAlignedSegmentEditMoveHandler } from "./handler/axisAlignedSegmentEditMoveHandler.js";
import type { Matrix } from "transformation-matrix";
import {
    compose,
    translate,
    applyToPoint,
    inverse,
    decomposeTSR,
    scale,
    rotate,
    identity
} from "transformation-matrix";
import { MovedElementsSelector } from "./movedElementsSelector.js";
import { SMarker } from "../../model/canvas/sMarker.js";
import { isCanvasLike } from "../../model/canvas/canvasLike.js";
import { TransactionalMoveAction } from "../move/transactionalMoveAction.js";
import { NoopMoveHandler } from "./handler/noopMoveHandler.js";
import { SElement } from "../../model/sElement.js";
import { findResizeIconClass } from "../cursor/resizeIcon.js";
import { MouseListener } from "../../base/mouseListener.js";
import { TYPES } from "../types.js";
import type { ConfigManager } from "../config/configManager.js";
import type { SettingsProvider } from "../settings/settingsProvider.js";

/**
 * If a resize scale exceeds this value, instead resize with scale 1 in the opposite direction is performed.
 */
const maxResizeScale = 10;

/**
 * Listener for mouse events to edit canvas contents by starting transactional move operations
 * Handles
 * - moving canvas contents
 * - resizing canvas elements
 * - rotating canvas elements
 * - moving axis aligned canvas connection segments
 */
@injectable()
export class MoveEditCanvasContentMouseListener extends MouseListener {
    /**
     * The maximum number of updates that can be performed on the same revision.
     */
    static readonly MAX_UPDATES_PER_REVISION = 5;

    /**
     * ConfigManager used to get the editor config
     */
    @inject(TYPES.ConfigManager) protected configManager!: ConfigManager;

    /**
     * The settings provider
     */
    @inject(TYPES.SettingsProvider) protected settingsProvider!: SettingsProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (
            event.button === 0 &&
            !(event.ctrlKey || event.altKey) &&
            this.isRegularInteractionTool() &&
            !this.isForcedScroll(event)
        ) {
            const moveableTarget = findParentByFeature(target, isMoveable);
            if (moveableTarget != undefined && moveableTarget instanceof SElement) {
                const parentCanvas = findParentByFeature(target, isCanvasLike);
                if (parentCanvas == undefined) {
                    throw new Error("Cannot move an element without a parent canvas");
                }
                const action: TransactionalMoveAction = {
                    kind: TransactionalMoveAction.KIND,
                    handlerProvider: () =>
                        this.createHandler(moveableTarget, event) ?? new NoopMoveHandler(identity(), undefined),
                    maxUpdatesPerRevision: MoveEditCanvasContentMouseListener.MAX_UPDATES_PER_REVISION
                };
                return [action];
            }
        }
        return [];
    }

    /**
     * Creates the handler for the current move
     *
     * @param target the element which was clicked
     * @param event the mouse event
     * @returns the move handler if move is supported, otherwise undefined
     */
    private createHandler(target: SElement, event: MouseEvent): MoveHandler | undefined {
        const targetElement = event.target as Element;
        const classList = targetElement?.classList;
        if (target instanceof SCanvasElement && classList != undefined) {
            if (classList.contains(CanvasElementView.ROTATE_ICON_CLASS)) {
                return this.createRotationHandler(target);
            } else if (classList.contains(CanvasElementView.RESIZE_CLASS)) {
                return this.createResizeHandler(target, classList, event);
            }
        } else if (target instanceof SCanvasConnection && classList != undefined) {
            return this.createAxisAlignedSegmentHandler(targetElement as HTMLElement, target, event);
        }
        return this.createMoveHandler(target, event);
    }

    /**
     * Creates a move handler for the given target.
     * Handles moving the vertical or horizontal pos of an axis aligned canvas connection segment
     *
     * @param targetElement the clicked svg element
     * @param target the clicked canvas connection
     * @param event the mouse event
     * @returns the move handler if move is supported, otherwise undefined
     */
    private createAxisAlignedSegmentHandler(
        targetElement: HTMLElement,
        target: SCanvasConnection,
        event: MouseEvent
    ): AxisAlignedSegmentEditMoveHandler | undefined {
        const dataset = targetElement.dataset;
        let start: number;
        let end: number;
        let current: number;
        let vertical: boolean;
        let otherStart: number;
        let otherEnd: number;
        const index = parseInt(dataset.index!);
        const segmentIndex = parseInt(dataset.segmentIndex!);
        const segment = target.segments[index] as SCanvasAxisAlignedSegment;
        const layout = target.layout.segments[index];
        if (segment.pos >= 0) {
            vertical = segmentIndex === 1;
            if (segmentIndex === 0) {
                current = layout.originalStart.y;
            } else if (segmentIndex === 1) {
                current = layout.start.x + segment.pos * (layout.end.x - layout.start.x);
            } else {
                current = layout.originalEnd.y;
            }
        } else {
            vertical = segmentIndex !== 1;
            if (segmentIndex === 0) {
                current = layout.originalStart.x;
            } else if (segmentIndex === 1) {
                current = layout.end.y + segment.pos * (layout.end.y - layout.start.y);
            } else {
                current = layout.originalEnd.x;
            }
        }
        const startOffset = index === 0 && target.startMarker != undefined ? Marker.markerWidth(target.startMarker) : 0;
        const isLastSegment = index === target.segments.length - 1;
        const endOffset = isLastSegment && target.endMarker != undefined ? Marker.markerWidth(target.endMarker) : 0;
        if (vertical) {
            const dx = layout.originalEnd.x - layout.originalStart.x;
            start = layout.originalStart.x + Math.sign(dx) * startOffset;
            end = layout.originalEnd.x - Math.sign(dx) * endOffset;
            otherStart = layout.originalStart.y;
            otherEnd = layout.originalEnd.y;
        } else {
            const dy = layout.originalEnd.y - layout.originalStart.y;
            start = layout.originalStart.y + Math.sign(dy) * startOffset;
            end = layout.originalEnd.y - Math.sign(dy) * endOffset;
            otherStart = layout.originalStart.x;
            otherEnd = layout.originalEnd.x;
        }
        return new AxisAlignedSegmentEditMoveHandler(
            current,
            start,
            end,
            vertical,
            segment,
            otherStart,
            otherEnd,
            this.settingsProvider.settings,
            this.configManager.config?.snappingEnabled ?? true,
            this.makeRelative(target.getMouseTransformationMatrix(), event),
            findResizeIconClass(targetElement.classList)
        );
    }

    /**
     * Creates a move handler for the given target.
     * Handles resize events meaning resizing all selected canvas elements
     *
     * @param target the primary target of the resize
     * @param classList classes of the svg element on which the resize was triggered
     * @param event the mouse event
     * @returns the resize handler if resize is supported, otherwise undefined
     */
    private createResizeHandler(
        target: SCanvasElement,
        classList: DOMTokenList,
        event: MouseEvent
    ): ResizeMoveHandler | undefined {
        const resizedElements = target.root.selectedElements.filter(
            (element) => element instanceof SCanvasElement
        ) as SCanvasElement[];
        const scaleX = this.computeXResizeFactor(resizedElements, classList, target);
        const scaleY = this.computeYResizeFactor(resizedElements, classList, target);
        if (scaleX == undefined && scaleY == undefined) {
            return undefined;
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
            return undefined;
        }
        return new ResizeMoveHandler(
            target,
            new Set(resizedElements.map((element) => element.id)),
            this.settingsProvider.settings,
            scaleX,
            scaleY,
            elements,
            this.configManager.config?.snappingEnabled ?? true,
            this.makeRelative(target.getMouseTransformationMatrix(), event),
            findResizeIconClass(classList)
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
            scaleX = classList.contains(ResizePosition.LEFT) ? -1 : 1;
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
            scaleY = classList.contains(ResizePosition.TOP) ? -1 : 1;
        }
        return scaleY;
    }
    /**
     * Creates the handler for the current move based on the target.
     * Handles rotation events, meaning rotating CanvasElements.
     *
     * @param target the element to rotate
     * @returns the move handler if rotation is supported, otherwise undefined
     */
    private createRotationHandler(target: SCanvasElement): MoveHandler | undefined {
        if (!(DefaultEditTypes.ROTATE in target.edits)) {
            return undefined;
        }
        return new RotationMoveHandler(target.id, target.rotation, target.getMouseTransformationMatrix());
    }

    /**
     * Creates the handler for the current move based on the selected elements.
     * Handles move events, meaning moving points on the canvas.
     *
     * @param target the element which was clicked
     * @param event the mouse event
     * @returns the move handler if move is supported, otherwise undefined
     */
    private createMoveHandler(target: SElement, event: MouseEvent): MoveHandler | undefined {
        const selected = target.root.selectedElements.filter(
            (element) =>
                element instanceof SCanvasPoint || element instanceof SCanvasElement || element instanceof SMarker
        ) as (SCanvasPoint | SCanvasElement | SMarker)[];
        if (selected.length === 0) {
            return undefined;
        }
        const moveSelection = this.computeMovedSelection(selected, target.root);
        if (moveSelection == undefined) {
            return undefined;
        }
        if ("linePoint" in moveSelection) {
            return this.createLineMoveHandler(moveSelection.linePoint, moveSelection.selector, event);
        }
        return this.createTranslationMoveHandler(moveSelection.entries, moveSelection.selector, event, target.root);
    }

    /**
     * Computes the move selection for the given selected elements.
     * Attempts to find a valid move selection by trying different combinations of x and y movement.
     * First tries both x and y movement, then only x movement, then only y movement.
     *
     * @param selected the selected elements that should be moved (points, canvas elements, or markers)
     * @param root the root element of the model
     * @returns the computed move selection (either translation or line move) if valid, otherwise undefined
     */
    private computeMovedSelection(
        selected: (SCanvasPoint | SCanvasElement | SMarker)[],
        root: SRoot
    ): TranslationMoveSelection | LineMoveSelection | undefined {
        const selector = new MovedElementsSelector(selected, root.index);
        const bothResult = this.tryComputeMovedSelection(root, selector, true, true);
        if (bothResult != undefined) {
            return bothResult;
        }
        const xResult = this.tryComputeMovedSelection(root, selector, true, false);
        if (xResult != undefined && "entries" in xResult) {
            return xResult;
        }
        const yResult = this.tryComputeMovedSelection(root, selector, false, true);
        if (yResult != undefined && "entries" in yResult) {
            return yResult;
        }
        return undefined;
    }

    /**
     * Attempts to compute a move selection with the given movement constraints.
     * Initializes the selector with the movement parameters and validates that elements can be moved.
     * Separates line points from translatable elements and ensures compatibility.
     *
     * @param root the root element of the model
     * @param selector the moved elements selector to use for determining affected elements
     * @param moveX whether movement in x direction is allowed
     * @param moveY whether movement in y direction is allowed
     * @returns a move selection (translation or line move) if valid, otherwise undefined
     */
    private tryComputeMovedSelection(
        root: SRoot,
        selector: MovedElementsSelector,
        moveX: boolean,
        moveY: boolean
    ): TranslationMoveSelection | LineMoveSelection | undefined {
        selector.initialize(moveX, moveY);
        if (selector.hasConflict) {
            return undefined;
        }
        const linePoints: Set<SLinePoint> = new Set();
        const translateableElementsX: Set<SCanvasElement | SRelativePoint | SAbsolutePoint> = new Set();
        const translateableElementsY: Set<SCanvasElement | SRelativePoint | SAbsolutePoint> = new Set();
        for (const element of selector.movedElementsX) {
            if (element instanceof SLinePoint) {
                linePoints.add(element);
            } else {
                translateableElementsX.add(element as SCanvasElement | SRelativePoint | SAbsolutePoint);
            }
        }
        for (const element of selector.movedElementsY) {
            if (element instanceof SLinePoint) {
                linePoints.add(element);
            } else {
                translateableElementsY.add(element as SCanvasElement | SRelativePoint | SAbsolutePoint);
            }
        }
        if (linePoints.size > 0) {
            if (linePoints.size > 1 || translateableElementsX.size > 0 || translateableElementsY.size > 0) {
                return undefined;
            }
            return {
                linePoint: linePoints.values().next().value!,
                selector
            };
        }
        if (translateableElementsX.size === 0 && translateableElementsY.size === 0) {
            return undefined;
        }
        for (const element of translateableElementsX) {
            if (element.edits[DefaultEditTypes.MOVE_X] == undefined) {
                return undefined;
            }
        }
        for (const element of translateableElementsY) {
            if (element.edits[DefaultEditTypes.MOVE_Y] == undefined) {
                return undefined;
            }
        }
        return {
            entries: this.computeTranslationMoveEntries(root, translateableElementsX, translateableElementsY),
            selector
        };
    }

    /**
     * Creates the line move handler for the given line point.
     *
     * @param linePoint the point to move
     * @param movedElementsSelector the moved elements selector to get the moved elements
     * @param event the mouse event
     * @returns the created move handler or undefined if no handler could be created
     */
    private createLineMoveHandler(
        linePoint: SLinePoint,
        movedElementsSelector: MovedElementsSelector,
        event: MouseEvent
    ): MoveHandler | undefined {
        const editPos = linePoint.edits[DefaultEditTypes.MOVE_LPOS_POS] != undefined;
        const editDist = linePoint.edits[DefaultEditTypes.MOVE_LPOS_DIST] != undefined && !(editPos && event.shiftKey);
        const editSpecifications: EditSpecificationEntry[] = [];
        if (editPos) {
            editSpecifications.push(linePoint.edits[DefaultEditTypes.MOVE_LPOS_POS]);
        }
        if (editDist) {
            editSpecifications.push(linePoint.edits[DefaultEditTypes.MOVE_LPOS_DIST]);
        }
        if (editSpecifications.length == 0 || !EditSpecification.isConsistent([editSpecifications])) {
            return undefined;
        }
        const root = linePoint.root;
        const rootTransformationMatrix = root.getMouseTransformationMatrix();
        const initialMousePosition = applyToPoint(rootTransformationMatrix, { x: event.pageX, y: event.pageY });
        const initialPointPosition = root.layoutEngine.getPoint(linePoint.id, root.id);
        const mouseOffset = translate(
            initialPointPosition.x - initialMousePosition.x,
            initialPointPosition.y - initialMousePosition.y
        );
        const line = root.layoutEngine.layoutLine(
            root.index.getById(linePoint.lineProvider) as SCanvasConnection | SCanvasElement,
            root.id
        );
        return new LineMoveHandler(
            linePoint.id,
            editPos,
            editDist,
            line,
            this.settingsProvider.settings ?? {},
            linePoint.segment == undefined ? linePoint.pos : [linePoint.segment, linePoint.pos],
            linePoint.distance,
            movedElementsSelector.selected,
            movedElementsSelector.affectedElementIds,
            root,
            initialPointPosition,
            this.configManager.config?.snappingEnabled ?? true,
            compose(mouseOffset, rootTransformationMatrix)
        );
    }

    /**
     * Creates the translation move handler for the given points and elements.
     *
     * @param elements the elements to move
     * @param movedElementsSelector the moved elements selector to get the moved elements
     * @param event the mouse down event
     * @param root the root element of the model
     * @returns the created move handler or undefined if no handler could be created
     */
    private createTranslationMoveHandler(
        entries: TranslationMoveEntry[],
        movedElementsSelector: MovedElementsSelector,
        event: MouseEvent,
        root: SRoot
    ): MoveHandler | undefined {
        if (entries.length == 0) {
            return undefined;
        }
        const editSpecifications = entries.map((entry) => {
            const res: (EditSpecificationEntry | undefined)[] = [];
            if (entry.moveX) {
                entry.elements.forEach((element) => res.push(element.edits[DefaultEditTypes.MOVE_X]));
            }
            if (entry.moveY) {
                entry.elements.forEach((element) => res.push(element.edits[DefaultEditTypes.MOVE_Y]));
            }
            return res;
        });
        if (!EditSpecification.isConsistent(editSpecifications)) {
            return undefined;
        }
        return new TranslationMoveHandler(
            entries.map((entry) => ({
                ...entry,
                elements: entry.elements.map((element) => element.id)
            })),
            movedElementsSelector.selected,
            movedElementsSelector.affectedElementIds,
            root,
            this.settingsProvider.settings,
            this.configManager.config?.snappingEnabled ?? true,
            this.makeRelative(root.getMouseTransformationMatrix(), event)
        );
    }

    /**
     * Computes the translation move entries for the given elements.
     * Groups the elements by their transformation matrix (ignoring translation).
     *
     * @param root the root element containing the diagram
     * @param xElements the elements to move in their x direction
     * @param yElements the elements to move in their y direction
     * @returns the translation move entries
     */
    private computeTranslationMoveEntries(
        root: SRoot,
        xElements: Set<SCanvasElement | SRelativePoint | SAbsolutePoint>,
        yElements: Set<SCanvasElement | SRelativePoint | SAbsolutePoint>
    ): TranslationMoveEntry[] {
        const xyElements = new Set<SCanvasElement | SRelativePoint | SAbsolutePoint>();
        const onlyXElements = new Set<SCanvasElement | SRelativePoint | SAbsolutePoint>();
        const onlyYElements = new Set<SCanvasElement | SRelativePoint | SAbsolutePoint>();
        for (const element of xElements) {
            if (yElements.has(element)) {
                xyElements.add(element);
            } else {
                onlyXElements.add(element);
            }
        }
        for (const element of yElements) {
            if (!xyElements.has(element)) {
                onlyYElements.add(element);
            }
        }
        return [
            ...this.computeTranslationMoveEntriesInternal(root, xyElements, true, true),
            ...this.computeTranslationMoveEntriesInternal(root, onlyXElements, true, false),
            ...this.computeTranslationMoveEntriesInternal(root, onlyYElements, false, true)
        ];
    }

    /**
     * Computes the translation move entries for the given elements.
     * Groups the elements by their transformation matrix (ignoring translation).
     *
     * @param root the root element containing the diagram
     * @param elements the elements to move
     * @param moveX whether to move the elements in x direction
     * @param moveY whether to move the elements in y direction
     * @returns the translation move entries
     */
    private computeTranslationMoveEntriesInternal(
        root: SRoot,
        elements: Set<SCanvasElement | SRelativePoint | SAbsolutePoint>,
        moveX: boolean,
        moveY: boolean
    ): TranslationMoveEntry[] {
        const entries = new Map<string, TranslationMoveEntry>();
        const transformationLookup = new Map<string, string>();
        for (const element of elements) {
            const parentCanvas = findParentByFeature(element, isCanvasLike)!;
            if (!transformationLookup.has(parentCanvas.id)) {
                const transformationMatrix = root.layoutEngine.localToAncestor(parentCanvas.id, root.id);
                const matrix = inverse(transformationMatrix);
                const { scale: tsrScale, rotation: tsrRotation } = decomposeTSR(matrix);
                const key = `${tsrRotation.angle} ${tsrScale.sx} ${tsrScale.sy}`;
                transformationLookup.set(parentCanvas.id, key);
                if (!entries.has(key)) {
                    entries.set(key, {
                        transformation: compose(scale(tsrScale.sx, tsrScale.sy), rotate(tsrRotation.angle)),
                        globalRotation: parentCanvas.globalRotation,
                        elements: [],
                        moveX,
                        moveY
                    });
                }
            }
            entries.get(transformationLookup.get(parentCanvas.id)!)!.elements.push(element);
        }
        return [...entries.values()];
    }

    /**
     * Computes a transformation matrix which makes future positions relative to the provided event.
     *
     * @param matrix the transformation matrix to apply
     * @param event the mouse event
     * @returns the transformation matrix
     */
    private makeRelative(matrix: Matrix, event: MouseEvent): Matrix {
        const initialPoint = applyToPoint(matrix, { x: event.pageX, y: event.pageY });
        return compose(translate(-initialPoint.x, -initialPoint.y), matrix);
    }
}

/**
 * Represents a group of elements that can be moved together with the same transformation.
 * Extends ElementsGroupedByTransformation but narrows the element types to canvas elements and points.
 */
interface TranslationMoveEntry extends Omit<ElementsGroupedByTransformation, "elements"> {
    /**
     * The canvas elements and points that will be moved together
     */
    elements: (SCanvasElement | SRelativePoint | SAbsolutePoint)[];
}

/**
 * Represents a selection of elements for translation move operations.
 * Contains grouped entries and a selector to manage the moved elements.
 */
interface TranslationMoveSelection {
    /**
     * The grouped entries containing elements that can be moved with translation
     */
    entries: TranslationMoveEntry[];
    /**
     * Selector used to determine which elements are affected by the move operation
     */
    selector: MovedElementsSelector;
}

/**
 * Represents a selection for line point move operations.
 * Used when moving a specific point along a line.
 */
interface LineMoveSelection {
    /**
     * The line point that will be moved
     */
    linePoint: SLinePoint;
    /**
     * Selector used to determine which elements are affected by the move operation
     */
    selector: MovedElementsSelector;
}

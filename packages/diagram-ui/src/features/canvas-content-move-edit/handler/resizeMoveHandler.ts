import { Bounds, DefaultEditTypes } from "@hylimo/diagram-common";
import type { Edit, ResizeEdit } from "@hylimo/diagram-protocol";
import { compose, inverse, rotateDEG, scale, type Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { ResizeMoveCursor } from "../../cursor/cursor.js";
import { getSnapLines, getSnaps } from "../../snap/snapping.js";
import {
    GapSnapDirection,
    SnapDirection,
    SnapType,
    type ContextSnapData,
    type GapSnapOptions,
    type Snap,
    type SnapLines
} from "../../snap/model.js";
import type { SCanvasElement } from "../../../model/canvas/sCanvasElement.js";
import type { SElement } from "../../../model/sElement.js";
import type { SRoot } from "../../../model/sRoot.js";
import { findViewportZoom } from "../../../base/findViewportZoom.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import type { SModelElementImpl } from "sprotty";
import { getSnapReferenceData } from "../../snap/snapData.js";
import { getCanvasElementCorners } from "../../snap/util.js";

/**
 * Elements with an optional original width and height.
 * If originalWidth is given, all elements in the group have the same original width.
 * If originalHeight is given, all elements in the group have the same original height.
 * At least one of the two must be given.
 */
export interface ElementsGroupedBySize {
    /**
     * The ids of the elements in the group.
     */
    elements: string[];
    /**
     * The original width of the elements in the group, or undefined if the elements have different widths.
     */
    originalWidth?: number;
    /**
     * The original height of the elements in the group, or undefined if the elements have different heights.
     */
    originalHeight?: number;
}

/**
 * Context object for storing and passing snap factor related data between methods.
 * Contains information about factor overrides and snap directions.
 */
interface SnapFactorContext {
    /**
     * Override for the x resize factor, if any snap was found.
     */
    overrideFactorX?: number;

    /**
     * Override for the y resize factor, if any snap was found.
     */
    overrideFactorY?: number;

    /**
     * Direction in which the x resize factor snapping was applied.
     */
    factorXDirection?: SnapDirection;

    /**
     * Direction in which the y resize factor snapping was applied.
     */
    factorYDirection?: SnapDirection;
}

/**
 * A move handler that resizes the elements.
 * Expects relative coordinates to its own coordinate system.
 */
export class ResizeMoveHandler extends MoveHandler {
    /**
     * Creates a new ResizeHandler.
     *
     * @param scaleX the scale factor in x direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param scaleY the scale factor in y direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param originalWidth the original width of the primary resize element, used to calculate the resize factor.
     * @param originalHeight the original height of the primary resize element, used to calculate the resize factor.
     * @param groupedElements the elements grouped by size.
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position.
     * @param moveCursor the cursor to use while resizing.
     * @param snapHandler the handler for snapping, if enabled.
     */
    constructor(
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        private readonly originalWidth: number,
        private readonly originalHeight: number,
        private readonly groupedElements: ElementsGroupedBySize[],
        private readonly snapHandler: ResizeSnapHandler | undefined,
        transformationMatrix: Matrix,
        moveCursor: ResizeMoveCursor | undefined
    ) {
        super(transformationMatrix, moveCursor);
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        let factorX: number | undefined = undefined;
        let factorY: number | undefined = undefined;

        if (this.scaleX !== undefined) {
            factorX = Math.abs((x * this.scaleX + this.originalWidth) / this.originalWidth);
        }
        if (this.scaleY !== undefined) {
            factorY = Math.abs((y * this.scaleY + this.originalHeight) / this.originalHeight);
        }
        const uniform = event.shiftKey && factorX != undefined && factorY != undefined;
        if (uniform) {
            const uniformFactor = Math.max(factorX!, factorY!);
            factorX = uniformFactor;
            factorY = uniformFactor;
        }
        let snapLines: SnapLines | undefined = undefined;
        if (this.snapHandler != undefined) {
            this.snapHandler.updateReferenceData(target.root as SRoot);
            const snapResult = this.snapHandler.snap(findViewportZoom(target), factorX, factorY, uniform);
            factorX = snapResult.factorX;
            factorY = snapResult.factorY;
            snapLines = snapResult.snapLines;
        }
        const edits: Edit[] = [];
        for (const group of this.groupedElements) {
            const values: ResizeEdit["values"] = {};
            const types: ResizeEdit["types"] = [];
            if (factorX != undefined) {
                values.width = group.originalWidth! * factorX;
                values.dw = values.width - group.originalWidth!;
                types.push(DefaultEditTypes.RESIZE_WIDTH);
            }
            if (factorY != undefined) {
                values.height = group.originalHeight! * factorY;
                values.dh = values.height - group.originalHeight!;
                types.push(DefaultEditTypes.RESIZE_HEIGHT);
            }
            edits.push({
                types,
                elements: group.elements,
                values
            } satisfies ResizeEdit);
        }
        return { edits, snapLines };
    }
}

/**
 * Snap handler for resizing canvas elements
 */
export class ResizeSnapHandler extends SnapHandler {
    /**
     * The transformation matrix to convert between element and target coordinates.
     */
    private readonly elementToTargetMatrix: Matrix;
    /**
     * The transformation matrix to convert between target and element coordinates.
     */
    private readonly targetToElementMatrix: Matrix;
    /**
     * Properties of the CanvasElement before resizing.
     */
    private readonly current: { width: number; height: number; dx: number; dy: number };
    /**
     * The corners of the element in the target coordinate system.
     */
    private readonly corners: ReturnType<typeof getCanvasElementCorners>;
    /**
     * The snapping options for gaps.
     */
    private readonly gapSnapOptions: GapSnapOptions;
    /**
     * Indices of the corners that are used for (point) snapping.
     */
    private readonly snapPointIndices: number[];
    /**
     * The relative dx value of the element (between 0 and 1).
     */
    private readonly dxRelative: number;
    /**
     * The relative dy value of the element (between 0 and 1).
     */
    private readonly dyRelative: number;
    /**
     * The context ID of the element being resized.
     */
    private readonly context: string;

    /**
     * Creates a new ResizeMoveSnapDataComputer.
     *
     * @param element The element being resized
     * @param scaleX The scale factor in x direction
     * @param scaleY The scale factor in y direction
     * @param root The root element of the model
     * @param ignoredElements The elements to be ignored during snapping
     * @param effectiveRotation The effective rotation of the element in quaters (1 = 90 degrees etc.)
     */
    constructor(
        element: SCanvasElement,
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        root: SRoot,
        ignoredElements: SElement[],
        private readonly effectiveRotation: number
    ) {
        const ignoredElementsSet = new Set<string>();
        for (const element of ignoredElements) {
            ignoredElementsSet.add(element.id);
        }
        const context = element.parent.id;

        super(getSnapReferenceData(root, new Set([context]), ignoredElementsSet));

        const layoutEngine = root.layoutEngine;
        this.context = context;

        this.elementToTargetMatrix = compose(
            rotateDEG(element.parent.globalRotation),
            layoutEngine.localToAncestor(element.id, this.context)
        );
        this.targetToElementMatrix = inverse(this.elementToTargetMatrix);

        this.current = {
            width: element.width,
            height: element.height,
            dx: element.dx,
            dy: element.dy
        };

        this.corners = getCanvasElementCorners(this.elementToTargetMatrix, this.current);
        const bounds = Bounds.ofPoints(this.corners);

        const factorX = scaleX != undefined ? (element.width + 1) / element.width : 1;
        const factorY = scaleY != undefined ? (element.height + 1) / element.height : 1;
        const resized = {
            width: this.current.width * factorX,
            height: this.current.height * factorY,
            dx: this.current.dx * factorX,
            dy: this.current.dy * factorY
        };

        const resizedCorners = getCanvasElementCorners(this.elementToTargetMatrix, resized);
        const resizedBounds = Bounds.ofPoints(resizedCorners);

        this.gapSnapOptions = this.calculateGapSnapOptions(bounds, resizedBounds);

        this.snapPointIndices = [0, 1, 2, 3].filter(
            (index) =>
                Math.abs(resizedCorners[index].x - this.corners[index].x) > 0 ||
                Math.abs(resizedCorners[index].y - this.corners[index].y) > 0
        );

        this.dxRelative = -element.dx / element.width;
        this.dyRelative = -element.dy / element.height;
    }

    /**
     * Calculates gap snap options based on differences between original and resized element bounds
     *
     * @param bounds The original element bounds
     * @param resizedBounds The resized element bounds
     * @returns The gap snap options configuration
     */
    private calculateGapSnapOptions(bounds: Bounds, resizedBounds: Bounds): GapSnapOptions {
        const left =
            Math.abs(resizedBounds.position.x + resizedBounds.size.width - (bounds.position.x + bounds.size.width)) > 0;
        const right = Math.abs(resizedBounds.position.x - bounds.position.x) > 0;
        const top =
            Math.abs(resizedBounds.position.y + resizedBounds.size.height - (bounds.position.y + bounds.size.height)) >
            0;
        const bottom = Math.abs(resizedBounds.position.y - bounds.position.y) > 0;

        return {
            right,
            left,
            centerHorizontal: left != right,
            bottom,
            top,
            centerVertical: top != bottom
        };
    }

    /**
     * Gets the snapped factors and snap lines based on the current resize operation.
     *
     * @param zoom The current zoom level
     * @param factorX The x resize factor
     * @param factorY The y resize factor
     * @param uniform Whether the resize should be uniform
     * @returns The adjusted factors and snap lines
     */
    snap(
        zoom: number,
        factorX: number | undefined,
        factorY: number | undefined,
        uniform: boolean
    ): {
        factorX: number | undefined;
        factorY: number | undefined;
        snapLines: SnapLines | undefined;
    } {
        const resized = {
            width: this.current.width * (factorX ?? 1),
            height: this.current.height * (factorY ?? 1),
            dx: this.current.dx * (factorX ?? 1),
            dy: this.current.dy * (factorY ?? 1)
        };
        const resizedCorners = getCanvasElementCorners(this.elementToTargetMatrix, resized);

        const snapData: ContextSnapData = {
            bounds: Bounds.ofPoints(resizedCorners),
            points: this.snapPointIndices.map((index) => resizedCorners[index])
        };

        const axisFlipped = this.effectiveRotation % 2 === 1;
        const result = getSnaps(
            new Map([[this.context, snapData]]),
            this.referenceData,
            zoom,
            { x: 0, y: 0 },
            {
                snapX: this.gapSnapOptions.left || this.gapSnapOptions.right,
                snapY: this.gapSnapOptions.top || this.gapSnapOptions.bottom,
                snapGaps: this.gapSnapOptions,
                snapPoints: true,
                snapSize: {
                    horizontal: 1 / ((axisFlipped ? this.scaleY : this.scaleX) ?? 1),
                    vertical: 1 / ((axisFlipped ? this.scaleX : this.scaleY) ?? 1)
                }
            }
        );

        const { newFactorX, newFactorY } = this.processSnaps(result, factorX, factorY, uniform, resizedCorners);

        const transform = compose(
            this.elementToTargetMatrix,
            scale((newFactorX ?? 1) / (factorX ?? 1), (newFactorY ?? 1) / (factorY ?? 1)),
            this.targetToElementMatrix
        );

        const snapLines = getSnapLines(result, transform);

        return {
            factorX: newFactorX,
            factorY: newFactorY,
            snapLines
        };
    }

    /**
     * Processes snap results and calculates adjusted factors.
     *
     * @param result The snap result
     * @param factorX The x resize factor
     * @param factorY The y resize factor
     * @param uniform Whether the resize should be uniform
     * @param resizedCorners The corners of the resized element
     * @returns The adjusted factors and their directions
     */
    private processSnaps(
        result: ReturnType<typeof getSnaps>,
        factorX: number | undefined,
        factorY: number | undefined,
        uniform: boolean,
        resizedCorners: ReturnType<typeof getCanvasElementCorners>
    ): {
        newFactorX: number | undefined;
        newFactorY: number | undefined;
    } {
        const context: SnapFactorContext = {};
        this.adaptFactorsBasedOnSnaps(result, factorX, factorY, resizedCorners, context);
        const resizeFactors = this.calculateFinalResizeFactors(factorX, factorY, uniform, context);

        if (
            context.factorXDirection !== SnapDirection.HORIZONTAL &&
            context.factorYDirection !== SnapDirection.HORIZONTAL
        ) {
            result.nearestSnapsX.length = 0;
        }
        if (
            context.factorXDirection !== SnapDirection.VERTICAL &&
            context.factorYDirection !== SnapDirection.VERTICAL
        ) {
            result.nearestSnapsY.length = 0;
        }
        return resizeFactors;
    }

    /**
     * Adapts factors based on snap results.
     *
     * @param result The snap result
     * @param factorX The x resize factor
     * @param factorY The y resize factor
     * @param resizedCorners The corners of the resized element
     * @param context The snap factor context to update
     */
    private adaptFactorsBasedOnSnaps(
        result: ReturnType<typeof getSnaps>,
        factorX: number | undefined,
        factorY: number | undefined,
        resizedCorners: ReturnType<typeof getCanvasElementCorners>,
        context: SnapFactorContext
    ): void {
        if (result.nearestSnapsX.length > 0) {
            const snapX = result.nearestSnapsX[0];
            this.adaptFactorsBasedOnXSnap(snapX, result, factorX, factorY, resizedCorners, context);
        }

        if (result.nearestSnapsY.length > 0) {
            const snapY = result.nearestSnapsY[0];
            this.adaptFactorsBasedOnYSnap(snapY, result, factorX, factorY, resizedCorners, context);
        }
    }

    /**
     * Adapts factors based on the horizontal snap result.
     *
     * @param snapX The horizontal snap data
     * @param result The snap result
     * @param factorX The x resize factor
     * @param factorY The y resize factor
     * @param resizedCorners The corners of the resized element
     * @param context The snap factor context to update
     */
    private adaptFactorsBasedOnXSnap(
        snapX: Snap,
        result: ReturnType<typeof getSnaps>,
        factorX: number | undefined,
        factorY: number | undefined,
        resizedCorners: ReturnType<typeof getCanvasElementCorners>,
        context: SnapFactorContext
    ) {
        if (snapX.type === SnapType.SIZE) {
            if (this.effectiveRotation % 2 === 0 && factorX != undefined) {
                context.overrideFactorX = snapX.targetBounds.size.width / this.current.width;
                context.factorXDirection = SnapDirection.HORIZONTAL;
            } else if (this.effectiveRotation % 2 === 1 && factorY != undefined) {
                context.overrideFactorY = snapX.targetBounds.size.width / this.current.height;
                context.factorYDirection = SnapDirection.HORIZONTAL;
            }
        } else {
            const target = this.getHorizontalSnapTarget(snapX);
            const index = findMinIndexBy(resizedCorners, (corner) => Math.abs(corner.x - target));
            const value = this.corners[index].x;
            const x2 = this.corners[(index + 1) % 4].x;
            const y2 = this.corners[(index + 2) % 4].x;
            const cx = index % 2 === 0 ? this.dxRelative : 1 - this.dxRelative;
            const cy = index < 2 ? this.dyRelative : 1 - this.dyRelative;

            if (!this.adaptFactor(value, target, x2, cx, y2, cy, SnapDirection.HORIZONTAL, factorX, factorY, context)) {
                result.nearestSnapsX.length = 0;
            }
        }
    }

    /**
     * Adapts factors based on the vertical snap result.
     *
     * @param snapY The vertical snap data
     * @param result The snap result
     * @param factorX The x resize factor
     * @param factorY The y resize factor
     * @param resizedCorners The corners of the resized element
     * @param context The snap factor context to update
     */
    private adaptFactorsBasedOnYSnap(
        snapY: Snap,
        result: ReturnType<typeof getSnaps>,
        factorX: number | undefined,
        factorY: number | undefined,
        resizedCorners: ReturnType<typeof getCanvasElementCorners>,
        context: SnapFactorContext
    ) {
        if (snapY.type === SnapType.SIZE) {
            if (this.effectiveRotation % 2 === 0 && factorY != undefined) {
                context.overrideFactorY = snapY.targetBounds.size.height / this.current.height;
                context.factorYDirection = SnapDirection.VERTICAL;
            } else if (this.effectiveRotation % 2 === 1 && factorX != undefined) {
                context.overrideFactorX = snapY.targetBounds.size.height / this.current.width;
                context.factorXDirection = SnapDirection.VERTICAL;
            }
        } else {
            const target = this.getVerticalSnapTarget(snapY);
            const index = findMinIndexBy(resizedCorners, (corner) => Math.abs(corner.y - target));
            const value = this.corners[index].y;
            const x2 = this.corners[(index + 1) % 4].y;
            const y2 = this.corners[(index + 2) % 4].y;
            const cx = index % 2 === 0 ? this.dxRelative : 1 - this.dxRelative;
            const cy = index < 2 ? this.dyRelative : 1 - this.dyRelative;

            if (!this.adaptFactor(value, target, x2, cx, y2, cy, SnapDirection.VERTICAL, factorX, factorY, context)) {
                result.nearestSnapsY.length = 0;
            }
        }
    }

    /**
     * Calculates final factors based on context and uniform resize settings.
     *
     * @param factorX The x resize factor
     * @param factorY The y resize factor
     * @param uniform Whether the resize should be uniform
     * @param context The snap factor context with overrides
     * @returns The adjusted factors
     */
    private calculateFinalResizeFactors(
        factorX: number | undefined,
        factorY: number | undefined,
        uniform: boolean,
        context: SnapFactorContext
    ): {
        newFactorX: number | undefined;
        newFactorY: number | undefined;
    } {
        let newFactorX = context.overrideFactorX ?? factorX;
        let newFactorY = context.overrideFactorY ?? factorY;

        if (uniform && (context.overrideFactorX != undefined || context.overrideFactorY != undefined)) {
            if (context.overrideFactorX != undefined && context.overrideFactorY != undefined) {
                if (context.overrideFactorX > context.overrideFactorY) {
                    newFactorY = context.overrideFactorX;
                    context.factorYDirection = context.factorXDirection;
                } else {
                    newFactorX = context.overrideFactorY;
                    context.factorXDirection = context.factorYDirection;
                }
            } else if (context.overrideFactorX != undefined) {
                newFactorY = context.overrideFactorX;
            } else if (context.overrideFactorY != undefined) {
                newFactorX = context.overrideFactorY;
            }
        }

        return {
            newFactorX,
            newFactorY
        };
    }

    /**
     * Adapts factors based on snap constraints.
     *
     * @param value The original position value
     * @param target The target position value to snap to
     * @param x2 the neighboring position value in the x direction
     * @param cx the relative attachement point in x direction
     * @param y2 the neighboring position value in the y direction
     * @param cy the relative attachement point in y direction
     * @param snapDirection The snap direction (horizontal or vertical)
     * @param factorX The current x resize factor
     * @param factorY The current y resize factor
     * @param context The snap factor context to update
     * @returns true if adaptation was successful, false otherwise
     */
    private adaptFactor(
        value: number,
        target: number,
        x2: number,
        cx: number,
        y2: number,
        cy: number,
        snapDirection: SnapDirection,
        factorX: number | undefined,
        factorY: number | undefined,
        context: SnapFactorContext
    ): boolean {
        const factorXNew = (target - (value + (x2 - value) * cx)) / ((value - x2) * cx);
        const factorYNew = (target - (value + (y2 - value) * cy)) / ((value - y2) * cy);

        if (factorX != undefined) {
            if (factorY == undefined || Math.abs(factorXNew - factorX) < Math.abs(factorYNew - factorY)) {
                context.overrideFactorX = factorXNew;
                context.factorXDirection = snapDirection;
                return true;
            }
        }
        if (factorY != undefined) {
            if (factorX == undefined || Math.abs(factorYNew - factorY) < Math.abs(factorXNew - factorX)) {
                context.overrideFactorY = factorYNew;
                context.factorYDirection = snapDirection;
                return true;
            }
        }
        return false;
    }

    /**
     * Gets the target position for horizontal snapping.
     *
     * @param snapX The horizontal snap data
     * @returns The target x position
     */
    private getHorizontalSnapTarget(snapX: ReturnType<typeof getSnaps>["nearestSnapsX"][0]): number {
        if (snapX.type === SnapType.SIZE) {
            throw new Error("Unexpected snap type");
        }
        if (snapX.type === SnapType.POINT) {
            return snapX.referencePoint.x;
        } else if (snapX.direction === GapSnapDirection.SIDE_RIGHT) {
            return snapX.bounds.position.x + snapX.offset;
        } else if (snapX.direction === GapSnapDirection.SIDE_LEFT) {
            return snapX.bounds.position.x + snapX.bounds.size.width + snapX.offset;
        } else {
            const { startBounds, endBounds } = snapX.gap;
            return (
                endBounds.position.x +
                startBounds.position.x +
                startBounds.size.width -
                (this.gapSnapOptions.left ? snapX.bounds.position.x : snapX.bounds.position.x + snapX.bounds.size.width)
            );
        }
    }

    /**
     * Gets the target position for vertical snapping.
     *
     * @param snapY The vertical snap data
     * @returns The target y position
     */
    private getVerticalSnapTarget(snapY: ReturnType<typeof getSnaps>["nearestSnapsY"][0]): number {
        if (snapY.type === SnapType.SIZE) {
            throw new Error("Unexpected snap type");
        }
        if (snapY.type === SnapType.POINT) {
            return snapY.referencePoint.y;
        } else if (snapY.direction === GapSnapDirection.SIDE_BOTTOM) {
            return snapY.bounds.position.y + snapY.offset;
        } else if (snapY.direction === GapSnapDirection.SIDE_TOP) {
            return snapY.bounds.position.y + snapY.bounds.size.height + snapY.offset;
        } else {
            const { startBounds, endBounds } = snapY.gap;
            return (
                endBounds.position.y +
                startBounds.position.y +
                startBounds.size.height -
                (this.gapSnapOptions.top ? snapY.bounds.position.y : snapY.bounds.position.y + snapY.bounds.size.height)
            );
        }
    }
}

/**
 * Creates a ResizeMoveHandler for resizing elements.
 *
 * @param element The element being resized.
 * @param scaleX The scale factor in x direction.
 * @param scaleY The scale factor in y direction.
 * @param ignoredElements The elements to be ignored during snapping.
 * @param root The root element of the model.
 * @returns The computed snap reference data or undefined if snapping is disabled.
 */
export function createResizeSnapHandler(
    element: SCanvasElement,
    scaleX: number | undefined,
    scaleY: number | undefined,
    ignoredElements: SElement[],
    root: SRoot
): ResizeSnapHandler | undefined {
    const rotation = element.parent.globalRotation + element.rotation;
    if (rotation % 90 !== 0) {
        return undefined;
    }
    const effectiveRotation = (((rotation / 90) % 4) + 4) % 4;

    return new ResizeSnapHandler(element, scaleX, scaleY, root, ignoredElements, effectiveRotation);
}

/**
 * Finds the index of the minimum value in an array based on a callback function.
 *
 * @param array The array to search through.
 * @param callback A function that takes an element of the array and returns a numeric value to compare.
 * @returns The index of the element with the minimum value as determined by the callback function.
 */
function findMinIndexBy<T>(array: T[], callback: (value: T) => number): number {
    let minIndex = -1;
    let minValue = Number.POSITIVE_INFINITY;
    for (let i = 0; i < array.length; i++) {
        const value = callback(array[i]);
        if (value < minValue) {
            minValue = value;
            minIndex = i;
        }
    }
    return minIndex;
}

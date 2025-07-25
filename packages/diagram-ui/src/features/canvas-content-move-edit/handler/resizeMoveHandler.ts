import { Bounds, DefaultEditTypes } from "@hylimo/diagram-common";
import { SharedSettings, type Edit, type ResizeEdit } from "@hylimo/diagram-protocol";
import { compose, inverse, rotateDEG, scale, type Matrix } from "transformation-matrix";
import { type HandleMoveResult } from "../../move/moveHandler.js";
import type { ResizeMoveCursor } from "../../cursor/cursor.js";
import { filterValidSnaps, getSnapLines, getSnaps } from "../../snap/snapping.js";
import {
    GapSnapDirection,
    SnapDirection,
    SnapType,
    type ContextSnapData,
    type GapSnapOptions,
    type Snap,
    type SnapLines,
    type SnapResult
} from "../../snap/model.js";
import type { SCanvasElement } from "../../../model/canvas/sCanvasElement.js";
import type { SRoot } from "../../../model/sRoot.js";
import { findViewportZoom } from "../../../base/findViewportZoom.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import type { SModelElementImpl } from "sprotty";
import { getSnapReferenceData } from "../../snap/snapData.js";
import { getCanvasElementCorners } from "../../snap/util.js";
import { SnapMoveHandler } from "../../snap/snapMoveHandler.js";

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
 * Represents the resize factors resulting from snap operations.
 * Contains the adjusted scaling factors after snapping has been applied.
 */
interface SnapResizeFactors {
    /**
     * The adjusted horizontal resize factor after snapping.
     * Represents how much the element should be scaled horizontally relative to its original width.
     * Undefined if no horizontal resizing is being performed.
     */
    factorX: number | undefined;

    /**
     * The adjusted vertical resize factor after snapping.
     * Represents how much the element should be scaled vertically relative to its original height.
     * Undefined if no vertical resizing is being performed.
     */
    factorY: number | undefined;
}

/**
 * A move handler that resizes the elements.
 * Expects relative coordinates to its own coordinate system.
 */
export class ResizeMoveHandler extends SnapMoveHandler<ResizeSnapHandler | undefined> {
    /**
     * The original width of the primary resize element, used to calculate the resize factor.
     */
    private readonly originalWidth: number;

    /**
     * The original height of the primary resize element, used to calculate the resize factor.
     */
    private readonly originalHeight: number;

    /**
     * Creates a new ResizeHandler.
     *
     * @param element the canvas element to resize.
     * @param ignoredElements the set of element IDs to ignore during operations.
     * @param settings the shared settings used for operations.
     * @param scaleX the scale factor in x direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param scaleY the scale factor in y direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param groupedElements the elements grouped by size.
     * @param snappingEnabled whether snapping is enabled.
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position.
     * @param moveCursor the cursor to use while resizing.
     */
    constructor(
        element: SCanvasElement,
        ignoredElements: Set<string>,
        settings: SharedSettings | undefined,
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        private readonly groupedElements: ElementsGroupedBySize[],
        snappingEnabled: boolean,
        transformationMatrix: Matrix,
        moveCursor: ResizeMoveCursor | undefined
    ) {
        const rotation = element.parent.globalRotation + element.rotation;
        let snapHandler: ResizeSnapHandler | undefined = undefined;
        if (rotation % 90 === 0) {
            const effectiveRotation = (((rotation / 90) % 4) + 4) % 4;
            snapHandler = new ResizeSnapHandler(element, scaleX, scaleY, ignoredElements, effectiveRotation, settings);
        }
        super(snapHandler, snappingEnabled, transformationMatrix, moveCursor);
        this.originalWidth = element.width;
        this.originalHeight = element.height;
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
        if (this.snapHandler != undefined && this.isSnappingEnabled(event)) {
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
class ResizeSnapHandler extends SnapHandler {
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
     * @param ignoredElements The elements to be ignored during snapping
     * @param effectiveRotation The effective rotation of the element in quaters (1 = 90 degrees etc.)
     * @param settings the shared settings for snap data computation
     */
    constructor(
        element: SCanvasElement,
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        ignoredElements: Set<string>,
        private readonly effectiveRotation: number,
        settings: SharedSettings | undefined
    ) {
        const context = element.parent.id;
        const root = element.root;
        super(getSnapReferenceData(root, new Set([context]), ignoredElements), settings);

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
        const { factorX: roundedFactorX, factorY: roundedFactorY } = this.calculateRoundedFactors({ factorX, factorY });
        const resized = {
            width: this.current.width * (roundedFactorX ?? 1),
            height: this.current.height * (roundedFactorY ?? 1),
            dx: this.current.dx * (roundedFactorX ?? 1),
            dy: this.current.dy * (roundedFactorY ?? 1)
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

        let newFactors = this.processSnaps(result, roundedFactorX, roundedFactorY, uniform, resizedCorners);
        const hasChanges = filterValidSnaps(
            result,
            this.createRoundedScale(roundedFactorX, roundedFactorY, newFactors)
        );
        if (hasChanges) {
            newFactors = this.processSnaps(result, roundedFactorX, roundedFactorY, uniform, resizedCorners);
        }

        const snapLines = getSnapLines(result, this.createRoundedScale(roundedFactorX, roundedFactorY, newFactors));

        return {
            factorX: newFactors.factorX,
            factorY: newFactors.factorY,
            snapLines
        };
    }

    /**
     * Creates a scale matrix for resizing the element.
     *
     * @param factorX the x resize factor
     * @param factorY the y resize factor
     * @param newFactors the new resize factors
     * @returns a translation matrix with the rounded coordinates
     */
    private createRoundedScale(
        factorX: number | undefined,
        factorY: number | undefined,
        newFactorsFromSnap: SnapResizeFactors
    ): Matrix {
        const roundedFactors = this.calculateRoundedFactors(newFactorsFromSnap);

        return compose(
            this.elementToTargetMatrix,
            scale((roundedFactors.factorX ?? 1) / (factorX ?? 1), (roundedFactors.factorY ?? 1) / (factorY ?? 1)),
            this.targetToElementMatrix
        );
    }

    /**
     * Calculates the rounded resize factors based on the input factors.
     *
     * @param inputFactors The resize factors before rounding.
     * @returns The rounded resize factors.
     */
    private calculateRoundedFactors(inputFactors: SnapResizeFactors): SnapResizeFactors {
        let roundedFactorX: number | undefined;
        let roundedFactorY: number | undefined;
        if (inputFactors.factorX != undefined) {
            const dw = this.current.width * inputFactors.factorX - this.current.width;
            roundedFactorX =
                (this.current.width + SharedSettings.roundToResizePrecision(this.settings, dw)) / this.current.width;
        }
        if (inputFactors.factorY != undefined) {
            const dh = this.current.height * inputFactors.factorY - this.current.height;
            roundedFactorY =
                (this.current.height + SharedSettings.roundToResizePrecision(this.settings, dh)) / this.current.height;
        }
        return { factorX: roundedFactorX, factorY: roundedFactorY };
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
        result: SnapResult,
        factorX: number | undefined,
        factorY: number | undefined,
        uniform: boolean,
        resizedCorners: ReturnType<typeof getCanvasElementCorners>
    ): SnapResizeFactors {
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
        result: SnapResult,
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
        result: SnapResult,
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
        result: SnapResult,
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
    ): SnapResizeFactors {
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
            factorX: newFactorX,
            factorY: newFactorY
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
    private getHorizontalSnapTarget(snapX: SnapResult["nearestSnapsX"][0]): number {
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
    private getVerticalSnapTarget(snapY: SnapResult["nearestSnapsY"][0]): number {
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

import { Bounds, DefaultEditTypes } from "@hylimo/diagram-common";
import type { Edit, ResizeEdit } from "@hylimo/diagram-protocol";
import { compose, inverse, rotateDEG, scale, type Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { ResizeMoveCursor } from "../../cursor/cursor.js";
import {
    getCanvasElementCorners,
    getSnapLines,
    getSnapReferenceData,
    getSnaps,
    SnapDirection,
    type ContextSnapData,
    type GapSnapOptions,
    type SnapLine,
    type SnapReferenceData
} from "../../snap/snapping.js";
import type { SCanvasElement } from "../../../model/canvas/sCanvasElement.js";
import type { SElement } from "../../../model/sElement.js";
import type { SRoot } from "../../../model/sRoot.js";
import { findViewportZoom } from "../../../base/findViewportZoom.js";

/**
 * Elements with an optional original width and height.
 * If originalWidth is given, all elements in the group have the same original width.
 * If originalHeight is given, all elements in the group have the same original height.
 * At least one of the two must be given.
 */
export interface ElementsGroupedBySize {
    elements: string[];
    originalWidth?: number;
    originalHeight?: number;
}

export interface ResizeSnapData {
    referenceData: SnapReferenceData;
    getSnappedFactorsAndLines: (
        referenceData: SnapReferenceData,
        zoom: number,
        factorX: number | undefined,
        factorY: number | undefined,
        uniform: boolean
    ) => {
        factorX: number | undefined;
        factorY: number | undefined;
        snapLines: Map<string, SnapLine[]> | undefined;
    };
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
     * @param snapData the data for snapping, if enabled.
     */
    constructor(
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        private readonly originalWidth: number,
        private readonly originalHeight: number,
        private readonly groupedElements: ElementsGroupedBySize[],
        transformationMatrix: Matrix,
        moveCursor: ResizeMoveCursor | undefined,
        private snapData: ResizeSnapData | undefined
    ) {
        super(transformationMatrix, moveCursor);
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SElement): HandleMoveResult {
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
        let snapLines: Map<string, SnapLine[]> | undefined;
        if (this.snapData != undefined) {
            const snapResult = this.snapData.getSnappedFactorsAndLines(
                this.snapData.referenceData,
                findViewportZoom(target),
                factorX,
                factorY,
                uniform
            );
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
 * Computes the snap reference data for resizing an element.
 *
 * @param element The element being resized.
 * @param ignoredElements The elements to be ignored during snapping.
 * @param root The root element of the model.
 * @returns The computed snap reference data or undefined if snapping is disabled.
 */
export function computeResizeMoveSnapData(
    element: SCanvasElement,
    scaleX: number | undefined,
    scaleY: number | undefined,
    ignoredElements: SElement[],
    root: SRoot
): ResizeSnapData | undefined {
    const rotation = element.parent.globalRotation + element.rotation;
    if (rotation % 90 !== 0) {
        return undefined;
    }
    const ignoredElementsSet = new Set<string>();
    for (const element of ignoredElements) {
        ignoredElementsSet.add(element.id);
    }
    const referenceData = getSnapReferenceData(root, new Set([element.parent.id]), ignoredElementsSet);
    const layoutEngine = root.layoutEngine;
    const context = element.parent.id;
    const elementToTargetMatrix = compose(
        rotateDEG(element.parent.globalRotation),
        layoutEngine.localToAncestor(element.id, context)
    );
    const targetToElementMatrix = inverse(elementToTargetMatrix);
    const current = {
        width: element.width,
        height: element.height,
        dx: element.dx,
        dy: element.dy
    };
    const corners = getCanvasElementCorners(elementToTargetMatrix, current);
    const bounds = Bounds.ofPoints(corners);
    const factorX = scaleX != undefined ? (element.width + 1) / element.width : 1;
    const factorY = scaleY != undefined ? (element.height + 1) / element.height : 1;
    const resized = {
        width: current.width * factorX,
        height: current.height * factorY,
        dx: element.dx * factorX,
        dy: element.dy * factorY
    };
    const resizedCorners = getCanvasElementCorners(elementToTargetMatrix, resized);
    const resizedBounds = Bounds.ofPoints(resizedCorners);
    const minDiff = 0.25;
    const snapGaps: GapSnapOptions = {
        right: Math.abs(resizedBounds.position.x - bounds.position.x) > minDiff,
        left:
            Math.abs(resizedBounds.position.x + resizedBounds.size.width - (bounds.position.x + bounds.size.width)) >
            minDiff,
        centerHorizontal:
            Math.abs(
                resizedBounds.position.x + resizedBounds.size.width / 2 - (bounds.position.x + bounds.size.width / 2)
            ) > minDiff,
        bottom: Math.abs(resizedBounds.position.y - bounds.position.y) > minDiff,
        top:
            Math.abs(resizedBounds.position.y + resizedBounds.size.height - (bounds.position.y + bounds.size.height)) >
            minDiff,
        centerVertical:
            Math.abs(
                resizedBounds.position.y + resizedBounds.size.height / 2 - (bounds.position.y + bounds.size.height / 2)
            ) > minDiff
    };
    const snapPointIndices = [0, 1, 2, 3].filter(
        (index) =>
            Math.abs(resizedCorners[index].x - corners[index].x) > minDiff ||
            Math.abs(resizedCorners[index].y - corners[index].y) > minDiff
    );
    const dxRelative = -element.dx / element.width;
    const dyRelative = -element.dy / element.height;
    return {
        referenceData,
        getSnappedFactorsAndLines: (referenceData, zoom, factorX, factorY, uniform) => {
            const resized = {
                width: current.width * (factorX ?? 1),
                height: current.height * (factorY ?? 1),
                dx: current.dx * (factorX ?? 1),
                dy: current.dy * (factorY ?? 1)
            };
            const resizedCorners = getCanvasElementCorners(elementToTargetMatrix, resized);
            const data: ContextSnapData = {
                bounds: Bounds.ofPoints(resizedCorners),
                points: snapPointIndices.map((index) => resizedCorners[index])
            };
            const result = getSnaps(new Map([[context, data]]), referenceData, zoom, {
                snapX: snapGaps.left || snapGaps.right,
                snapY: snapGaps.top || snapGaps.bottom,
                snapGaps,
                snapPoints: true
            });
            let overrideFactorX: number | undefined = undefined;
            let overrideFactorY: number | undefined = undefined;
            let factorXDirection: SnapDirection | undefined = undefined;
            let factorYDirection: SnapDirection | undefined = undefined;

            function adaptFactor(
                value: number,
                target: number,
                x2: number,
                cx: number,
                y2: number,
                cy: number,
                snapDirection: SnapDirection
            ): boolean {
                const factorXNew = (target - (value + (x2 - value) * cx)) / ((value - x2) * cx);
                const factorYNew = (target - (value + (y2 - value) * cy)) / ((value - y2) * cy);
                if (factorX != undefined) {
                    if (factorY == undefined || Math.abs(factorXNew - factorX) < Math.abs(factorYNew - factorY)) {
                        if (
                            overrideFactorX == undefined ||
                            Math.abs(factorXNew - factorX) < Math.abs(overrideFactorX - factorX)
                        ) {
                            overrideFactorX = factorXNew;
                            factorXDirection = snapDirection;
                            return true;
                        }
                    }
                }
                if (factorY != undefined) {
                    if (factorX == undefined || Math.abs(factorYNew - factorY) < Math.abs(factorXNew - factorX)) {
                        if (
                            overrideFactorY == undefined ||
                            Math.abs(factorYNew - factorY) < Math.abs(overrideFactorY - factorY)
                        ) {
                            overrideFactorY = factorYNew;
                            factorYDirection = snapDirection;
                            return true;
                        }
                    }
                }
                return false;
            }
            if (result.nearestSnapsX.length > 0) {
                const snapX = result.nearestSnapsX[0];
                let reference: number;
                if (snapX.type === "point") {
                    reference = snapX.point.x;
                } else if (snapX.direction === "side_right") {
                    reference = snapX.bounds.position.x;
                } else if (snapX.direction === "side_left") {
                    reference = snapX.bounds.position.x + snapX.bounds.size.width;
                } else {
                    reference = snapX.bounds.position.x + (dxRelative < 0.5 ? 0 : snapX.bounds.size.width);
                }
                const target = reference + snapX.offset;
                const index = findMinIndexBy(resizedCorners, (corner) => Math.abs(corner.x - target));
                if (
                    !adaptFactor(
                        corners[index].x,
                        target,
                        corners[(index + 1) % 4].x,
                        index % 2 === 0 ? dxRelative : 1 - dxRelative,
                        corners[(index + 2) % 4].x,
                        index < 2 ? dyRelative : 1 - dyRelative,
                        SnapDirection.HORIZONTAL
                    )
                ) {
                    result.nearestSnapsX.length = 0;
                }
            }
            if (result.nearestSnapsY.length > 0) {
                const snapY = result.nearestSnapsY[0];
                let reference: number;
                if (snapY.type === "point") {
                    reference = snapY.point.y;
                } else if (snapY.direction === "side_bottom") {
                    reference = snapY.bounds.position.y;
                } else if (snapY.direction === "side_top") {
                    reference = snapY.bounds.position.y + snapY.bounds.size.height;
                } else {
                    reference = snapY.bounds.position.y + (dyRelative < 0.5 ? 0 : snapY.bounds.size.height);
                }
                const target = reference + snapY.offset;
                const index = findMinIndexBy(resizedCorners, (corner) => Math.abs(corner.y - target));
                if (
                    !adaptFactor(
                        corners[index].y,
                        target,
                        corners[(index + 1) % 4].y,
                        index % 2 === 0 ? dxRelative : 1 - dxRelative,
                        corners[(index + 2) % 4].y,
                        index < 2 ? dyRelative : 1 - dyRelative,
                        SnapDirection.VERTICAL
                    )
                ) {
                    result.nearestSnapsY.length = 0;
                }
            }
            let newFactorX = overrideFactorX ?? factorX;
            let newFactorY = overrideFactorY ?? factorY;
            if (uniform && (overrideFactorX != undefined || overrideFactorY != undefined)) {
                if (overrideFactorX != undefined && overrideFactorY != undefined) {
                    if (overrideFactorX > overrideFactorY) {
                        newFactorY = overrideFactorX;
                        factorYDirection = factorXDirection;
                    } else {
                        newFactorX = overrideFactorY;
                        factorXDirection = factorYDirection;
                    }
                } else if (overrideFactorX != undefined) {
                    newFactorY = overrideFactorX;
                } else if (overrideFactorY != undefined) {
                    newFactorX = overrideFactorY;
                }
            }
            const transform = compose(
                elementToTargetMatrix,
                scale((newFactorX ?? 1) / (factorX ?? 1), (newFactorY ?? 1) / (factorY ?? 1)),
                targetToElementMatrix
            );
            if (factorXDirection != SnapDirection.HORIZONTAL && factorYDirection != SnapDirection.HORIZONTAL) {
                result.nearestSnapsX.length = 0;
            }
            if (factorXDirection != SnapDirection.VERTICAL && factorYDirection != SnapDirection.VERTICAL) {
                result.nearestSnapsY.length = 0;
            }
            const snapLines = getSnapLines(result, transform);
            return {
                factorX: newFactorX,
                factorY: newFactorY,
                snapLines
            };
        }
    };
}

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

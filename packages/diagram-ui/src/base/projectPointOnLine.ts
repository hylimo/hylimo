import { LineEngine } from "@hylimo/diagram-common";
import type { ProjectionResult } from "@hylimo/diagram-common";
import type { Point } from "@hylimo/diagram-common";
import type { TransformedLine } from "@hylimo/diagram-common";
import { Math2D } from "@hylimo/diagram-common";

/**
 * Rounding information for the projectPointOnLine function
 */
export interface RoundingInformation {
    /**
     * The precision to use for rounding
     */
    posPrecision: number | undefined;
    /**
     * Whether to round the relativePos (true) or the pos (false)
     */
    hasSegment: boolean;
}

/**
 * Projects a point on a line, similar to LineEngine.projectPoint, but with additional rounding.
 *
 * @param point the point to project onto the line
 * @param transformedLine the line with its transform
 * @param roundingInformation information on how to round the result
 * @param forcedDistance optional distance to force
 * @returns the projection result with possible rounding applied
 */
export function projectPointOnLine(
    point: Point,
    transformedLine: TransformedLine,
    roundingInformation: RoundingInformation,
    forcedDistance: number | undefined
): ProjectionResult {
    const originalProjection = LineEngine.DEFAULT.projectPoint(point, transformedLine, forcedDistance);
    const { posPrecision, hasSegment: isSegment } = roundingInformation;
    if (posPrecision == undefined) {
        return originalProjection;
    }
    const valueToRound = isSegment ? originalProjection.relativePos : originalProjection.pos;
    const roundedDown = Math.floor(valueToRound / posPrecision) * posPrecision;
    const roundedUp = Math.ceil(valueToRound / posPrecision) * posPrecision;
    const isDownInRange = roundedDown >= 0 && roundedDown <= 1;
    const isUpInRange = roundedUp >= 0 && roundedUp <= 1;

    if (!isDownInRange && !isUpInRange) {
        return originalProjection;
    }

    const optionsToTest: number[] = [];
    if (isDownInRange) {
        optionsToTest.push(roundedDown);
    }
    if (isUpInRange) {
        optionsToTest.push(roundedUp);
    }

    if (forcedDistance !== undefined) {
        return findBestProjectionWithFixedDistance(
            point,
            transformedLine,
            optionsToTest,
            originalProjection,
            isSegment,
            forcedDistance
        );
    } else {
        return findBestProjectionWithOptimalDistance(
            point,
            transformedLine,
            optionsToTest,
            originalProjection,
            isSegment
        );
    }
}

/**
 * Finds the best projection result with a fixed distance from the provided options
 *
 * @param point the point to project onto the line
 * @param transformedLine the line with its transform
 * @param optionsToTest the rounded position values to test
 * @param originalProjection the original projection result
 * @param isSegment whether the rounded value is the relative position
 * @param forcedDistance the fixed distance to use
 * @returns the best projection result
 */
function findBestProjectionWithFixedDistance(
    point: Point,
    transformedLine: TransformedLine,
    optionsToTest: number[],
    originalProjection: ProjectionResult,
    isSegment: boolean,
    forcedDistance: number
): ProjectionResult {
    let bestResult = originalProjection;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const roundedValue of optionsToTest) {
        const result = createProjectionResult(
            roundedValue,
            isSegment,
            transformedLine,
            forcedDistance,
            originalProjection.segment
        );

        const pointOnLine = isSegment
            ? LineEngine.DEFAULT.getPoint(result.relativePos, result.segment, forcedDistance, transformedLine)
            : LineEngine.DEFAULT.getPoint(result.pos, undefined, forcedDistance, transformedLine);
        const distance = Math2D.distance(point, pointOnLine);

        if (distance < minDistance) {
            minDistance = distance;
            bestResult = result;
        }
    }

    return bestResult;
}

/**
 * Finds the best projection result with an optimal distance from the provided options
 *
 * @param point the point to project onto the line
 * @param transformedLine the line with its transform
 * @param optionsToTest the rounded position values to test
 * @param originalProjection the original projection result
 * @param isSegment whether the rounded value is the relative position
 * @returns the best projection result
 */
function findBestProjectionWithOptimalDistance(
    point: Point,
    transformedLine: TransformedLine,
    optionsToTest: number[],
    originalProjection: ProjectionResult,
    isSegment: boolean
): ProjectionResult {
    let bestResult = originalProjection;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const roundedValue of optionsToTest) {
        const baseResult = createProjectionResult(
            roundedValue,
            isSegment,
            transformedLine,
            0,
            originalProjection.segment
        );

        const pointOnLine = isSegment
            ? LineEngine.DEFAULT.getPoint(baseResult.relativePos, baseResult.segment, 0, transformedLine)
            : LineEngine.DEFAULT.getPoint(baseResult.pos, undefined, 0, transformedLine);
        const normalVector = isSegment
            ? LineEngine.DEFAULT.getNormalVector(baseResult.relativePos, baseResult.segment, transformedLine)
            : LineEngine.DEFAULT.getNormalVector(baseResult.pos, undefined, transformedLine);
        const dx = point.x - pointOnLine.x;
        const dy = point.y - pointOnLine.y;
        const d2 = normalVector.x ** 2 + normalVector.y ** 2;
        const optimalDistance = (dx * normalVector.x + dy * normalVector.y) / d2;

        const result = {
            ...baseResult,
            distance: optimalDistance
        };

        const projectedPoint = isSegment
            ? LineEngine.DEFAULT.getPoint(result.relativePos, result.segment, optimalDistance, transformedLine)
            : LineEngine.DEFAULT.getPoint(result.pos, undefined, optimalDistance, transformedLine);
        const distanceToPoint = Math2D.distance(point, projectedPoint);

        if (distanceToPoint < minDistance) {
            minDistance = distanceToPoint;
            bestResult = result;
        }
    }

    return bestResult;
}

/**
 * Helper function to create a projection result with the given position value
 *
 * @param value The value that was rounded (either pos or relativePos)
 * @param isSegment Whether the rounded value is the relative position
 * @param transformedLine The line with its transform
 * @param distance The distance to use
 * @param originalSegment The original segment from projection
 * @returns A new projection result
 */
function createProjectionResult(
    value: number,
    isSegment: boolean,
    transformedLine: TransformedLine,
    distance: number,
    originalSegment: number
): ProjectionResult {
    if (isSegment) {
        return {
            relativePos: value,
            segment: originalSegment,
            pos: (originalSegment + value) / transformedLine.line.segments.length,
            distance
        };
    } else {
        const segmentIndex = Math.floor(value * transformedLine.line.segments.length);
        return {
            pos: value,
            segment: segmentIndex,
            relativePos: value * transformedLine.line.segments.length - segmentIndex,
            distance
        };
    }
}

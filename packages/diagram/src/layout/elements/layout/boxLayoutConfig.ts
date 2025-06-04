import type { Point, Line } from "@hylimo/diagram-common";
import { ContentLayoutConfig } from "./contentLayoutConfig.js";

/**
 * Base class for vbox/hbox layout config which provides helpers for outline calculation
 */
export abstract class BoxLayoutConfig extends ContentLayoutConfig {
    /**
     * Computes the outline based on the provided parts.
     * Each part is an element that is stacked along the primary axis.
     * Requires at least two parts.
     *
     * @param parts the parts to compute the outline from
     * @param id the id of this element
     * @param createPoint a function to create a point from primary and secondary coordinates
     * @returns the computed outline
     */
    protected computeOutlineFromParts(
        parts: BoxOutlinePart[],
        id: string,
        createPoint: (primary: number, secondary: number) => Point
    ): Line {
        if (parts.length < 2) {
            throw new Error("Only possible with at least two parts");
        }
        const allPoints = this.computeOutlinePointsFromParts(parts, createPoint);
        return {
            start: allPoints.at(-1)!,
            segments: allPoints.map((point, index) => this.lineSegment(point.x, point.y, id, index)),
            isClosed: true
        };
    }

    /**
     * Computes the points of the outline based on the provided parts
     * Requires at least two parts.
     *
     * @param parts the parts to compute the points of the outline from
     * @param createPoint a function to create a point from primary and secondary coordinates
     * @returns the computed points
     */
    private computeOutlinePointsFromParts(
        parts: BoxOutlinePart[],
        createPoint: (primary: number, secondary: number) => Point
    ): Point[] {
        const firstPart = parts[0];
        const startPoints: Point[] = [
            createPoint(firstPart.primaryOffset, firstPart.secondaryOffset + firstPart.secondaryLength),
            createPoint(firstPart.primaryOffset, firstPart.secondaryOffset)
        ];
        const endPoints: Point[] = [];
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const previousPart = parts[i - 1];
            const offset = part.primaryOffset;
            startPoints.push(createPoint(offset, previousPart.secondaryOffset));
            startPoints.push(createPoint(offset, part.secondaryOffset));
            endPoints.push(createPoint(offset, previousPart.secondaryOffset + previousPart.secondaryLength));
            endPoints.push(createPoint(offset, part.secondaryOffset + part.secondaryLength));
        }
        const { primaryOffset, primaryLength, secondaryOffset, secondaryLength } = parts.at(-1)!;
        startPoints.push(createPoint(primaryOffset + primaryLength, secondaryOffset));
        endPoints.push(createPoint(primaryOffset + primaryLength, secondaryOffset + secondaryLength));
        return [...endPoints, ...startPoints.reverse()];
    }

    /**
     * Computes the lengths of elements along the primary axis based on their constraints and available space.
     *
     * This method implements a flexible box layout algorithm that:
     * 1. Starts with each element's base size
     * 2. If total size is less than minimum, grows elements with grow factors
     * 3. If total size exceeds maximum, shrinks elements with shrink factors
     * 4. Respects individual min/max constraints during grow/shrink operations
     *
     * @param elements array of box content constraints defining sizing behavior for each element
     * @param min minimum total length required along the primary axis
     * @param max maximum total length allowed along the primary axis
     * @returns array of computed lengths for each element along the primary axis
     */
    protected computePrimaryAxisLengths(elements: BoxContentConstraint[], min: number, max: number): number[] {
        let current = 0;
        const result: number[] = [];

        // Initialize with base sizes
        for (const element of elements) {
            current += element.base;
            result.push(element.base);
        }

        if (current < min) {
            // Need to grow elements to meet minimum requirement
            this.growElementsToMinimum(elements, result, min - current);
        } else if (current > max) {
            // Need to shrink elements to fit within maximum
            this.shrinkElementsToMaximum(elements, result, current - max);
        }

        return result;
    }

    /**
     * Grows elements to meet the minimum size requirement while respecting individual max constraints.
     *
     * Uses an iterative approach where elements that hit their max constraint are removed from
     * subsequent growth iterations, ensuring proportional distribution among remaining growable elements.
     *
     * @param elements array of box content constraints
     * @param result array of current element lengths (modified in place)
     * @param totalGrowthNeeded total additional length needed to meet minimum requirement
     */
    private growElementsToMinimum(elements: BoxContentConstraint[], result: number[], totalGrowthNeeded: number): void {
        let growableElements: BoxContentConstraint[] = [];
        let growableElementIndices: number[] = [];
        let totalGrowFactor = 0;

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.grow > 0) {
                growableElements.push(element);
                growableElementIndices.push(i);
                totalGrowFactor += element.grow;
            }
        }

        let remainingGrowth = totalGrowthNeeded;
        let needsToGrow = true;

        while (needsToGrow && remainingGrowth > 0 && growableElements.length > 0) {
            needsToGrow = false;
            const nextGrowableElements: BoxContentConstraint[] = [];
            const nextGrowableElementIndices: number[] = [];
            let nextTotalGrowFactor = 0;
            let nextRemainingGrowth = remainingGrowth;

            for (let i = 0; i < growableElements.length; i++) {
                const element = growableElements[i];
                const index = growableElementIndices[i];
                const oldLength = result[index];
                let newLength = oldLength + (element.grow * remainingGrowth) / totalGrowFactor;

                if (newLength < element.max) {
                    nextGrowableElements.push(element);
                    nextGrowableElementIndices.push(index);
                    nextTotalGrowFactor += element.grow;
                } else {
                    newLength = element.max;
                    needsToGrow = true;
                }

                const lengthChange = newLength - oldLength;
                result[index] = newLength;
                nextRemainingGrowth -= lengthChange;
            }

            growableElements = nextGrowableElements;
            growableElementIndices = nextGrowableElementIndices;
            totalGrowFactor = nextTotalGrowFactor;
            remainingGrowth = nextRemainingGrowth;
        }
    }

    /**
     * Shrinks elements to fit within the maximum size limit while respecting individual min constraints.
     *
     * Uses an iterative approach where elements that hit their min constraint are removed from
     * subsequent shrinking iterations, ensuring proportional distribution among remaining shrinkable elements.
     *
     * @param elements array of box content constraints
     * @param result array of current element lengths (modified in place)
     * @param totalShrinkageNeeded total length reduction needed to fit within maximum
     */
    private shrinkElementsToMaximum(
        elements: BoxContentConstraint[],
        result: number[],
        totalShrinkageNeeded: number
    ): void {
        let shrinkableElements: BoxContentConstraint[] = [];
        let shrinkableElementIndices: number[] = [];
        let totalShrinkFactor = 0;

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.shrink > 0) {
                shrinkableElements.push(element);
                shrinkableElementIndices.push(i);
                totalShrinkFactor += element.shrink;
            }
        }

        let remainingShrinkage = totalShrinkageNeeded;
        let needsToShrink = true;

        while (needsToShrink && remainingShrinkage > 0 && shrinkableElements.length > 0) {
            needsToShrink = false;
            const nextShrinkableElements: BoxContentConstraint[] = [];
            const nextShrinkableElementIndices: number[] = [];
            let nextTotalShrinkFactor = 0;
            let nextRemainingShrinkage = remainingShrinkage;

            for (let i = 0; i < shrinkableElements.length; i++) {
                const element = shrinkableElements[i];
                const index = shrinkableElementIndices[i];
                const oldLength = result[index];
                let newLength = oldLength - (element.shrink * remainingShrinkage) / totalShrinkFactor;

                if (newLength > element.min) {
                    nextShrinkableElements.push(element);
                    nextShrinkableElementIndices.push(index);
                    nextTotalShrinkFactor += element.shrink;
                } else {
                    newLength = element.min;
                    needsToShrink = true;
                }

                const lengthChange = oldLength - newLength;
                result[index] = newLength;
                nextRemainingShrinkage -= lengthChange;
            }

            shrinkableElements = nextShrinkableElements;
            shrinkableElementIndices = nextShrinkableElementIndices;
            totalShrinkFactor = nextTotalShrinkFactor;
            remainingShrinkage = nextRemainingShrinkage;
        }
    }
}

/**
 * A element that stacked along the primary axis forms the outline of a box
 */
export interface BoxOutlinePart {
    /**
     * The offset of the element along the primary axis
     */
    primaryOffset: number;
    /**
     * The offset of the element along the secondary axis
     */
    secondaryOffset: number;
    /**
     * The length of the element along the primary axis
     */
    primaryLength: number;
    /**
     * The length of the element along the secondary axis
     */
    secondaryLength: number;
}

/**
 * Constraints for a content of a box layout.
 */
export interface BoxContentConstraint {
    /**
     * The minimum size of the content along the primary axis.
     */
    min: number;
    /**
     * The maximum size of the content along the primary axis.
     */
    max: number;
    /**
     * The base size of the content along the primary axis.
     */
    base: number;
    /**
     * The growth factor of the content along the primary axis.
     */
    grow: number;
    /**
     * The shrink factor of the content along the primary axis.
     */
    shrink: number;
}

export namespace BoxContentConstraint {
    /**
     * Creates a BoxContentConstraint with the specified parameters.
     * The base value is automatically clamped to be within the min and max bounds.
     *
     * @param min the minimum size of the content along the primary axis
     * @param max the maximum size of the content along the primary axis
     * @param base the base size of the content along the primary axis (will be clamped between min and max)
     * @param grow the growth factor of the content along the primary axis
     * @param shrink the shrink factor of the content along the primary axis
     * @returns a new BoxContentConstraint with the specified parameters
     */
    export function create(min: number, max: number, base: number, grow: number, shrink: number): BoxContentConstraint {
        return {
            min,
            max,
            base: Math.min(Math.max(base, min), max),
            grow,
            shrink
        };
    }
}

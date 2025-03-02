import type { Point, Line } from "@hylimo/diagram-common";
import { PanelLayoutConfig } from "./panelLayoutConfig.js";
import { booleanType } from "@hylimo/core";

/**
 * Base class for vbox/hbox layout config which provides helpers for outline calculation
 */
export abstract class BoxLayoutConfig extends PanelLayoutConfig {
    constructor() {
        super(
            [],
            [
                {
                    name: "inverse",
                    description: "Whether the primary axis is inverted",
                    type: booleanType
                }
            ]
        );
    }

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

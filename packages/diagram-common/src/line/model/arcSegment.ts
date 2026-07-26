import type { Vector } from "../../common/math.js";
import { Math2D } from "../../common/math.js";
import { Point } from "../../common/point.js";
import type { Segment } from "./segment.js";

/**
 * An elliptical arc, parametrised the way SVG's `A` command is: the arc runs from the segment's
 * start point to {@link Segment.end} along an ellipse with the given radii, tilted by
 * {@link ArcSegment.rotation}, and the two flags pick which of the four arcs joining those two
 * points on such an ellipse is meant.
 *
 * The endpoints are what the arc is pinned to — the ellipse follows from them (see
 * {@link ArcSegment.centerParametrization}) rather than the other way round. That keeps a line built
 * from these segments continuous by construction (every segment ends where the next one starts,
 * whatever the radii say), it survives radii too small to span the two points (they are scaled up,
 * as in SVG), and it converts to and from a path string without any geometry in between.
 */
export interface ArcSegment extends Segment, ArcDefinition {
    type: typeof ArcSegment.TYPE;
}

/**
 * Everything about an arc except where it starts and ends: the ellipse it is cut from, and which of
 * the four arcs between two points on that ellipse is meant
 */
export interface ArcDefinition {
    /**
     * The radius along the ellipse's own x-axis
     */
    radiusX: number;
    /**
     * The radius along the ellipse's own y-axis
     */
    radiusY: number;
    /**
     * The angle the ellipse's x-axis is rotated by, in radians
     */
    rotation: number;
    /**
     * Whether the arc takes the long way around, covering more than half of the ellipse
     */
    largeArc: boolean;
    /**
     * Whether the arc is swept in the direction of increasing angles (clockwise on screen)
     */
    sweep: boolean;
}

/**
 * An arc in center form: the ellipse it lies on, and the angular interval it covers on it. This is
 * the form every evaluation needs, derived from the endpoint form an {@link ArcSegment} is stored in.
 *
 * The angles are the ellipse's own parameter — the *eccentric* angle, not the polar one: the point
 * at `angle` is `center + rotate((radiusX · cos(angle), radiusY · sin(angle)), rotation)`.
 */
export interface ArcCenterParametrization {
    /**
     * The center of the ellipse
     */
    center: Point;
    /**
     * The radius along the ellipse's own x-axis, scaled up if the segment's radii were too small
     */
    radiusX: number;
    /**
     * The radius along the ellipse's own y-axis, scaled up if the segment's radii were too small
     */
    radiusY: number;
    /**
     * The angle the ellipse's x-axis is rotated by, in radians
     */
    rotation: number;
    /**
     * The angle the arc starts at
     */
    startAngle: number;
    /**
     * The signed angle the arc sweeps over, negative for a counter-clockwise arc
     */
    deltaAngle: number;
}

export namespace ArcSegment {
    /**
     * Type for ArcSegment
     */
    export const TYPE = "arc";

    /**
     * Radii below this (px) make the arc degenerate, which SVG draws as a straight line
     */
    const DEGENERATE_RADIUS = 1e-9;

    /**
     * Converts the endpoint form an arc is stored in into the center form every evaluation needs,
     * following the implementation notes of the SVG specification (F.6.5 and F.6.6): radii too small
     * to span the two endpoints are scaled up until they just fit, and the two flags pick which of
     * the two possible centers, and which of the two arcs around it, is meant.
     *
     * @param start the start point of the arc
     * @param end the end point of the arc
     * @param definition the ellipse the arc is cut from
     * @returns the center form, or undefined if the arc is degenerate and should be drawn as a line
     */
    export function centerParametrization(
        start: Point,
        end: Point,
        definition: ArcDefinition
    ): ArcCenterParametrization | undefined {
        const { rotation } = definition;
        let radiusX = Math.abs(definition.radiusX);
        let radiusY = Math.abs(definition.radiusY);
        if (radiusX < DEGENERATE_RADIUS || radiusY < DEGENERATE_RADIUS || Point.equals(start, end)) {
            return undefined;
        }
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const halfDeltaX = (start.x - end.x) / 2;
        const halfDeltaY = (start.y - end.y) / 2;
        // the start point in a frame where the ellipse is axis-aligned and centered between the endpoints
        const localX = cos * halfDeltaX + sin * halfDeltaY;
        const localY = -sin * halfDeltaX + cos * halfDeltaY;
        const oversize = (localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY);
        if (oversize > 1) {
            const scale = Math.sqrt(oversize);
            radiusX *= scale;
            radiusY *= scale;
        }
        const covered = radiusX * radiusX * localY * localY + radiusY * radiusY * localX * localX;
        const remaining = radiusX * radiusX * radiusY * radiusY - covered;
        const factor =
            (definition.largeArc === definition.sweep ? -1 : 1) * Math.sqrt(Math.max(0, remaining / covered));
        const localCenterX = (factor * radiusX * localY) / radiusY;
        const localCenterY = (-factor * radiusY * localX) / radiusX;
        const center: Point = {
            x: cos * localCenterX - sin * localCenterY + (start.x + end.x) / 2,
            y: sin * localCenterX + cos * localCenterY + (start.y + end.y) / 2
        };
        const startAngle = Math2D.angle({
            x: (localX - localCenterX) / radiusX,
            y: (localY - localCenterY) / radiusY
        });
        const endAngle = Math2D.angle({
            x: (-localX - localCenterX) / radiusX,
            y: (-localY - localCenterY) / radiusY
        });
        let deltaAngle = endAngle - startAngle;
        if (definition.sweep && deltaAngle < 0) {
            deltaAngle += 2 * Math.PI;
        } else if (!definition.sweep && deltaAngle > 0) {
            deltaAngle -= 2 * Math.PI;
        }
        return { center, radiusX, radiusY, rotation, startAngle, deltaAngle };
    }

    /**
     * Gets the point on the ellipse at a given angle
     *
     * @param arc the arc in center form
     * @param angle the ellipse's own (eccentric) angle
     * @returns the point at that angle
     */
    export function pointAt(arc: ArcCenterParametrization, angle: number): Point {
        const offset = Math2D.rotate(
            { x: arc.radiusX * Math.cos(angle), y: arc.radiusY * Math.sin(angle) },
            arc.rotation
        );
        return Math2D.add(arc.center, offset);
    }

    /**
     * Gets the direction the arc travels in at a given angle, meaning the tangent pointing the way
     * the arc is swept. Not normalized.
     *
     * @param arc the arc in center form
     * @param angle the ellipse's own (eccentric) angle
     * @returns the direction of travel at that angle
     */
    export function tangentAt(arc: ArcCenterParametrization, angle: number): Vector {
        const derivative = Math2D.rotate(
            { x: -arc.radiusX * Math.sin(angle), y: arc.radiusY * Math.cos(angle) },
            arc.rotation
        );
        return arc.deltaAngle < 0 ? Math2D.scale(derivative, -1) : derivative;
    }

    /**
     * Gets the ellipse's own (eccentric) angle of a point, which is only meaningful for a point on
     * or near the ellipse
     *
     * @param arc the arc in center form
     * @param point the point to get the angle of
     * @returns the angle of the point
     */
    export function angleOf(arc: ArcCenterParametrization, point: Point): number {
        const local = Math2D.rotate(Math2D.sub(point, arc.center), -arc.rotation);
        return Math2D.angle({ x: local.x / arc.radiusX, y: local.y / arc.radiusY });
    }

    /**
     * Converts an angle on the ellipse into a position on the arc, a number between 0 and 1,
     * or undefined if the angle lies outside the interval the arc covers
     *
     * @param arc the arc in center form
     * @param angle the ellipse's own (eccentric) angle
     * @returns the position on the arc, or undefined if the angle is not on the arc
     */
    export function positionOf(arc: ArcCenterParametrization, angle: number): number | undefined {
        const { startAngle, deltaAngle } = arc;
        if (deltaAngle === 0) {
            return undefined;
        }
        const fullTurn = 2 * Math.PI;
        let delta = (angle - startAngle) % fullTurn;
        if (deltaAngle > 0 && delta < 0) {
            delta += fullTurn;
        } else if (deltaAngle < 0 && delta > 0) {
            delta -= fullTurn;
        }
        if (Math.abs(delta) > Math.abs(deltaAngle)) {
            return undefined;
        }
        return delta / deltaAngle;
    }
}

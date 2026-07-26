import type { ArcCenterParametrization, ArcDefinition, Line, Point, Vector } from "@hylimo/diagram-common";
import { ArcSegment, BezierSegment, LineSegment, Math2D, QuadraticBezierSegment } from "@hylimo/diagram-common";
import svgpath from "svgpath";
import type { ShapeStroke } from "./types.js";
import { LineJoin } from "./types.js";

/**
 * Points closer than this (px) are treated as coincident, so a zero-length segment is dropped
 */
const COINCIDENT_EPSILON = 1e-6;

/**
 * Two directions whose cross product is below this are treated as parallel, as intersecting them
 * would put the intersection arbitrarily far away
 */
const PARALLEL_EPSILON = 1e-9;

/**
 * How much of the offset distance a miter has to cover along the edge normals before it is clamped,
 * so that a corner turning into the shape — where no join is painted to cut the miter down — cannot
 * spike further out than ten times the offset distance
 */
const MITER_FLOOR = 0.1;

/**
 * The smallest radius an offset arc may end up with. An arc offset towards its own center by more
 * than its radius would invert; clamping leaves a degenerate ellipse, which the endpoint form grows
 * back to whatever it takes to span the two endpoints.
 */
const MIN_RADIUS = 1e-6;

/**
 * One segment of the outline, in absolute coordinates, with its own start point kept alongside its
 * end so each segment can be offset on its own
 */
type OutlineSegment =
    | {
          /**
           * Discriminator marking a straight segment
           */
          readonly kind: "line";
          /**
           * The start point
           */
          readonly start: Point;
          /**
           * The end point
           */
          readonly end: Point;
      }
    | {
          /**
           * Discriminator marking a quadratic Bézier
           */
          readonly kind: "quad";
          /**
           * The start point
           */
          readonly start: Point;
          /**
           * The single control point
           */
          readonly control: Point;
          /**
           * The end point
           */
          readonly end: Point;
      }
    | {
          /**
           * Discriminator marking a cubic Bézier
           */
          readonly kind: "cubic";
          /**
           * The start point
           */
          readonly start: Point;
          /**
           * The control point next to the start
           */
          readonly control1: Point;
          /**
           * The control point next to the end
           */
          readonly control2: Point;
          /**
           * The end point
           */
          readonly end: Point;
      }
    | ({
          /**
           * Discriminator marking an elliptical arc
           */
          readonly kind: "arc";
          /**
           * The start point
           */
          readonly start: Point;
          /**
           * The end point
           */
          readonly end: Point;
      } & ArcDefinition);

/**
 * Computes the cross product of two vectors, whose sign tells which way the second one turns
 * relative to the first
 *
 * @param a the first vector
 * @param b the second vector
 * @returns the cross product
 */
function cross(a: Vector, b: Vector): number {
    return a.x * b.y - a.y * b.x;
}

/**
 * Checks whether two points are coincident within {@link COINCIDENT_EPSILON}
 *
 * @param a the first point
 * @param b the second point
 * @returns true if the points are coincident
 */
function coincident(a: Point, b: Point): boolean {
    return Math.abs(a.x - b.x) < COINCIDENT_EPSILON && Math.abs(a.y - b.y) < COINCIDENT_EPSILON;
}

/**
 * Parses the rendered outline path into its segments, translated into the element's absolute
 * position. Zero-length segments are dropped — the path generator already skips them, but a closing
 * `Z` on a path that has walked back to its start would add one.
 *
 * Only the first sub-path is read: the outline of a shape is one closed ring, and a decoration is
 * never part of it.
 *
 * @param pathStr the rendered (local, translated-to-origin) outline path
 * @param position the element's absolute position
 * @returns the segments of the ring, in order
 */
function parseOutline(pathStr: string, position: Point): OutlineSegment[] {
    const segments: OutlineSegment[] = [];
    let subPathStart: Point | undefined = undefined;
    let pen: Point = position;
    let done = false;
    const translate = (x: number, y: number): Point => ({ x: x + position.x, y: y + position.y });
    const push = (segment: OutlineSegment): void => {
        if (!coincident(segment.start, segment.end)) {
            segments.push(segment);
            pen = segment.end;
        }
    };
    svgpath(pathStr)
        .abs()
        .unshort()
        .iterate((segment) => {
            if (done) {
                return;
            }
            const command = segment[0];
            const numbers = segment.slice(1) as number[];
            switch (command) {
                case "M":
                    if (subPathStart != undefined) {
                        done = true;
                        return;
                    }
                    pen = translate(numbers[0], numbers[1]);
                    subPathStart = pen;
                    break;
                case "L":
                    push({ kind: "line", start: pen, end: translate(numbers[0], numbers[1]) });
                    break;
                case "H":
                    push({ kind: "line", start: pen, end: { x: numbers[0] + position.x, y: pen.y } });
                    break;
                case "V":
                    push({ kind: "line", start: pen, end: { x: pen.x, y: numbers[0] + position.y } });
                    break;
                case "C":
                    push({
                        kind: "cubic",
                        start: pen,
                        control1: translate(numbers[0], numbers[1]),
                        control2: translate(numbers[2], numbers[3]),
                        end: translate(numbers[4], numbers[5])
                    });
                    break;
                case "Q":
                    push({
                        kind: "quad",
                        start: pen,
                        control: translate(numbers[0], numbers[1]),
                        end: translate(numbers[2], numbers[3])
                    });
                    break;
                case "A":
                    push({
                        kind: "arc",
                        start: pen,
                        radiusX: numbers[0],
                        radiusY: numbers[1],
                        rotation: (numbers[2] * Math.PI) / 180,
                        largeArc: numbers[3] !== 0,
                        sweep: numbers[4] !== 0,
                        end: translate(numbers[5], numbers[6])
                    });
                    break;
                case "Z":
                    if (subPathStart != undefined) {
                        push({ kind: "line", start: pen, end: subPathStart });
                    }
                    break;
            }
        });
    return segments;
}

/**
 * Gets the center form of an arc segment
 *
 * @param segment the arc to convert
 * @returns the center form, or undefined if the arc is degenerate
 */
function arcCenter(segment: OutlineSegment & { kind: "arc" }): ArcCenterParametrization | undefined {
    return ArcSegment.centerParametrization(segment.start, segment.end, segment);
}

/**
 * Gets the direction a segment leaves its start point in. Not normalized, and never the zero vector
 * for a segment with distinct endpoints.
 *
 * @param segment the segment to get the direction of
 * @returns the direction of travel at the start
 */
function startDirection(segment: OutlineSegment): Vector {
    const chord = Math2D.sub(segment.end, segment.start);
    switch (segment.kind) {
        case "line":
            return chord;
        case "quad":
            return nonZero(Math2D.sub(segment.control, segment.start), chord);
        case "cubic":
            return nonZero(
                Math2D.sub(segment.control1, segment.start),
                nonZero(Math2D.sub(segment.control2, segment.start), chord)
            );
        case "arc": {
            const arc = arcCenter(segment);
            return arc != undefined ? ArcSegment.tangentAt(arc, arc.startAngle) : chord;
        }
    }
}

/**
 * Gets the direction a segment arrives at its end point in. Not normalized, and never the zero
 * vector for a segment with distinct endpoints.
 *
 * @param segment the segment to get the direction of
 * @returns the direction of travel at the end
 */
function endDirection(segment: OutlineSegment): Vector {
    const chord = Math2D.sub(segment.end, segment.start);
    switch (segment.kind) {
        case "line":
            return chord;
        case "quad":
            return nonZero(Math2D.sub(segment.end, segment.control), chord);
        case "cubic":
            return nonZero(
                Math2D.sub(segment.end, segment.control2),
                nonZero(Math2D.sub(segment.end, segment.control1), chord)
            );
        case "arc": {
            const arc = arcCenter(segment);
            return arc != undefined ? ArcSegment.tangentAt(arc, arc.startAngle + arc.deltaAngle) : chord;
        }
    }
}

/**
 * Picks the first of two vectors that is not (numerically) the zero vector, which is how a control
 * point sitting on top of its endpoint falls through to the next-best direction
 *
 * @param vector the preferred vector
 * @param fallback the vector to use if the preferred one has no direction
 * @returns the first vector with a direction
 */
function nonZero(vector: Vector, fallback: Vector): Vector {
    return Math2D.length(vector) > COINCIDENT_EPSILON ? vector : fallback;
}

/**
 * Gets the point halfway along a segment, used to tell which way the ring winds. Taking the middle
 * rather than just the endpoints is what keeps a ring of two curved segments (a lens: two tips
 * joined by two Béziers) from looking like it has no area at all.
 *
 * @param segment the segment to get the middle of
 * @returns a point halfway along the segment
 */
function middle(segment: OutlineSegment): Point {
    switch (segment.kind) {
        case "line":
            return Math2D.linearInterpolate(segment.start, segment.end, 0.5);
        case "quad":
            return {
                x: 0.25 * segment.start.x + 0.5 * segment.control.x + 0.25 * segment.end.x,
                y: 0.25 * segment.start.y + 0.5 * segment.control.y + 0.25 * segment.end.y
            };
        case "cubic":
            return {
                x: (segment.start.x + 3 * segment.control1.x + 3 * segment.control2.x + segment.end.x) / 8,
                y: (segment.start.y + 3 * segment.control1.y + 3 * segment.control2.y + segment.end.y) / 8
            };
        case "arc": {
            const arc = arcCenter(segment);
            return arc != undefined
                ? ArcSegment.pointAt(arc, arc.startAngle + arc.deltaAngle / 2)
                : Math2D.linearInterpolate(segment.start, segment.end, 0.5);
        }
    }
}

/**
 * Computes twice the signed area of the ring, which is positive if the ring is wound clockwise on
 * screen (where y grows downwards) — the direction the interior is to the left of.
 *
 * @param segments the segments of the ring, in order
 * @returns twice the signed area
 */
function signedArea(segments: OutlineSegment[]): number {
    const points: Point[] = [];
    for (const segment of segments) {
        points.push(segment.start, middle(segment));
    }
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return area;
}

/**
 * Intersects two lines, each given by a point on it and its direction
 *
 * @param a a point on the first line
 * @param directionA the direction of the first line
 * @param b a point on the second line
 * @param directionB the direction of the second line
 * @returns the intersection, or undefined if the two lines are (near) parallel
 */
function intersect(a: Point, directionA: Vector, b: Point, directionB: Vector): Point | undefined {
    const first = Math2D.normalize(directionA);
    const second = Math2D.normalize(directionB);
    const denominator = cross(first, second);
    if (Math.abs(denominator) < PARALLEL_EPSILON) {
        return undefined;
    }
    const scale = cross(Math2D.sub(b, a), second) / denominator;
    return Math2D.add(a, Math2D.scale(first, scale));
}

/**
 * Computes where the offset ring passes a vertex of the original ring, which is wherever the stroke
 * paints its outer edge around that corner. Both offset edges are `distance` from their originals,
 * so they meet on the corner's bisector: at `distance / cos` for a miter (`cos` being the cosine of
 * half the angle the two normals span, which is `sin(θ/2)` of the corner itself — the very ratio the
 * miter limit is stated in), at `distance` for a round join, whose outer edge is a circle of that
 * radius around the vertex, and at `distance · cos` for a bevel, where the bisector crosses the
 * chord between the two offset edges. A miter past its limit is painted as a bevel, and taken as one
 * here too. Where the two edges meet smoothly — every point inside a rounded corner, every joint of
 * an ellipse — the normals agree, `cos` is 1, and all three come out as the vertex pushed straight
 * out along the normal.
 *
 * A corner that turns *into* the shape is a different case: there the two offset edges overlap
 * instead of leaving a gap, and their intersection — the plain miter, at any depth — is the outer
 * edge, with no join painted over it. Only the numerical floor applies ({@link MITER_FLOOR}), and a
 * vertex whose normals cancel outright falls back to a single normal.
 *
 * @param vertex the vertex of the original ring
 * @param incoming the outward normal of the edge arriving at the vertex
 * @param outgoing the outward normal of the edge leaving the vertex
 * @param convex whether the corner turns away from the shape, which is where a join is painted
 * @param distance the distance to offset by
 * @param stroke the stroke the shape is painted with, which decides how a convex corner is joined
 * @returns the vertex of the offset ring
 */
function offsetVertex(
    vertex: Point,
    incoming: Vector,
    outgoing: Vector,
    convex: boolean,
    distance: number,
    stroke: ShapeStroke
): Point {
    const miter = Math2D.add(incoming, outgoing);
    const length = Math2D.length(miter);
    if (length < PARALLEL_EPSILON) {
        return Math2D.add(vertex, Math2D.scale(incoming, distance));
    }
    const direction = Math2D.scale(miter, 1 / length);
    const cos = Math2D.dot(direction, incoming);
    let scale: number;
    if (!convex) {
        scale = distance / Math.max(cos, MITER_FLOOR);
    } else if (stroke.lineJoin === LineJoin.Round) {
        scale = distance;
    } else if (stroke.lineJoin === LineJoin.Bevel || cos <= 0 || 1 / cos > stroke.miterLimit) {
        scale = distance * Math.max(cos, 0);
    } else {
        scale = distance / cos;
    }
    return Math2D.add(vertex, Math2D.scale(direction, scale));
}

/**
 * Offsets the inner control points of a Bézier's control polygon, by offsetting each leg of the
 * polygon and intersecting the neighbouring legs (Tiller–Hanson). The endpoints are not computed
 * here — they are the ring's offset vertices, which already account for the corners on either side.
 *
 * The offset of a Bézier is not a Bézier, so this is the one approximation in the outline. It keeps
 * the degree, and with it the one-segment-per-authored-segment mapping the docking positions are
 * parametrised by.
 *
 * @param points the control polygon, from the start point to the end point
 * @param distance the distance to offset by
 * @param outward maps a direction to the outward normal of the ring
 * @returns the offset inner control points, in order
 */
function offsetControlPolygon(points: Point[], distance: number, outward: (direction: Vector) => Vector): Point[] {
    const legs: { start: Point; direction: Vector }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const direction = nonZero(
            Math2D.sub(points[i + 1], points[i]),
            Math2D.sub(points[points.length - 1], points[0])
        );
        const normal = outward(direction);
        legs.push({ start: Math2D.add(points[i], Math2D.scale(normal, distance)), direction });
    }
    const inner: Point[] = [];
    for (let i = 1; i < points.length - 1; i++) {
        const previous = legs[i - 1];
        const current = legs[i];
        const intersection = intersect(previous.start, previous.direction, current.start, current.direction);
        inner.push(intersection ?? current.start);
    }
    return inner;
}

/**
 * Evaluates a cubic Bézier and its derivative at a parameter
 *
 * @param points the four control points
 * @param t the parameter to evaluate at, between 0 and 1
 * @returns the point on the curve and the direction it travels in there
 */
function evaluateCubic(points: Point[], t: number): { point: Point; direction: Vector } {
    const [p0, p1, p2, p3] = points;
    const u = 1 - t;
    const at = (get: (p: Point) => number): number =>
        u * u * u * get(p0) + 3 * u * u * t * get(p1) + 3 * u * t * t * get(p2) + t * t * t * get(p3);
    const slope = (get: (p: Point) => number): number =>
        3 * u * u * (get(p1) - get(p0)) + 6 * u * t * (get(p2) - get(p1)) + 3 * t * t * (get(p3) - get(p2));
    return {
        point: { x: at((p) => p.x), y: at((p) => p.y) },
        direction: { x: slope((p) => p.x), y: slope((p) => p.y) }
    };
}

/**
 * How many points along a curve its offset is compared against while fitting
 */
const OFFSET_SAMPLES = 16;

/**
 * Samples the true offset of a cubic Bézier, which is what an offset curve is fitted against
 *
 * @param points the four control points of the original curve
 * @param distance the distance to offset by
 * @param outward maps a direction to the outward normal of the ring
 * @returns the sampled parameters and the point the true offset has at each
 */
function offsetSamples(points: Point[], distance: number, outward: (direction: Vector) => Vector): Sample[] {
    const samples: Sample[] = [];
    for (let i = 1; i < OFFSET_SAMPLES; i++) {
        const t = i / OFFSET_SAMPLES;
        const { point, direction } = evaluateCubic(points, t);
        samples.push({ t, target: Math2D.add(point, Math2D.scale(outward(direction), distance)) });
    }
    return samples;
}

/**
 * One point of the true offset of a curve, and the parameter it belongs to
 */
interface Sample {
    /**
     * The parameter of the original curve
     */
    readonly t: number;
    /**
     * The point the true offset has there
     */
    readonly target: Point;
}

/**
 * Builds the two control points of an offset curve from how far each is pushed out along its
 * tangent, rejecting a solution that pushes one of them backwards and folds the curve over
 *
 * @param start the offset start point
 * @param end the offset end point
 * @param startTangent the unit direction the offset curve leaves `start` in
 * @param endTangent the unit direction the offset curve arrives at `end` from, pointing backwards
 * @param startScale how far the first control point is pushed out
 * @param endScale how far the second control point is pushed out
 * @returns the two control points, or undefined if the solution folds the curve over
 */
function controlPoints(
    start: Point,
    end: Point,
    startTangent: Vector,
    endTangent: Vector,
    startScale: number,
    endScale: number
): [Point, Point] | undefined {
    if (!(startScale > 0) || !(endScale > 0)) {
        return undefined;
    }
    return [
        Math2D.add(start, Math2D.scale(startTangent, startScale)),
        Math2D.add(end, Math2D.scale(endTangent, endScale))
    ];
}

/**
 * Places the two control points so that the offset curve passes through the true offset of the
 * original curve's own middle, on top of the endpoints and tangents it already matches
 *
 * @param start the offset start point
 * @param end the offset end point
 * @param startTangent the unit direction the offset curve leaves `start` in
 * @param endTangent the unit direction the offset curve arrives at `end` from, pointing backwards
 * @param middle the point the true offset has at the middle of the curve
 * @returns the two control points, or undefined if there is no usable solution
 */
function interpolateMiddle(
    start: Point,
    end: Point,
    startTangent: Vector,
    endTangent: Vector,
    middle: Point
): [Point, Point] | undefined {
    const denominator = cross(startTangent, endTangent);
    if (Math.abs(denominator) < PARALLEL_EPSILON) {
        return undefined;
    }
    const ends = Math2D.add(start, end);
    // both control points added up, from the value `(start + 3·c1 + 3·c2 + end) / 8` the curve takes at t = 0.5
    const sum = Math2D.scale(Math2D.sub(Math2D.scale(middle, 8), ends), 1 / 3);
    // solves `wanted = startScale · startTangent + endScale · endTangent` by Cramer's rule
    const wanted = Math2D.sub(sum, ends);
    return controlPoints(
        start,
        end,
        startTangent,
        endTangent,
        cross(wanted, endTangent) / denominator,
        cross(startTangent, wanted) / denominator
    );
}

/**
 * Places the two control points at the least-squares fit to the sampled true offset
 *
 * @param start the offset start point
 * @param end the offset end point
 * @param startTangent the unit direction the offset curve leaves `start` in
 * @param endTangent the unit direction the offset curve arrives at `end` from, pointing backwards
 * @param samples the sampled true offset to fit against
 * @returns the two control points, or undefined if there is no usable solution
 */
function fitSamples(
    start: Point,
    end: Point,
    startTangent: Vector,
    endTangent: Vector,
    samples: Sample[]
): [Point, Point] | undefined {
    let startStart = 0;
    let startEnd = 0;
    let endEnd = 0;
    let startTarget = 0;
    let endTarget = 0;
    for (const { t, target } of samples) {
        const u = 1 - t;
        // what the offset curve is at `t` before the two control points are pushed out
        const fixed = Math2D.add(
            Math2D.scale(start, u * u * u + 3 * u * u * t),
            Math2D.scale(end, 3 * u * t * t + t * t * t)
        );
        const wanted = Math2D.sub(target, fixed);
        const startBasis = Math2D.scale(startTangent, 3 * u * u * t);
        const endBasis = Math2D.scale(endTangent, 3 * u * t * t);
        startStart += Math2D.dot(startBasis, startBasis);
        startEnd += Math2D.dot(startBasis, endBasis);
        endEnd += Math2D.dot(endBasis, endBasis);
        startTarget += Math2D.dot(startBasis, wanted);
        endTarget += Math2D.dot(endBasis, wanted);
    }
    const determinant = startStart * endEnd - startEnd * startEnd;
    if (Math.abs(determinant) < PARALLEL_EPSILON) {
        return undefined;
    }
    return controlPoints(
        start,
        end,
        startTangent,
        endTangent,
        (startTarget * endEnd - endTarget * startEnd) / determinant,
        (startStart * endTarget - startEnd * startTarget) / determinant
    );
}

/**
 * Computes how far a point lies from a polyline
 *
 * @param point the point to measure
 * @param polyline the vertices of the polyline, in order
 * @returns the distance from the point to the closest place on the polyline
 */
function distanceToPolyline(point: Point, polyline: Point[]): number {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < polyline.length - 1; i++) {
        const from = polyline[i];
        const delta = Math2D.sub(polyline[i + 1], from);
        const squaredLength = Math2D.dot(delta, delta);
        const position = squaredLength === 0 ? 0 : Math2D.dot(Math2D.sub(point, from), delta) / squaredLength;
        const closest = Math2D.linearInterpolate(from, polyline[i + 1], Math.min(Math.max(position, 0), 1));
        best = Math.min(best, Math2D.distance(closest, point));
    }
    return best;
}

/**
 * Measures how far a candidate offset curve strays from the true offset at its worst sample. The
 * distance is to the candidate as a *curve*, not to the point it happens to have at the same
 * parameter: a candidate that traces the true offset but runs along it at a different pace is just
 * as good an outline, and only the shape of it is visible to anything docking against it.
 *
 * @param points the four control points of the candidate
 * @param samples the sampled true offset
 * @returns the largest distance from the true offset to the candidate
 */
function worstDeviation(points: Point[], samples: Sample[]): number {
    const polyline: Point[] = [];
    for (let i = 0; i <= OFFSET_SAMPLES; i++) {
        polyline.push(evaluateCubic(points, i / OFFSET_SAMPLES).point);
    }
    let worst = 0;
    for (const { target } of samples) {
        worst = Math.max(worst, distanceToPolyline(target, polyline));
    }
    return worst;
}

/**
 * Offsets a cubic Bézier. The endpoints are given, and the offset curve leaves them in the same
 * directions the original does — the true offset shares both — which leaves only how far the two
 * control points are pushed out along those tangents. That is picked by fitting the true offset
 * three ways and keeping whichever tracks it most closely: through the middle of the curve, in the
 * least-squares sense over the whole of it, and by offsetting the control polygon (Tiller–Hanson),
 * which is also what is left when the other two have no usable solution.
 *
 * The result is as close as one cubic gets, and that is not always close: the offset of a Bézier is
 * not a Bézier, and where the curve has an inflection — an S — the true offset needs a higher degree
 * than the curve itself, leaving an error of a fraction of the offset distance (so, of the stroke
 * width). Splitting the curve would fix it and is what a renderer does, but the outline cannot: it
 * keeps one segment per authored path segment, which is what docking positions are parametrised by.
 *
 * @param points the four control points of the original curve
 * @param distance the distance to offset by
 * @param start the offset start point
 * @param end the offset end point
 * @param outward maps a direction to the outward normal of the ring
 * @returns the two inner control points of the offset curve
 */
function offsetCubic(
    points: Point[],
    distance: number,
    start: Point,
    end: Point,
    outward: (direction: Vector) => Vector
): [Point, Point] {
    const samples = offsetSamples(points, distance, outward);
    const chord = Math2D.sub(points[3], points[0]);
    const startTangent = Math2D.normalize(nonZero(Math2D.sub(points[1], points[0]), chord));
    const endTangent = Math2D.scale(Math2D.normalize(nonZero(Math2D.sub(points[3], points[2]), chord)), -1);
    const polygon = offsetControlPolygon(points, distance, outward);
    const middle = evaluateCubic(points, 0.5);
    const candidates = [
        interpolateMiddle(
            start,
            end,
            startTangent,
            endTangent,
            Math2D.add(middle.point, Math2D.scale(outward(middle.direction), distance))
        ),
        fitSamples(start, end, startTangent, endTangent, samples),
        [polygon[0], polygon[1]] as [Point, Point]
    ];
    let best = candidates[candidates.length - 1] as [Point, Point];
    let bestDeviation = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        if (candidate == undefined) {
            continue;
        }
        const deviation = worstDeviation([start, candidate[0], candidate[1], end], samples);
        if (deviation < bestDeviation) {
            best = candidate;
            bestDeviation = deviation;
        }
    }
    return best;
}

/**
 * Offsets a single segment outward, keeping its type: a straight segment stays straight, a Bézier
 * keeps its degree, and an arc keeps its ellipse's shape with both radii moved by the offset —
 * outward if the ring's outside is the ellipse's outside, inward if the arc curves the other way.
 * The endpoints are handed in, as they belong to the corners the segment shares with its neighbours.
 *
 * @param segment the segment to offset
 * @param distance the distance to offset by
 * @param start the offset start point
 * @param end the offset end point
 * @param outward maps a direction to the outward normal of the ring
 * @returns the offset segment
 */
function offsetSegment(
    segment: OutlineSegment,
    distance: number,
    start: Point,
    end: Point,
    outward: (direction: Vector) => Vector
): OutlineSegment {
    switch (segment.kind) {
        case "line":
            return { kind: "line", start, end };
        case "quad": {
            const [control] = offsetControlPolygon([segment.start, segment.control, segment.end], distance, outward);
            return { kind: "quad", start, control, end };
        }
        case "cubic": {
            const [control1, control2] = offsetCubic(
                [segment.start, segment.control1, segment.control2, segment.end],
                distance,
                start,
                end,
                outward
            );
            return { kind: "cubic", start, control1, control2, end };
        }
        case "arc": {
            const arc = arcCenter(segment);
            if (arc == undefined) {
                return { kind: "line", start, end };
            }
            const radial = Math2D.sub(segment.start, arc.center);
            const grows = Math2D.dot(outward(ArcSegment.tangentAt(arc, arc.startAngle)), radial) > 0;
            const delta = grows ? distance : -distance;
            return {
                ...segment,
                start,
                end,
                radiusX: Math.max(segment.radiusX + delta, MIN_RADIUS),
                radiusY: Math.max(segment.radiusY + delta, MIN_RADIUS)
            };
        }
    }
}

/**
 * Offsets the whole ring outward by half the stroke width, so the outline traces the *outer* edge of
 * the stroke rather than its centerline
 *
 * @param segments the segments of the ring, in order
 * @param stroke the stroke the shape is painted with
 * @param area twice the signed area of the ring, whose sign tells which side of it is out
 * @returns the offset ring
 */
function offsetRing(segments: OutlineSegment[], stroke: ShapeStroke, area: number): OutlineSegment[] {
    const distance = stroke.width / 2;
    const clockwise = area > 0;
    const outward = (direction: Vector): Vector => {
        const normal = Math2D.normalize(Math2D.normal(direction));
        return clockwise ? normal : Math2D.scale(normal, -1);
    };
    const startDirections = segments.map(startDirection);
    const endDirections = segments.map(endDirection);
    const vertices = segments.map((segment, index) => {
        const previous = (index - 1 + segments.length) % segments.length;
        const incoming = endDirections[previous];
        const outgoing = startDirections[index];
        // a corner turning the way the ring winds turns away from the shape, and is where a join is painted
        const convex = cross(incoming, outgoing) * area > 0;
        return offsetVertex(segment.start, outward(incoming), outward(outgoing), convex, distance, stroke);
    });
    return segments.map((segment, index) =>
        offsetSegment(segment, distance, vertices[index], vertices[(index + 1) % segments.length], outward)
    );
}

/**
 * Converts an outline segment into the {@link Segment} of a {@link Line}
 *
 * @param segment the segment to convert
 * @param origin the id of the element the outline belongs to
 * @param index the index of the segment in the outline
 * @returns the converted segment
 */
function toLineSegment(
    segment: OutlineSegment,
    origin: string,
    index: number
): LineSegment | QuadraticBezierSegment | BezierSegment | ArcSegment {
    const base = { end: segment.end, origin, originSegment: index };
    switch (segment.kind) {
        case "line":
            return { ...base, type: LineSegment.TYPE };
        case "quad":
            return { ...base, type: QuadraticBezierSegment.TYPE, controlPoint: segment.control };
        case "cubic":
            return {
                ...base,
                type: BezierSegment.TYPE,
                startControlPoint: segment.control1,
                endControlPoint: segment.control2
            };
        case "arc":
            return {
                ...base,
                type: ArcSegment.TYPE,
                radiusX: segment.radiusX,
                radiusY: segment.radiusY,
                rotation: segment.rotation,
                largeArc: segment.largeArc,
                sweep: segment.sweep
            };
    }
}

/**
 * Builds the connection outline for a shape from its rendered outline path.
 *
 * The path is read as what it is — straight segments, quadratic and cubic Béziers, and elliptical
 * arcs — and each one becomes one segment of the outline, in the same order and at the same
 * position the shape's own path has it. Nothing is flattened into chords: an ellipse docks against
 * an ellipse, not against a polygon that merely looks like one, and a docking position stays where
 * the shape author put it, because the outline has exactly as many segments as the path they wrote
 * (positions are parametrised by segment count).
 *
 * The outline is the *outer* edge of the stroke, so the ring is pushed out by half the stroke width:
 * a straight segment moves along its normal, an arc's radii both grow (or shrink, where the ring
 * curves the other way), and a Bézier's control polygon is offset leg by leg. Two segments meeting
 * at an angle end where the stroke's own join paints the outer edge of that corner (see
 * {@link offsetVertex}), which keeps an axis-aligned wall exactly axis-aligned, so a connection
 * docked at 3 o'clock still leaves exactly horizontally.
 *
 * Only a straight segment and a circular arc offset exactly; the offset of an ellipse or of a Bézier
 * is neither, and growing the radii resp. the control polygon is the closest thing of the same kind.
 * The error stays a fraction of the stroke half-width, and vanishes with the stroke.
 *
 * The outline starts where the path starts — the shape author's choice of where position 0 sits,
 * with the predefined shapes all opening at their center-right — and runs the way the path was
 * written. A shape wound counter-clockwise therefore has its normals pointing inwards, which flips
 * the sign of a docking distance; the offset itself is outward either way.
 *
 * @param path the rendered (local, translated-to-origin) outline path string
 * @param position the element's absolute position
 * @param stroke the stroke the shape is painted with, whose width the outline is offset by
 * @param id the id of the element the outline belongs to
 * @returns the outline, or null if the path is not a usable ring
 */
export function buildShapeOutline(path: string, position: Point, stroke: ShapeStroke, id: string): Line | null {
    const parsed = parseOutline(path, position);
    if (parsed.length < 2) {
        return null;
    }
    const area = signedArea(parsed);
    if (area === 0) {
        return null;
    }
    const ring = stroke.width > 0 ? offsetRing(parsed, stroke, area) : parsed;
    return {
        start: ring[0].start,
        segments: ring.map((segment, index) => toLineSegment(segment, id, index)),
        isClosed: true
    };
}

import type { EvaluatedDecoration, EvaluatedVertex, Pt } from "./shapeIr.js";

/**
 * Formats a number for an SVG path with bounded precision. Kept high (1e-6) so the
 * quantization noise stays well below the layout solver's convergence tolerance, otherwise
 * the solver hunts in a limit cycle at the rounding scale.
 *
 * @param value the number to format
 * @returns the formatted number
 */
function fmt(value: number): string {
    return (Math.round(value * 1e6) / 1e6).toString();
}

/**
 * Points closer than this (px) are treated as coincident, so a length-0 segment is skipped
 */
const ZERO_LENGTH_EPSILON = 1e-6;

/**
 * Subtracts two points
 *
 * @param a the minuend
 * @param b the subtrahend
 * @returns the difference vector
 */
function sub(a: Pt, b: Pt): Pt {
    return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Computes the length of a vector
 *
 * @param a the vector
 * @returns the length
 */
function len(a: Pt): number {
    return Math.hypot(a.x, a.y);
}

/**
 * Scales a vector to unit length
 *
 * @param a the vector to normalize
 * @returns the normalized vector, or the zero vector if the input has length 0
 */
function normalize(a: Pt): Pt {
    const l = len(a);
    return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/**
 * Offsets a point along a direction
 *
 * @param base the point to offset
 * @param dir the direction to offset in
 * @param s the distance to offset by
 * @returns the offset point
 */
function addScaled(base: Pt, dir: Pt, s: number): Pt {
    return { x: base.x + dir.x * s, y: base.y + dir.y * s };
}

/**
 * Checks whether two points are coincident within {@link ZERO_LENGTH_EPSILON}
 *
 * @param a the first point
 * @param b the second point
 * @returns true if the points are coincident
 */
function coincident(a: Pt, b: Pt): boolean {
    return Math.abs(a.x - b.x) < ZERO_LENGTH_EPSILON && Math.abs(a.y - b.y) < ZERO_LENGTH_EPSILON;
}

/**
 * The trim points around a single corner
 */
interface CornerGeometry {
    /**
     * Entry point on the edge coming from the previous vertex
     */
    readonly p1: Pt;
    /**
     * Exit point on the edge going to the next vertex
     */
    readonly p2: Pt;
    /**
     * How the corner is shaped between the two trim points
     */
    readonly style: "sharp" | "round" | "chamfer";
    /**
     * Effective radius (after clamping) for a round corner
     */
    readonly radius: number;
    /**
     * SVG arc sweep flag for a round corner
     */
    readonly sweep: 0 | 1;
}

/**
 * Computes the trim points for rounding or chamfering the corner at `cur` between the edges from
 * `prev` and to `next`. The trim distance is clamped to half of the shorter edge so two adjacent
 * corners never overrun their shared edge, and a round corner's radius shrinks to stay tangent when
 * clamped. A sharp corner (or a zero-length edge) returns the vertex unchanged.
 *
 * The sweep flag is taken from the sign of the turn at the vertex, which is correct for both convex
 * and reflex corners.
 *
 * @param prev the previous point of the outline
 * @param cur the vertex the corner belongs to
 * @param next the next point of the outline
 * @returns the geometry of the corner
 */
function cornerGeometry(prev: Pt, cur: EvaluatedVertex, next: Pt): CornerGeometry {
    const toPrev = sub(prev, cur);
    const toNext = sub(next, cur);
    const lenPrev = len(toPrev);
    const lenNext = len(toNext);
    if (cur.corner === "sharp" || cur.radius <= 0 || lenPrev === 0 || lenNext === 0) {
        return { p1: cur, p2: cur, style: "sharp", radius: 0, sweep: 0 };
    }
    const dirPrev = normalize(toPrev);
    const dirNext = normalize(toNext);
    const dot = Math.max(-1, Math.min(1, dirPrev.x * dirNext.x + dirPrev.y * dirNext.y));
    const theta = Math.acos(dot);
    const half = theta / 2;

    const maxTrim = Math.min(lenPrev, lenNext) / 2;

    if (cur.corner === "chamfer") {
        const trim = Math.min(cur.radius, maxTrim);
        return {
            p1: addScaled(cur, dirPrev, trim),
            p2: addScaled(cur, dirNext, trim),
            style: "chamfer",
            radius: 0,
            sweep: 0
        };
    }

    const tanHalf = Math.tan(half);
    let trim = tanHalf === 0 ? maxTrim : cur.radius / tanHalf;
    let radius = cur.radius;
    if (trim > maxTrim) {
        trim = maxTrim;
        radius = trim * tanHalf;
    }

    const incoming = sub(cur, prev);
    const outgoing = sub(next, cur);
    const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
    const sweep: 0 | 1 = cross > 0 ? 1 : 0;

    return {
        p1: addScaled(cur, dirPrev, trim),
        p2: addScaled(cur, dirNext, trim),
        style: "round",
        radius,
        sweep
    };
}

/**
 * Checks whether the edge leading into a vertex is curved, which disqualifies its endpoints from
 * corner rounding as the curve already sets the tangent
 *
 * @param vertex the vertex to check
 * @returns true if the edge leading into the vertex is curved
 */
function isCurved(vertex: EvaluatedVertex): boolean {
    return vertex.edge !== undefined;
}

/**
 * Emits the segment from the current pen position `from` to the vertex `cur`, using its curved
 * edge if it has one, or `null` when the segment has zero length (so a corner arc collapses to
 * nothing when the corner rounding is 0 — "ignore non-existing paths"). A degenerate arc
 * (`rx`/`ry` ≈ 0) is emitted as a straight line, matching the SVG spec.
 *
 * @param from the current pen position
 * @param cur the vertex to draw to
 * @returns the path segment, or null if it has zero length
 */
function curveSegment(from: Pt, cur: EvaluatedVertex): string | null {
    const edge = cur.edge;
    const end: Pt = { x: cur.x, y: cur.y };
    if (edge === undefined || edge.kind === "arc") {
        if (
            edge !== undefined &&
            edge.kind === "arc" &&
            edge.rx > ZERO_LENGTH_EPSILON &&
            edge.ry > ZERO_LENGTH_EPSILON
        ) {
            if (coincident(from, end)) {
                return null;
            }
            return `A ${fmt(edge.rx)},${fmt(edge.ry)} ${fmt(edge.rotation)} ${edge.largeArc},${edge.sweep} ${fmt(cur.x)},${fmt(cur.y)}`;
        }
        if (coincident(from, end)) {
            return null;
        }
        return `L ${fmt(cur.x)},${fmt(cur.y)}`;
    }
    switch (edge.kind) {
        case "cubic":
            if (coincident(from, end)) {
                return null;
            }
            return `C ${fmt(edge.c1.x)},${fmt(edge.c1.y)} ${fmt(edge.c2.x)},${fmt(edge.c2.y)} ${fmt(cur.x)},${fmt(cur.y)}`;
        case "quad":
            if (coincident(from, end)) {
                return null;
            }
            return `Q ${fmt(edge.c1.x)},${fmt(edge.c1.y)} ${fmt(cur.x)},${fmt(cur.y)}`;
    }
}

/**
 * Builds an SVG path string for a closed outline, applying per-vertex rounding or chamfering
 * on straight-edged corners and emitting Bézier/arc segments for curved edges. Zero-length
 * segments are dropped, so a corner authored with an `r`-radius arc disappears cleanly when the
 * corner rounding is 0. The returned path is in the same coordinate system as the input points.
 *
 * A closed outline can legitimately have just two vertices when the edges between them are curved
 * (a lens/leaf: two tips joined by two Béziers). Only a straight-edged sub-triangle is truly
 * degenerate and is emitted as an open polyline instead.
 *
 * @param vertices the evaluated vertices of the outline, in order
 * @returns the SVG path string
 */
export function outlineToSvgPath(vertices: EvaluatedVertex[]): string {
    const n = vertices.length;
    if (n === 0) {
        return "";
    }
    const anyCurved = vertices.some(isCurved);
    if (n < 3 && !anyCurved) {
        const parts = vertices.map((v, i) => `${i === 0 ? "M" : "L"} ${fmt(v.x)},${fmt(v.y)}`);
        return parts.join(" ");
    }

    const corners: CornerGeometry[] = vertices.map((cur, i) => {
        const prev = vertices[(i - 1 + n) % n];
        const next = vertices[(i + 1) % n];
        if (isCurved(cur) || isCurved(next)) {
            return { p1: cur, p2: cur, style: "sharp", radius: 0, sweep: 0 };
        }
        return cornerGeometry(prev, cur, next);
    });

    const parts: string[] = [];
    let pen: Pt = corners[0].p2;
    parts.push(`M ${fmt(pen.x)},${fmt(pen.y)}`);
    const lineTo = (p: Pt): void => {
        if (!coincident(pen, p)) {
            parts.push(`L ${fmt(p.x)},${fmt(p.y)}`);
            pen = p;
        }
    };
    for (let step = 1; step <= n; step++) {
        const cur = vertices[step % n];
        const corner = corners[step % n];
        if (isCurved(cur)) {
            const segment = curveSegment(pen, cur);
            if (segment !== null) {
                parts.push(segment);
                pen = { x: cur.x, y: cur.y };
            }
            continue;
        }
        lineTo(corner.p1);
        if (corner.style === "round" && corner.radius > ZERO_LENGTH_EPSILON && !coincident(corner.p1, corner.p2)) {
            const rr = fmt(corner.radius);
            parts.push(`A ${rr},${rr} 0 0,${corner.sweep} ${fmt(corner.p2.x)},${fmt(corner.p2.y)}`);
            pen = corner.p2;
        } else if (corner.style === "chamfer") {
            lineTo(corner.p2);
        }
    }
    parts.push("Z");
    return parts.join(" ");
}

/**
 * Builds the SVG path for a single decoration sub-path. Decorations are literal strokes — no
 * corner rounding (a rim/crease is drawn exactly as authored) — emitting each edge's curve, and a
 * closing segment only when the decoration is closed. Zero-length segments are dropped. A closed
 * decoration whose closing edge is a curve carries that curve on its first vertex, same as the outline.
 *
 * @param vertices the evaluated vertices of the sub-path, in order
 * @param closed whether the sub-path is closed back to its start
 * @returns the SVG path string, or an empty string if the sub-path is not a real stroke
 */
export function decorationToSvgPath(vertices: EvaluatedVertex[], closed: boolean): string {
    const n = vertices.length;
    if (n === 0) {
        return "";
    }
    const first = vertices[0];
    const parts: string[] = [`M ${fmt(first.x)},${fmt(first.y)}`];
    let pen: Pt = { x: first.x, y: first.y };
    const emit = (target: EvaluatedVertex): void => {
        const segment = curveSegment(pen, target);
        if (segment !== null) {
            parts.push(segment);
            pen = { x: target.x, y: target.y };
        }
    };
    for (let i = 1; i < n; i++) {
        emit(vertices[i]);
    }
    if (closed) {
        if (first.edge !== undefined) {
            emit(first);
        }
        parts.push("Z");
    }
    return parts.length > 1 ? parts.join(" ") : "";
}

/**
 * Concatenates every decoration sub-path into one path string, with the sub-paths separated by spaces
 *
 * @param decorations the evaluated decorations
 * @returns the combined SVG path string
 */
export function decorationsToSvgPath(decorations: EvaluatedDecoration[]): string {
    return decorations
        .map((decoration) => decorationToSvgPath(decoration.vertices, decoration.closed))
        .filter((part) => part.length > 0)
        .join(" ");
}

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
 * Checks whether the edge leading into a vertex is curved
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
 * How a walk returns to the point it started from:
 * - `open`: it does not, the sub-path stays a polyline
 * - `implicit`: `Z` closes it, and the closing segment is emitted only where the first vertex
 *   carries a curve for it — a straight closing edge is left to `Z` to draw
 * - `explicit`: `Z` closes it, and the closing segment is always emitted before it
 *
 * The outline and a closed decoration genuinely differ here and both conventions have to be kept:
 * `foldClosingVertex` moves a path's final straight edge onto vertex 0, where `implicit` would
 * silently hand it to `Z`. That is one segment fewer for `svgPathBbox` and `flattenPath` to see, and
 * both feed the stroke overflow the fixpoint solves against.
 */
type Closure = "open" | "implicit" | "explicit";

/**
 * Walks the vertices of one sub-path into an SVG path string: the pen starts at the first vertex and
 * each following vertex is drawn with its edge's curve, or a straight line if it has none. Zero-length
 * segments are dropped, so a corner authored with an `r`-radius arc disappears cleanly when the corner
 * rounding is 0. The returned path is in the same coordinate system as the input points.
 *
 * @param vertices the evaluated vertices of the sub-path, in order, at least one
 * @param closure how the walk returns to its start
 * @returns the SVG path string, or an empty string if nothing but the initial move survived
 */
function walkVertices(vertices: EvaluatedVertex[], closure: Closure): string {
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
    for (let i = 1; i < vertices.length; i++) {
        emit(vertices[i]);
    }
    if (closure !== "open") {
        if (closure === "explicit" || first.edge !== undefined) {
            emit(first);
        }
        parts.push("Z");
    }
    return parts.length > 1 ? parts.join(" ") : "";
}

/**
 * Builds an SVG path string for a closed outline. The outline is implicitly closed and keeps its
 * closing segment explicit, see {@link Closure}.
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
    return walkVertices(vertices, "explicit");
}

/**
 * Builds the SVG path for a single decoration sub-path: the same walk as the outline, but a
 * decoration may stay open, and a closed one leaves a straight closing edge to `Z`, see
 * {@link Closure}.
 *
 * @param vertices the evaluated vertices of the sub-path, in order
 * @param closed whether the sub-path is closed back to its start
 * @returns the SVG path string, or an empty string if the sub-path is not a real stroke
 */
export function decorationToSvgPath(vertices: EvaluatedVertex[], closed: boolean): string {
    if (vertices.length === 0) {
        return "";
    }
    return walkVertices(vertices, closed ? "implicit" : "open");
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

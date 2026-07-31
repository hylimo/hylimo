import type { EvaluatedDecoration, EvaluatedVertex, Pt } from "./shapeIr.js";

/**
 * Formats a coordinate for an SVG path, rounded to the precision a shape is drawn at. Kept high
 * (1e-6) so the quantization noise stays well below the layout solver's convergence tolerance,
 * otherwise the solver hunts in a limit cycle at the rounding scale.
 *
 * The rounding belongs to the path string and to nothing else. A walk reports what a shape really
 * is; only its serialization gives any of that away, and the region is measured on the walk rather
 * than on the string, so it no longer inherits a rounding it never wanted.
 *
 * @param value the coordinate to format
 * @returns the formatted coordinate
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
 * What a walk over a sub-path reports its segments to.
 *
 * There are two consumers — the path string the shape is rendered from, and the exact region it is
 * measured on — and they have to see the same outline. Handing both the same walk is what makes that
 * so by construction: the region used to be built by formatting this walk into a string and parsing
 * it straight back, which cost a parse of its own for every iteration of a solver that runs dozens
 * of them.
 */
export interface SubPathSink {
    /**
     * Starts a new sub-path at a point
     *
     * @param x the x coordinate to start at
     * @param y the y coordinate to start at
     */
    moveTo(x: number, y: number): void;
    /**
     * Draws a straight segment to a point
     *
     * @param x the x coordinate to draw to
     * @param y the y coordinate to draw to
     */
    lineTo(x: number, y: number): void;
    /**
     * Draws an elliptical arc to a point, as the SVG `A` command states it
     *
     * @param rx the radius along the ellipse's x-axis
     * @param ry the radius along the ellipse's y-axis
     * @param rotation the x-axis rotation, in degrees
     * @param largeArc whether the arc takes the long way around
     * @param sweep the direction the arc is swept in
     * @param x the x coordinate to draw to
     * @param y the y coordinate to draw to
     */
    arcTo(rx: number, ry: number, rotation: number, largeArc: 0 | 1, sweep: 0 | 1, x: number, y: number): void;
    /**
     * Draws a cubic Bézier to a point
     *
     * @param c1x the x coordinate of the control point next to the current pen position
     * @param c1y the y coordinate of that control point
     * @param c2x the x coordinate of the control point next to the end
     * @param c2y the y coordinate of that control point
     * @param x the x coordinate to draw to
     * @param y the y coordinate to draw to
     */
    cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
    /**
     * Draws a quadratic Bézier to a point
     *
     * @param c1x the x coordinate of the single control point
     * @param c1y the y coordinate of that control point
     * @param x the x coordinate to draw to
     * @param y the y coordinate to draw to
     */
    quadTo(c1x: number, c1y: number, x: number, y: number): void;
    /**
     * Closes the sub-path back to the point it started at
     */
    close(): void;
}

/**
 * How a walk returns to the point it started from:
 * - `open`: it does not, the sub-path stays a polyline
 * - `implicit`: the sub-path closes, and the closing segment is reported only where the first vertex
 *   carries a curve for it — a straight closing edge is left to {@link SubPathSink.close}
 * - `explicit`: the sub-path closes, and the closing segment is always reported before it
 *
 * The outline and a closed decoration genuinely differ here and both conventions have to be kept:
 * `foldClosingVertex` moves a path's final straight edge onto vertex 0, where `implicit` would
 * silently hand it to the close. That is one segment fewer for `svgPathBbox` to see, and it feeds
 * the stroke overflow the fixpoint solves against.
 */
type Closure = "open" | "implicit" | "explicit";

/**
 * Reports the segment from the current pen position `from` to the vertex `cur`, using its curved
 * edge if it has one, or a straight line if it has none. A zero-length segment is dropped (so a
 * corner arc collapses to nothing when the corner rounding is 0 — "ignore non-existing paths"), and
 * a degenerate arc (`rx`/`ry` ≈ 0) is reported as a straight line, matching the SVG spec.
 *
 * @param from the current pen position
 * @param cur the vertex to draw to
 * @param sink the sink to report to
 * @returns true if a segment was reported, so the pen moves on
 */
function emitSegment(from: Pt, cur: EvaluatedVertex, sink: SubPathSink): boolean {
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
                return false;
            }
            sink.arcTo(edge.rx, edge.ry, edge.rotation, edge.largeArc, edge.sweep, cur.x, cur.y);
            return true;
        }
        if (coincident(from, end)) {
            return false;
        }
        sink.lineTo(cur.x, cur.y);
        return true;
    }
    if (coincident(from, end)) {
        return false;
    }
    if (edge.kind === "cubic") {
        sink.cubicTo(edge.c1.x, edge.c1.y, edge.c2.x, edge.c2.y, cur.x, cur.y);
    } else {
        sink.quadTo(edge.c1.x, edge.c1.y, cur.x, cur.y);
    }
    return true;
}

/**
 * Walks the vertices of one sub-path: the pen starts at the first vertex and each following vertex
 * is drawn with its edge's curve, or a straight line if it has none. Zero-length segments are
 * dropped, so a corner authored with an `r`-radius arc disappears cleanly when the corner rounding
 * is 0. The points are reported in the coordinate system they come in.
 *
 * @param vertices the evaluated vertices of the sub-path, in order, at least one
 * @param closure how the walk returns to its start
 * @param sink the sink to report to
 * @returns the number of segments reported after the initial move
 */
function walkVertices(vertices: EvaluatedVertex[], closure: Closure, sink: SubPathSink): number {
    const first = vertices[0];
    sink.moveTo(first.x, first.y);
    let pen: Pt = { x: first.x, y: first.y };
    let segments = 0;
    const emit = (target: EvaluatedVertex): void => {
        if (emitSegment(pen, target, sink)) {
            pen = { x: target.x, y: target.y };
            segments++;
        }
    };
    for (let i = 1; i < vertices.length; i++) {
        emit(vertices[i]);
    }
    if (closure !== "open") {
        if (closure === "explicit" || first.edge !== undefined) {
            emit(first);
        }
        sink.close();
        segments++;
    }
    return segments;
}

/**
 * Whether an outline is too slight to be walked as a closed shape. A closed outline can legitimately
 * have just two vertices when the edges between them are curved (a lens/leaf: two tips joined by two
 * Béziers); only a straight-edged sub-triangle is truly degenerate, and is walked as an open
 * polyline instead.
 *
 * @param vertices the evaluated vertices of the outline, in order
 * @returns true if the outline degenerates to a polyline
 */
function isDegenerateOutline(vertices: EvaluatedVertex[]): boolean {
    return vertices.length < 3 && !vertices.some(isCurved);
}

/**
 * Walks a closed outline. It is implicitly closed and keeps its closing segment explicit, see
 * {@link Closure}. A degenerate outline is walked as a bare polyline instead, keeping every vertex
 * even where two of them coincide — the `M 5,5 L 5,5` that leaves is what tells the stroke bounds
 * that there is a point to paint, and it is what {@link buildExactRegion} recognises as a shape with
 * no region to speak of.
 *
 * @param vertices the evaluated vertices of the outline, in order, at least one
 * @param sink the sink to report to
 */
export function walkOutline(vertices: EvaluatedVertex[], sink: SubPathSink): void {
    if (isDegenerateOutline(vertices)) {
        sink.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            sink.lineTo(vertices[i].x, vertices[i].y);
        }
        return;
    }
    walkVertices(vertices, "explicit", sink);
}

/**
 * Walks one decoration sub-path: the same walk as the outline, but a decoration may stay open, and a
 * closed one leaves a straight closing edge to the close, see {@link Closure}.
 *
 * @param vertices the evaluated vertices of the sub-path, in order, at least one
 * @param closed whether the sub-path is closed back to its start
 * @returns the number of segments reported after the initial move
 */
export function walkDecoration(vertices: EvaluatedVertex[], closed: boolean, sink: SubPathSink): number {
    return walkVertices(vertices, closed ? "implicit" : "open", sink);
}

/**
 * A sink collecting the walk into the SVG path string the shape is rendered from, rounding each
 * coordinate on the way, see {@link fmt}
 */
class PathStringSink implements SubPathSink {
    /**
     * The commands emitted so far
     */
    private readonly parts: string[] = [];

    moveTo(x: number, y: number): void {
        this.parts.push(`M ${fmt(x)},${fmt(y)}`);
    }

    lineTo(x: number, y: number): void {
        this.parts.push(`L ${fmt(x)},${fmt(y)}`);
    }

    arcTo(rx: number, ry: number, rotation: number, largeArc: 0 | 1, sweep: 0 | 1, x: number, y: number): void {
        this.parts.push(`A ${fmt(rx)},${fmt(ry)} ${fmt(rotation)} ${largeArc},${sweep} ${fmt(x)},${fmt(y)}`);
    }

    cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
        this.parts.push(`C ${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(x)},${fmt(y)}`);
    }

    quadTo(c1x: number, c1y: number, x: number, y: number): void {
        this.parts.push(`Q ${fmt(c1x)},${fmt(c1y)} ${fmt(x)},${fmt(y)}`);
    }

    close(): void {
        this.parts.push("Z");
    }

    /**
     * The path walked so far
     *
     * @returns the SVG path string
     */
    toPath(): string {
        return this.parts.join(" ");
    }
}

/**
 * Builds an SVG path string for a closed outline, see {@link walkOutline}
 *
 * @param vertices the evaluated vertices of the outline, in order
 * @returns the SVG path string
 */
export function outlineToSvgPath(vertices: EvaluatedVertex[]): string {
    if (vertices.length === 0) {
        return "";
    }
    const sink = new PathStringSink();
    if (isDegenerateOutline(vertices)) {
        walkOutline(vertices, sink);
        return sink.toPath();
    }
    return walkVertices(vertices, "explicit", sink) > 0 ? sink.toPath() : "";
}

/**
 * Builds the SVG path for a single decoration sub-path, see {@link walkDecoration}
 *
 * @param vertices the evaluated vertices of the sub-path, in order
 * @param closed whether the sub-path is closed back to its start
 * @returns the SVG path string, or an empty string if the sub-path is not a real stroke
 */
export function decorationToSvgPath(vertices: EvaluatedVertex[], closed: boolean): string {
    if (vertices.length === 0) {
        return "";
    }
    const sink = new PathStringSink();
    return walkDecoration(vertices, closed, sink) > 0 ? sink.toPath() : "";
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

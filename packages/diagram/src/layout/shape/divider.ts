import { svgPathBbox } from "@hylimo/diagram-common";
import svgpath from "svgpath";
import { buildExactRegionFromPath } from "./exactRegion.js";
import type { ExactRegion } from "./exactRegion.js";
import { buildShapeClipPath } from "./shapeOutline.js";
import type { ShapeStroke } from "./types.js";

/**
 * A half-open interval along the axis a run is measured on
 */
export interface Run {
    /**
     * Where the interval starts
     */
    from: number;
    /**
     * Where the interval ends
     */
    to: number;
}

/**
 * Geometry for the dividers of one shape at one solved size.
 *
 * A divider is a rule across the interior of a shape that has to stop at the outline and at every
 * decoration. Both are answered by the machinery the content box already uses: {@link ExactRegion}
 * models the outline's own stroke and every decoration's stroke as the material they really cover,
 * and the free intervals of a band through that region are exactly the pieces the rule may be drawn
 * as. A decoration therefore blocks a divider by the very mechanism it blocks content by, with
 * nothing shape-specific anywhere.
 *
 * The whole thing is expensive enough to be worth caching per shape (two regions and an inward
 * offset of the ring), while the per-divider query on top of it is a scan over a handful of pieces.
 */
export interface DividerGeometry {
    /**
     * The axis the runs of this geometry are measured along. The vertical case is not a second
     * implementation: the paths are transposed once, here, and everything below runs the identical
     * horizontal code — see {@link buildDividerGeometry}.
     */
    readonly axis: DividerAxis;
    /**
     * The region the outline and every decoration leave free, in query space, or undefined for an
     * outline with no extent at all
     */
    readonly region: ExactRegion | undefined;
    /**
     * The region the outline alone leaves free, which is what tells a run end terminating at the
     * border from one terminating at a decoration
     */
    readonly outlineRegion: ExactRegion | undefined;
    /**
     * The interior of the shape as a closed path in shape-local (not query) coordinates, or
     * undefined for an outline that is not a usable ring
     */
    readonly clipPath: string | undefined;
    /**
     * {@link clipPath} flattened into query space as interleaved coordinates, which is what the area
     * of a clipped rule is computed against
     */
    readonly clipRing: number[] | undefined;
    /**
     * The extent of the outline along the run axis. A rule that ends at the border is drawn out to
     * here and terminated by the clip, which is as far as it can ever need to go.
     */
    readonly bounds: Run;
}

/**
 * Which way a divider runs. It is never declared — it follows from the flow direction of the shape
 * the divider sits in, so a `vbox` shape gets horizontal rules and an `hbox` shape vertical ones.
 */
export type DividerAxis = "horizontal" | "vertical";

/**
 * The matrix that swaps x and y. Running the horizontal code over the transposed geometry answers
 * the vertical question, and the interval it reports back needs no transformation: an interval
 * along the transposed x *is* an interval along the real y.
 */
const TRANSPOSE: [number, number, number, number, number, number] = [0, 1, 1, 0, 0, 0];

/**
 * Splits a path string into its sub-paths, one per `M` command. The decorations of a shape arrive as
 * one string ({@link decorationsToSvgPath} joins them), and taking that as a single sub-path would
 * invent an edge from the end of one to the start of the next — a stroke the shape does not have,
 * blocking dividers that should pass.
 *
 * @param path the path string to split
 * @returns the sub-path strings, in order
 */
function subPaths(path: string): string[] {
    const parts: string[] = [];
    const pattern = /[Mm][^Mm]*/g;
    let match = pattern.exec(path);
    while (match != undefined) {
        parts.push(match[0].trim());
        match = pattern.exec(path);
    }
    return parts;
}

/**
 * Builds the divider geometry of a shape at one solved size. A decoration sub-path is taken as open,
 * as it is stroked the way it is drawn: whether it happens to return to its start changes only its
 * joins, and taking it as open can never make it block less than it really does.
 *
 * @param path the solved outline path, in shape-local coordinates
 * @param decoration the solved decoration sub-paths, if the shape has any
 * @param stroke the stroke the shape is painted with
 * @param axis the axis dividers of this shape run along
 * @returns the built geometry
 */
export function buildDividerGeometry(
    path: string,
    decoration: string | undefined,
    stroke: ShapeStroke,
    axis: DividerAxis
): DividerGeometry {
    const toQuerySpace = (subject: string): string =>
        axis === "vertical" ? svgpath(subject).matrix(TRANSPOSE).toString() : subject;
    const outlinePath = toQuerySpace(path);
    const decorations = (decoration != undefined ? subPaths(decoration) : []).map((part) => ({
        path: toQuerySpace(part),
        closed: false
    }));
    const outlineRegion = buildExactRegionFromPath(outlinePath, [], stroke);
    const clipPath = buildShapeClipPath(path, stroke);
    const box = svgPathBbox(outlinePath, undefined);
    return {
        axis,
        region: decorations.length > 0 ? buildExactRegionFromPath(outlinePath, decorations, stroke) : outlineRegion,
        outlineRegion,
        clipPath,
        clipRing: clipPath != undefined ? flattenRing(toQuerySpace(clipPath)) : undefined,
        bounds: { from: box.x, to: box.x + box.width }
    };
}

/**
 * The free intervals of a band through a region, as the runs a rule may be drawn as
 *
 * @param region the region to query, or undefined for a shape with no geometry to measure
 * @param from the near edge of the band
 * @param to the far edge of the band
 * @returns the free intervals, in order
 */
function freeRuns(region: ExactRegion | undefined, from: number, to: number): Run[] {
    if (region == undefined) {
        return [];
    }
    const found: number[] = [];
    region.runs(from, to, found);
    const runs: Run[] = [];
    for (let i = 0; i + 1 < found.length; i += 2) {
        runs.push({ from: found[i], to: found[i + 1] });
    }
    return runs;
}

/**
 * The intervals along `axis` at `coordinate` that a divider of thickness `thickness` may occupy:
 * inside the outline, clear of the outline stroke and of every decoration stroke.
 *
 * A divider at `coordinate` with thickness `t` occupies the band `[coordinate - t/2, coordinate + t/2]`,
 * and its runs are the free intervals of that band. One run per free interval, so a divider crossing a
 * decoration comes back as two rules with a gap between them, and one crossing a shape that falls into
 * several lobes at that height comes back once per lobe. Nothing about a leading, trailing or repeated
 * divider needs handling: each is just a band at its own coordinate.
 *
 * `span` is the extent the divider itself was laid out across, and only the intervals it reaches into
 * are kept. Free space is not the same thing as content: the side face of a 3D box, the lid of a
 * database and the fold of a note are all inside the outline and clear of every stroke, but they are
 * not part of the region the content — and therefore the divider — was laid out in, and a rule ruling
 * off a face it never crossed is not a divider, it is a stray line. What a divider does do is *bleed*:
 * the interval it reaches into is kept whole, out to the border, which is what separates this from
 * simply clipping the rule to the content box. A divider laid out inside the content box always
 * reaches into at least one interval — the content box is clear of every stroke by construction — so
 * the fallback to every interval only ever answers a degenerate span.
 *
 * @param geometry the geometry of the shape the divider sits in
 * @param axis the axis the divider runs along, which has to be the one the geometry was built for
 * @param coordinate the position of the divider on the axis across it
 * @param thickness the thickness of the divider
 * @param span the extent along `axis` the divider was laid out across
 * @returns the intervals the divider may occupy, in order
 */
export function dividerRuns(
    geometry: DividerGeometry,
    axis: DividerAxis,
    coordinate: number,
    thickness: number,
    span: Run
): Run[] {
    if (axis !== geometry.axis) {
        throw new Error(`divider geometry was built for ${geometry.axis} runs, not ${axis}`);
    }
    const half = Math.max(thickness, 0) / 2;
    const runs = freeRuns(geometry.region, coordinate - half, coordinate + half);
    const reached = runs.filter((run) => run.to > span.from + RUN_EPSILON && run.from < span.to - RUN_EPSILON);
    return reached.length > 0 ? reached : runs;
}

/**
 * Pushes the ends of the runs out past where they were measured, so the clip region can terminate
 * them exactly.
 *
 * A run is measured over the whole band the divider covers, so against a border that is not
 * perpendicular to it the run stops short by up to half the thickness times the border's slope —
 * 1.5px on a 300x100 diamond at a thickness of 1, which is plainly visible. Pushing the end out
 * covers that without anyone having to bound a slope, because the clip decides where the rule really
 * ends. The far side of the outline is as far as that can ever need to go: the clip lies strictly
 * inside it.
 *
 * An end that stops at a *decoration* is left exactly where it is: the clip only knows about the
 * outline, so overshooting there would draw the rule straight through the decoration it is supposed
 * to break at. Which ends those are falls out of measuring the same band against the outline's stroke
 * alone — an end the outline does not account for is one a decoration produced.
 *
 * Where that measurement reports several intervals, the outline itself has fallen into several lobes
 * at this height, and a run is only pushed out to halfway across the gap to the neighbouring lobe. The
 * clip is the shape's whole interior, so a rule reaching into a lobe it never crossed would be painted
 * there just as happily as in its own.
 *
 * @param geometry the geometry of the shape the divider sits in
 * @param runs the runs to extend, as {@link dividerRuns} reported them
 * @param coordinate the position of the divider on the axis across it
 * @param thickness the thickness of the divider
 * @returns the extended runs
 */
function overshootRuns(geometry: DividerGeometry, runs: Run[], coordinate: number, thickness: number): Run[] {
    if (runs.length === 0) {
        return runs;
    }
    const half = Math.max(thickness, 0) / 2;
    const lobes = freeRuns(geometry.outlineRegion, coordinate - half, coordinate + half);
    return runs.map((run) => {
        const index = lobes.findIndex((lobe) => lobe.from <= run.from + RUN_EPSILON && lobe.to >= run.to - RUN_EPSILON);
        if (index < 0) {
            return run;
        }
        const lobe = lobes[index];
        const atStart = run.from <= lobe.from + RUN_EPSILON;
        const atEnd = run.to >= lobe.to - RUN_EPSILON;
        return {
            from: atStart ? (index > 0 ? (lobes[index - 1].to + lobe.from) / 2 : geometry.bounds.from) : run.from,
            to: atEnd ? (index + 1 < lobes.length ? (lobe.to + lobes[index + 1].from) / 2 : geometry.bounds.to) : run.to
        };
    });
}

/**
 * Tolerance (px) for deciding that a run ends where the outline alone would have ended it
 */
const RUN_EPSILON = 1e-6;

/**
 * How far (px) the area of a clipped run may fall short of its own bounding box before it stops
 * counting as a plain rectangle, as an average over the run's length. The clip is exactly straight
 * wherever the shape's border is, so anything above numerical noise is a real deviation.
 */
const RECTANGLE_EPSILON = 1e-6;

/**
 * Points closer than this (px) are dropped from an emitted outline, which is what keeps the vertices
 * a clip lands exactly on from being written out twice
 */
const DUPLICATE_EPSILON = 1e-9;

/**
 * Ceiling on the dashes one run is cut into, above which the dash is not worth reproducing piece by
 * piece and the run is taken as solid
 */
const MAX_DASHES = 4096;

/**
 * How a divider at one position is painted.
 *
 * The rule is a stroke wherever a stroke can express it, and only where it cannot does it become a
 * region: `clip` and {@link clipFill} are set together or not at all.
 */
export interface DividerPainting {
    /**
     * The geometry to stroke, one sub-path per run, in shape-local coordinates. Empty if the divider
     * covers nothing at all.
     */
    readonly path: string;
    /**
     * The region {@link path} has to be painted through, or undefined if it needs no clipping
     */
    readonly clip: string | undefined;
    /**
     * The area the clipped stroke covers, as a closed path to fill, or undefined if there is no clip
     */
    readonly clipFill: string | undefined;
}

/**
 * The dash pattern of a stroke, as SVG states it
 */
export interface DividerDash {
    /**
     * The length of one dash
     */
    readonly length: number;
    /**
     * The length of the gap after it
     */
    readonly gap: number;
}

/**
 * Works out how a divider is painted: the geometry to stroke, and where that stroke has to be
 * clipped, the region it covers.
 *
 * A rule is stroked and clipped rather than filled because a stroke is what it is — a dash stays a
 * dash, and an animated resize interpolates two-point sub-paths instead of two polygons that need not
 * even have the same number of vertices. But a clip is also the one thing a renderer is most likely
 * not to have, so this settles for it only where it has to:
 *
 * - Wherever the shape's border meets the rule at a right angle — every vertical wall, which is most
 *   shapes most of the time — the clipped stroke *is* a plain rectangle, and the rule is emitted as a
 *   bare line ending exactly where the clip would have cut it. Nothing has to be clipped at all.
 * - Otherwise the clip stays, and the area it leaves is computed alongside it, so a renderer without
 *   clipping support has an exact region to fill instead. That area is the rule's own band cut down
 *   by the shape's interior, dash by dash where the rule is dashed, which is precisely what the
 *   clipped stroke paints.
 *
 * Whether the first case applies is not read off the shape but measured: the clipped area is compared
 * against its own bounding box, and a rule is a rectangle exactly when the two agree. That answers
 * every case a border can present — a rounded rectangle whose rule sits beside the corner, a chevron
 * whose notch bites into the rule but leaves the ends alone — without anything having to enumerate
 * them.
 *
 * @param geometry the geometry of the shape the divider sits in
 * @param runs the runs the divider is drawn as, as {@link dividerRuns} reported them
 * @param coordinate the position of the divider on the axis across it
 * @param thickness the thickness of the divider
 * @param dash the dash pattern the divider is stroked with, if any
 * @returns how to paint the divider
 */
export function paintDivider(
    geometry: DividerGeometry,
    runs: Run[],
    coordinate: number,
    thickness: number,
    dash: DividerDash | undefined
): DividerPainting {
    const axis = geometry.axis;
    const ring = geometry.clipRing;
    if (ring == undefined) {
        return { path: runsToSvgPath(runs, axis, coordinate), clip: undefined, clipFill: undefined };
    }
    const extended = overshootRuns(geometry, runs, coordinate, thickness);
    const half = Math.max(thickness, 0) / 2;
    const top = coordinate - half;
    const bottom = coordinate + half;
    const rectangles = extended.map((run) => asRectangle(clipToRectangle(ring, run, top, bottom), top, bottom));
    if (rectangles.every((rectangle) => rectangle != undefined)) {
        return { path: runsToSvgPath(rectangles as Run[], axis, coordinate), clip: undefined, clipFill: undefined };
    }
    const areas = extended
        .flatMap((run) => dashRuns(run, dash))
        .map((part) => polygonToSvgPath(clipToRectangle(ring, part, top, bottom), axis))
        .filter((part) => part.length > 0);
    if (areas.length === 0) {
        return { path: "", clip: undefined, clipFill: undefined };
    }
    return {
        path: runsToSvgPath(extended, axis, coordinate),
        clip: geometry.clipPath,
        clipFill: areas.join(" ")
    };
}

/**
 * Cuts a run into the dashes it is stroked as, which is what the area of a dashed rule is the union
 * of. SVG starts the pattern afresh at every sub-path, and every run is one, so each starts at its
 * own beginning.
 *
 * @param run the run to cut up
 * @param dash the dash pattern, or undefined for a solid stroke
 * @returns the intervals the stroke covers, in order
 */
function dashRuns(run: Run, dash: DividerDash | undefined): Run[] {
    if (dash == undefined || !(dash.length > 0)) {
        return [run];
    }
    const period = dash.length + Math.max(dash.gap, 0);
    if (!(period > 0) || run.to - run.from > period * MAX_DASHES) {
        return [run];
    }
    const dashes: Run[] = [];
    for (let start = run.from; start < run.to; start += period) {
        dashes.push({ from: start, to: Math.min(start + dash.length, run.to) });
    }
    return dashes;
}

/**
 * Clips a closed polyline to an axis-aligned rectangle (Sutherland–Hodgman), which for a subject that
 * falls into several pieces leaves them joined by edges running back and forth along the rectangle's
 * own border. Those enclose no area, so the result fills exactly as the pieces would — which is all
 * it is ever used for.
 *
 * @param ring the closed polygon to clip, as interleaved coordinates
 * @param run the extent of the rectangle along the run axis
 * @param top the near edge of the rectangle across the run axis
 * @param bottom the far edge of the rectangle across the run axis
 * @returns the clipped polygon, as interleaved coordinates
 */
function clipToRectangle(ring: readonly number[], run: Run, top: number, bottom: number): number[] {
    let polygon = clipHalfPlane(ring, 0, run.from, false);
    polygon = clipHalfPlane(polygon, 0, run.to, true);
    polygon = clipHalfPlane(polygon, 1, top, false);
    polygon = clipHalfPlane(polygon, 1, bottom, true);
    return polygon;
}

/**
 * Clips a polygon to one side of an axis-aligned line: every vertex on the kept side survives, and
 * every edge crossing the line contributes the point where it does
 *
 * @param polygon the polygon to clip, as interleaved coordinates
 * @param axis 0 to cut along a vertical line, 1 along a horizontal one
 * @param bound where the line sits on that axis
 * @param keepBelow whether to keep what is below the line rather than what is above it
 * @returns the clipped polygon, as interleaved coordinates
 */
function clipHalfPlane(polygon: readonly number[], axis: 0 | 1, bound: number, keepBelow: boolean): number[] {
    const count = polygon.length / 2;
    const result: number[] = [];
    if (count === 0) {
        return result;
    }
    const inside = (index: number): boolean =>
        keepBelow ? polygon[2 * index + axis] <= bound : polygon[2 * index + axis] >= bound;
    for (let i = 0; i < count; i++) {
        const j = (i + 1) % count;
        const currentInside = inside(i);
        if (currentInside) {
            result.push(polygon[2 * i], polygon[2 * i + 1]);
        }
        if (currentInside !== inside(j)) {
            const position = (bound - polygon[2 * i + axis]) / (polygon[2 * j + axis] - polygon[2 * i + axis]);
            result.push(
                polygon[2 * i] + position * (polygon[2 * j] - polygon[2 * i]),
                polygon[2 * i + 1] + position * (polygon[2 * j + 1] - polygon[2 * i + 1])
            );
        }
    }
    return result;
}

/**
 * Reads a clipped area as the rectangle it fills, or nothing if it is not one.
 *
 * A polygon contained in its own bounding box covers exactly that box only when the two have the same
 * area, so the shoelace formula answers the whole question at once — no case analysis over how a
 * border happens to run. The box also has to span the rule's full thickness: an area that does not is
 * one the shape pinched, and no line of that thickness reproduces it.
 *
 * @param polygon the clipped area, as interleaved coordinates
 * @param top the near edge of the rule's band
 * @param bottom the far edge of the rule's band
 * @returns the extent of the rectangle along the run axis, or undefined if the area is not one
 */
function asRectangle(polygon: number[], top: number, bottom: number): Run | undefined {
    const count = polygon.length / 2;
    if (count < 3) {
        return undefined;
    }
    let from = Infinity;
    let to = -Infinity;
    let near = Infinity;
    let far = -Infinity;
    let area = 0;
    for (let i = 0; i < count; i++) {
        const j = (i + 1) % count;
        from = Math.min(from, polygon[2 * i]);
        to = Math.max(to, polygon[2 * i]);
        near = Math.min(near, polygon[2 * i + 1]);
        far = Math.max(far, polygon[2 * i + 1]);
        area += polygon[2 * i] * polygon[2 * j + 1] - polygon[2 * j] * polygon[2 * i + 1];
    }
    const width = to - from;
    if (!(width > 0) || Math.abs(near - top) > RECTANGLE_EPSILON || Math.abs(far - bottom) > RECTANGLE_EPSILON) {
        return undefined;
    }
    if (width * (far - near) - Math.abs(area) / 2 > RECTANGLE_EPSILON * width) {
        return undefined;
    }
    return { from, to };
}

/**
 * Formats a coordinate for an emitted path, rounded to where the difference stopped being visible a
 * long time ago
 *
 * @param value the coordinate to format
 * @returns the formatted coordinate
 */
function format(value: number): string {
    return (Math.round(value * 1e6) / 1e6).toString();
}

/**
 * Renders runs as an SVG path with one sub-path each, in shape-local coordinates
 *
 * @param runs the runs to render
 * @param axis the axis the runs are measured along
 * @param coordinate the position of the divider on the axis across the runs
 * @returns the SVG path string, empty if there are no runs
 */
function runsToSvgPath(runs: Run[], axis: DividerAxis, coordinate: number): string {
    return runs
        .map((run) =>
            axis === "horizontal"
                ? `M ${format(run.from)},${format(coordinate)} L ${format(run.to)},${format(coordinate)}`
                : `M ${format(coordinate)},${format(run.from)} L ${format(coordinate)},${format(run.to)}`
        )
        .join(" ");
}

/**
 * Renders a polygon measured in query space as a closed SVG sub-path in shape-local coordinates,
 * dropping the coincident vertices a clip leaves wherever it lands exactly on one
 *
 * @param polygon the polygon to render, as interleaved coordinates
 * @param axis the axis the polygon was measured along
 * @returns the SVG sub-path, empty if the polygon has no area to speak of
 */
function polygonToSvgPath(polygon: number[], axis: DividerAxis): string {
    const parts: string[] = [];
    let lastX = NaN;
    let lastY = NaN;
    for (let i = 0; i < polygon.length; i += 2) {
        const x = axis === "horizontal" ? polygon[i] : polygon[i + 1];
        const y = axis === "horizontal" ? polygon[i + 1] : polygon[i];
        if (Math.abs(x - lastX) < DUPLICATE_EPSILON && Math.abs(y - lastY) < DUPLICATE_EPSILON) {
            continue;
        }
        parts.push(`${parts.length === 0 ? "M" : "L"} ${format(x)},${format(y)}`);
        lastX = x;
        lastY = y;
    }
    return parts.length < 3 ? "" : `${parts.join(" ")} Z`;
}

/**
 * How far (px) a chord of the flattened clip ring may stray from the curve it stands in for.
 *
 * The ring is the one polyline left anywhere in the shape layout, and it is not a measurement: it
 * only ever decides how much *area* a clipped rule covers, and whether that area is a plain
 * rectangle. A curved border fails the rectangle test at any tolerance, and a straight one is
 * reproduced exactly, so this only has to be fine enough that the filled region looks right.
 */
const CLIP_FLATNESS = 0.02;

/**
 * Ceiling on the chords one curve is cut into, for a curve too large to meet {@link CLIP_FLATNESS}
 */
const MAX_CURVE_CHORDS = 512;

/**
 * Flattens a closed path into the polygon it encloses. Arcs and the two reflected curve commands
 * are spelled out by svgpath first, so this sees nothing but lines and Béziers, and a curve is cut
 * into as many chords as its own second derivative asks for: a polyline taken at `n` equal steps of
 * `t` is off by at most `max|p''| / (8n²)`, and `max|p''|` is bounded by the control points. A
 * quadratic is raised to the cubic drawing exactly the same curve, so one code path covers both.
 *
 * @param pathStr the closed path to flatten
 * @returns the polygon, as interleaved coordinates
 */
function flattenRing(pathStr: string): number[] {
    const ring: number[] = [];
    const cubic = (p: number[]): void => {
        const ax = p[0] - 2 * p[2] + p[4];
        const ay = p[1] - 2 * p[3] + p[5];
        const bx = p[2] - 2 * p[4] + p[6];
        const by = p[3] - 2 * p[5] + p[7];
        const second = 6 * Math.sqrt(Math.max(ax * ax + ay * ay, bx * bx + by * by));
        const chords =
            second > 0
                ? Math.max(1, Math.min(MAX_CURVE_CHORDS, Math.ceil(Math.sqrt(second / (8 * CLIP_FLATNESS)))))
                : 1;
        for (let k = 1; k <= chords; k++) {
            const t = k / chords;
            const mt = 1 - t;
            const wa = mt * mt * mt;
            const wb = 3 * mt * mt * t;
            const wc = 3 * mt * t * t;
            const wd = t * t * t;
            ring.push(wa * p[0] + wb * p[2] + wc * p[4] + wd * p[6], wa * p[1] + wb * p[3] + wc * p[5] + wd * p[7]);
        }
    };
    svgpath(pathStr)
        .abs()
        .unshort()
        .unarc()
        .iterate((seg, _index, penX, penY) => {
            const cmd = seg[0];
            if (cmd === "M" || cmd === "L") {
                ring.push(seg[1], seg[2]);
            } else if (cmd === "H") {
                ring.push(seg[1], penY);
            } else if (cmd === "V") {
                ring.push(penX, seg[1]);
            } else if (cmd === "C") {
                cubic([penX, penY, seg[1], seg[2], seg[3], seg[4], seg[5], seg[6]]);
            } else if (cmd === "Q") {
                cubic([
                    penX,
                    penY,
                    penX + (2 / 3) * (seg[1] - penX),
                    penY + (2 / 3) * (seg[2] - penY),
                    seg[3] + (2 / 3) * (seg[1] - seg[3]),
                    seg[4] + (2 / 3) * (seg[2] - seg[4]),
                    seg[3],
                    seg[4]
                ]);
            }
        });
    return ring;
}

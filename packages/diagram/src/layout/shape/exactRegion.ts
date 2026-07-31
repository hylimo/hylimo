import svgpath from "svgpath";
import { LineCap, LineJoin } from "./types.js";
import type { ShapeStroke } from "./types.js";
import type { SubPathSink } from "./geometry.js";
import { walkDecoration, walkOutline } from "./geometry.js";
import type { EvaluatedDecoration, EvaluatedVertex } from "./shapeIr.js";

/**
 * The free region of a shape — inside the outline, clear of the stroke — measured on the geometry
 * the renderer actually draws: line segments, elliptical arcs and Bézier curves, with no polyline
 * anywhere.
 *
 * This is the only geometry engine in the shape layout. Everything that asks where a shape leaves
 * room asks here: {@link ContentProfile} for the content box, and {@link buildDividerGeometry} for
 * the runs a rule is drawn as.
 *
 * The whole construction rests on one identity. The offset of a curve by a signed distance `d` is
 * `c(t) - d·n(t)`, and differentiating gives `c'(t)·(1 - d·κ(t))` — the offset's tangent is
 * *parallel* to the curve's own. Cut a segment where `x'(t)` or `y'(t)` vanishes and every offset
 * of the resulting piece is monotone in the same axes the piece is, which buys three things at
 * once:
 * - a piece's height can be inverted safely: monotone means one solution, so a bracketed Newton
 *   cannot land on the wrong branch ({@link offsetXAtHeight}),
 * - the stroked ribbon of a piece covers a *single* interval at any height, so its extent is
 *   exactly the outermost of the crossings of its own boundary ({@link addRibbonSpan}),
 * - the boundary of the free region is smooth between the heights where a piece begins or ends,
 *   so those heights — a handful for any real shape — are the only ones at which a band's binding
 *   constraint can change ({@link ExactRegion.candidates}).
 *
 * The sign of `1 - d·κ` flips where the offset folds back on itself, which is a fourth place a
 * piece has to be cut. An ellipse's fold parameters come out in closed form ({@link cuspParameters});
 * a cubic's are the roots of a degree-12 polynomial, and are instead *ruled out* rather than solved
 * for, by bounding the curvature from the control points and halving whatever the bound will not
 * vouch for ({@link foldFree}). A curve that genuinely folds — one bending tighter than the stroke is
 * wide — keeps its piece, which is then blocked by its bounding box: over-blocking, never under.
 *
 * A quadratic is raised to the cubic drawing the same curve on the way in, which is exact, so one
 * code path covers both.
 */
/**
 * A free interval a measurement found. It is filled in place rather than returned so a caller
 * asking once per slab does not allocate an object apiece — that allocation is the most expensive
 * part of the answer. Each caller owns the instance it passes, so one measurement can never be read
 * as another's, and `min`/`max` mean nothing unless the call that filled them returned true.
 */
export interface Span {
    /**
     * Left bound of the interval
     */
    min: number;
    /**
     * Right bound of the interval
     */
    max: number;
}

export interface ExactRegion {
    /**
     * Top of the region, where a content edge can first sit
     */
    readonly top: number;
    /**
     * Bottom of the region, where a content edge can last sit
     */
    readonly bottom: number;
    /**
     * The heights at which the region's boundary stops being smooth: every piece's ends and the
     * ends of both of its offsets, plus the extremes of the joins and caps, sorted and restricted
     * to the open range between {@link top} and {@link bottom}.
     *
     * This is the shape's *own* grid. Between two consecutive entries no piece begins or ends, so
     * every boundary that bounds the free region there is a single smooth branch, monotone in both
     * axes — which is what lets a whole slab be measured from its two edges alone.
     */
    readonly candidates: readonly number[];
    /**
     * Every free interval of the band between two heights, appended to `out` as `lo, hi` pairs in
     * ascending order. A band that holds nothing appends nothing.
     *
     * @param ya the top of the band
     * @param yb the bottom of the band
     * @param out the runs collected so far, appended to
     */
    runs(ya: number, yb: number, out: number[]): void;
    /**
     * The widest free interval of the band between two heights, or the one holding a given x,
     * filled into the caller's {@link Span}. This is {@link ExactRegion.runs} for the caller that
     * can only use one interval — a rectangle sits in exactly one of them.
     *
     * @param ya the top of the band
     * @param yb the bottom of the band
     * @param span filled with the interval that was found
     * @param around the x an interval has to contain, or undefined to take the widest one
     * @returns true if an interval was found, which is then left in `span`
     */
    measure(ya: number, yb: number, span: Span, around?: number): boolean;
}

/**
 * Numerical zero for the geometric predicates here
 */
const EPSILON = 1e-12;

/**
 * Tolerance (px) for deciding whether a height falls within a piece's extent
 */
const RANGE_EPSILON = 1e-9;

/**
 * How far (px) a join may reach past the segments it joins before it is worth modelling at all. A
 * turn gentle enough that its miter barely clears the two ribbons leaves a notch shallower than the
 * join is wide, and filling it would cost a blocker per corner for a fraction of a pixel.
 */
const JOIN_EPSILON = 1e-3;

/**
 * Newton steps allowed when inverting an arc offset's height. It converges in about five; the rest
 * is headroom for a piece whose ends are nearly tangent to the query.
 */
const NEWTON_STEPS = 24;

/**
 * Tolerance for the "touches but does not overlap" comparisons: a stroke's edge is not inside it,
 * see {@link onlyTouches}
 */
const TOUCH_EPSILON = 1e-9;

/**
 * A concrete 2D point
 */
interface Pt {
    /**
     * The x coordinate
     */
    readonly x: number;
    /**
     * The y coordinate
     */
    readonly y: number;
}

/**
 * What a piece keeps ready once the stroke it is drawn with is known.
 *
 * Neither of these depends on the height being measured: a piece's ends sit where they sit, and its
 * ribbon covers the band it covers. Both were being rebuilt for every piece at every height — four
 * offset corners each, and for a curve that means evaluating its derivatives four times — so they
 * are taken once per piece instead, by {@link prepareStroke}, before the region answers anything.
 * The extent is the more valuable half: it decides in two comparisons that a piece is nowhere near
 * the height, which is true of most pieces at most heights.
 */
interface StrokeCache {
    /**
     * Where the piece's offsets begin and end, as `x, y` pairs: the inner offset, the piece itself
     * and the outer offset at the start, then the same three at the end. Indexed by
     * `u * 6 + slot * 2`, the slot being 0, 1 or 2 as the offset distance is negative, zero or
     * positive.
     */
    readonly ends: Float64Array;
    /**
     * Top of the piece's stroked ribbon
     */
    ribbonTop: number;
    /**
     * Bottom of the piece's stroked ribbon
     */
    ribbonBottom: number;
}

/**
 * A straight piece, already monotone in both axes. Its offsets are translates of it, so they are
 * inverted in closed form.
 */
interface LinePiece extends StrokeCache {
    /**
     * Discriminator marking a straight piece
     */
    readonly kind: "line";
    /**
     * The x coordinate of the start
     */
    readonly x0: number;
    /**
     * The y coordinate of the start
     */
    readonly y0: number;
    /**
     * The x coordinate of the end
     */
    readonly x1: number;
    /**
     * The y coordinate of the end
     */
    readonly y1: number;
    /**
     * The x component of the unit normal, rotated a quarter turn from the tangent
     */
    readonly nx: number;
    /**
     * The y component of the unit normal, rotated a quarter turn from the tangent
     */
    readonly ny: number;
    /**
     * The point the piece starts at, stored so {@link endpoint} never has to build one
     */
    readonly p0: Pt;
    /**
     * The point the piece ends at, stored so {@link endpoint} never has to build one
     */
    readonly p1: Pt;
}

/**
 * A piece of an elliptical arc, cut so that it and all of its offsets are monotone in both axes.
 * The ellipse is `c(t) = center + R(phi)·(rx·cos t, ry·sin t)`.
 */
interface ArcPiece extends StrokeCache {
    /**
     * Discriminator marking an arc piece
     */
    readonly kind: "arc";
    /**
     * The x coordinate of the center
     */
    readonly cx: number;
    /**
     * The y coordinate of the center
     */
    readonly cy: number;
    /**
     * The radius along the ellipse's own x-axis
     */
    readonly rx: number;
    /**
     * The radius along the ellipse's own y-axis
     */
    readonly ry: number;
    /**
     * The x-axis rotation, in radians
     */
    readonly phi: number;
    /**
     * The cosine of {@link phi}, kept because the arc's derivatives are wanted at a great many
     * parameters and its rotation is the same at every one of them
     */
    readonly cosPhi: number;
    /**
     * The sine of {@link phi}, kept for the reason {@link cosPhi} is
     */
    readonly sinPhi: number;
    /**
     * Each offset's inversion in closed form, as `side, reach` pairs indexed by `slot * 2`, the slot
     * being 0, 1 or 2 as the offset distance is negative, zero or positive. See
     * {@link prepareArcBranches}; an arc that is not circular has no closed form, and holds a
     * `reach` of zero in every slot to say so.
     */
    readonly branches: Float64Array;
    /**
     * The parameter halfway along the piece, which is what says which side of the circle the piece
     * runs on
     */
    readonly mid: number;
    /**
     * The parameter the piece starts at
     */
    readonly t0: number;
    /**
     * The parameter the piece ends at
     */
    readonly t1: number;
    /**
     * The point the piece starts at, pinned rather than recomputed, see {@link endpoint}
     */
    readonly p0: Pt;
    /**
     * The point the piece ends at, pinned rather than recomputed, see {@link endpoint}
     */
    readonly p1: Pt;
}

/**
 * A piece of a cubic Bézier, cut so that it and all of its offsets are monotone in both axes. A
 * quadratic is raised to a cubic on the way in, which is exact, so one code path covers both.
 */
interface CubicPiece extends StrokeCache {
    /**
     * Discriminator marking a cubic piece
     */
    readonly kind: "cubic";
    /**
     * The control points, in order
     */
    readonly q0: Pt;
    /**
     * The control point after the start
     */
    readonly q1: Pt;
    /**
     * The control point before the end
     */
    readonly q2: Pt;
    /**
     * The last control point
     */
    readonly q3: Pt;
    /**
     * The parameter the piece starts at, always 0 — kept so the arithmetic shared with an arc reads
     * the same
     */
    readonly t0: number;
    /**
     * The parameter the piece ends at, always 1
     */
    readonly t1: number;
    /**
     * The point the piece starts at, pinned rather than recomputed, see {@link endpoint}
     */
    readonly p0: Pt;
    /**
     * The point the piece ends at, pinned rather than recomputed, see {@link endpoint}
     */
    readonly p1: Pt;
    /**
     * Whether the piece could not be shown fold-free, see {@link foldFree}. Such a piece is blocked
     * by its bounding box instead of its ribbon: over-blocking, never under-blocking.
     */
    readonly folds: boolean;
    /**
     * Left edge of the box bounding the piece
     */
    readonly minX: number;
    /**
     * Right edge of the box bounding the piece
     */
    readonly maxX: number;
    /**
     * Top edge of the box bounding the piece
     */
    readonly minY: number;
    /**
     * Bottom edge of the box bounding the piece
     */
    readonly maxY: number;
}

/**
 * One piece of the path, monotone in both axes together with all of its offsets
 */
type Piece = LinePiece | ArcPiece | CubicPiece;

/**
 * A piece whose offsets are taken from its own derivatives, as opposed to a straight one whose
 * offsets are translates of it
 */
type CurvePiece = ArcPiece | CubicPiece;

/**
 * Scratch buffer for a curve's point and its first two derivatives, as `x, y` pairs. The evaluation
 * writes here rather than returning three points, as it is the innermost thing the region does and
 * at that rate the points cost more than the arithmetic that fills them.
 */
const derivativeBuffer = new Float64Array(6);

/**
 * Scratch buffer for one point on an offset, as an `x, y` pair
 */
const pointBuffer = new Float64Array(2);

/**
 * Scratch buffer for the order {@link subtractSpans} walks the blocked spans in
 */
const sortOrder: number[] = [];

/**
 * Slots in the band table, see {@link Region.runs}. One table serves every region there is, because
 * only one of them is ever being searched at a time, so it is sized for the busiest — the largest
 * rectangle of a diamond takes some two thousand distinct bands to find — and allocated once for
 * good rather than per region. Which is the point of sharing it: the `inner` solver builds a region
 * per iteration and asks it a few dozen questions before dropping it, and a region that never
 * repeats itself must not pay for a table it makes no use of.
 */
const BAND_SLOTS = 8192;
/**
 * The mask a hash is folded into a slot with
 */
const BAND_MASK = BAND_SLOTS - 1;
/**
 * How full the table is let get before it is emptied, as a share out of eight, keeping the probe
 * that looks a band up short
 */
const BAND_LOAD = 6;
/**
 * The generation each slot was last written in; anything stamped otherwise is stale, which is what
 * makes emptying the table free
 */
const bandGenerations = new Int32Array(BAND_SLOTS);
/**
 * The top of the band each slot holds
 */
const bandTops = new Float64Array(BAND_SLOTS);
/**
 * The bottom of the band each slot holds
 */
const bandBottoms = new Float64Array(BAND_SLOTS);
/**
 * Where each slot's runs begin in {@link bandData}
 */
const bandStarts = new Int32Array(BAND_SLOTS);
/**
 * How many numbers each slot's runs take up in {@link bandData}
 */
const bandCounts = new Int32Array(BAND_SLOTS);
/**
 * The runs of every band of the current generation, end to end
 */
const bandData: number[] = [];
/**
 * The generation the table currently holds
 */
let bandGeneration = 0;
/**
 * The region the table currently holds the bands of
 */
let bandOwner: object | undefined;
/**
 * How many slots the current generation has taken
 */
let bandTaken = 0;

/**
 * Empties the band table, by moving on to a generation none of its slots is stamped with.
 *
 * @param owner the region the table is to hold the bands of from here on
 */
function clearBands(owner: object | undefined): void {
    bandOwner = owner;
    bandTaken = 0;
    bandData.length = 0;
    bandGeneration++;
    if (bandGeneration === 0x7fffffff) {
        bandGenerations.fill(0);
        bandGeneration = 1;
    }
}

/**
 * Scratch buffer for hashing a band, holding its two heights as the four words they are made of
 */
const hashWords = new Int32Array(4);

/**
 * The same buffer read as the two heights themselves
 */
const hashHeights = new Float64Array(hashWords.buffer);

/**
 * A hash of a band's two heights, mixing every bit of both. All of them have to be mixed: the
 * searches close in on a maximum by ever smaller steps, so towards the end it is only the last bits
 * of a height that tell one probe from the next.
 *
 * @param ya the top of the band
 * @param yb the bottom of the band
 * @returns the hash, to be folded into a slot by {@link BAND_MASK}
 */
function hashBand(ya: number, yb: number): number {
    hashHeights[0] = ya;
    hashHeights[1] = yb;
    let hash = Math.imul(hashWords[0], 0x9e3779b1) ^ Math.imul(hashWords[1], 0x85ebca6b);
    hash = Math.imul(hash ^ hashWords[2], 0xc2b2ae35) ^ Math.imul(hashWords[3], 0x27d4eb2f);
    return (hash ^ (hash >>> 15)) >>> 0;
}

/**
 * A disc of stroke material: a round join or a round cap
 */
interface Disc {
    /**
     * The x coordinate of the center
     */
    readonly cx: number;
    /**
     * The y coordinate of the center
     */
    readonly cy: number;
    /**
     * The radius
     */
    readonly r: number;
}

/**
 * A convex patch of stroke material: a miter or bevel wedge, or a square cap
 */
interface Patch {
    /**
     * The vertices, in order
     */
    readonly pts: Pt[];
    /**
     * Top of the patch, taken once for the reason {@link StrokeCache} gives
     */
    readonly minY: number;
    /**
     * Bottom of the patch, taken once for the reason {@link StrokeCache} gives
     */
    readonly maxY: number;
}

/**
 * Creates a patch from its vertices, taking the extent it is skipped by
 *
 * @param pts the vertices, in order
 * @returns the created patch
 */
function patchOf(pts: Pt[]): Patch {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }
    return { pts, minY, maxY };
}

/**
 * Creates a straight piece, caching the unit normal its offsets are shifted along
 *
 * @param x0 the x coordinate of the start
 * @param y0 the y coordinate of the start
 * @param x1 the x coordinate of the end
 * @param y1 the y coordinate of the end
 * @returns the created piece
 */
function linePiece(x0: number, y0: number, x1: number, y1: number): LinePiece {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.hypot(dx, dy) || 1;
    return {
        ends: new Float64Array(12),
        ribbonTop: 0,
        ribbonBottom: 0,
        kind: "line",
        x0,
        y0,
        x1,
        y1,
        nx: -dy / length,
        ny: dx / length,
        p0: { x: x0, y: y0 },
        p1: { x: x1, y: y1 }
    };
}

/**
 * Writes the point and the first and second derivatives of an arc's ellipse at a parameter into
 * {@link derivativeBuffer}. The second derivative is just the point mirrored through the center,
 * which is what keeps the offset's own derivative cheap enough to Newton on.
 *
 * @param piece the arc piece
 * @param t the parameter to evaluate at
 */
function arcDerivatives(piece: ArcPiece, t: number): void {
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const cp = piece.cosPhi;
    const sp = piece.sinPhi;
    const ux = piece.rx * ct;
    const uy = piece.ry * st;
    const vx = -piece.rx * st;
    const vy = piece.ry * ct;
    derivativeBuffer[0] = piece.cx + ux * cp - uy * sp;
    derivativeBuffer[1] = piece.cy + ux * sp + uy * cp;
    derivativeBuffer[2] = vx * cp - vy * sp;
    derivativeBuffer[3] = vx * sp + vy * cp;
    derivativeBuffer[4] = -(ux * cp - uy * sp);
    derivativeBuffer[5] = -(ux * sp + uy * cp);
}

/**
 * Writes the point and first two derivatives of a cubic at a parameter into
 * {@link derivativeBuffer}
 *
 * @param piece the cubic piece
 * @param t the parameter to evaluate at
 */
function cubicDerivatives(piece: CubicPiece, t: number): void {
    const { q0, q1, q2, q3 } = piece;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    derivativeBuffer[0] = a * q0.x + b * q1.x + c * q2.x + d * q3.x;
    derivativeBuffer[1] = a * q0.y + b * q1.y + c * q2.y + d * q3.y;
    derivativeBuffer[2] = 3 * (mt * mt * (q1.x - q0.x) + 2 * mt * t * (q2.x - q1.x) + t * t * (q3.x - q2.x));
    derivativeBuffer[3] = 3 * (mt * mt * (q1.y - q0.y) + 2 * mt * t * (q2.y - q1.y) + t * t * (q3.y - q2.y));
    derivativeBuffer[4] = 6 * (mt * (q2.x - 2 * q1.x + q0.x) + t * (q3.x - 2 * q2.x + q1.x));
    derivativeBuffer[5] = 6 * (mt * (q2.y - 2 * q1.y + q0.y) + t * (q3.y - 2 * q2.y + q1.y));
}

/**
 * Writes the point and first two derivatives of whichever kind of curve a piece is into
 * {@link derivativeBuffer}
 *
 * @param piece the curved piece
 * @param t the parameter to evaluate at
 */
function curveDerivatives(piece: CurvePiece, t: number): void {
    if (piece.kind === "arc") {
        arcDerivatives(piece, t);
    } else {
        cubicDerivatives(piece, t);
    }
}

/**
 * The sweep direction of a curved piece, so its normal points the same way the whole path's does
 *
 * @param piece the curved piece
 * @returns 1 if the parameter increases along the piece, -1 if it decreases
 */
function arcSign(piece: CurvePiece): number {
    return piece.t1 >= piece.t0 ? 1 : -1;
}

/**
 * Writes a point on the offset of an arc piece by a signed distance into a buffer, from the
 * derivatives {@link curveDerivatives} has already left in {@link derivativeBuffer}
 *
 * @param sign the sweep direction of the piece
 * @param d the signed offset distance
 * @param out the buffer to write into
 * @param at the index to write the x coordinate at, with the y coordinate after it
 */
function offsetFromDerivatives(sign: number, d: number, out: Float64Array, at: number): void {
    const d1x = derivativeBuffer[2];
    const d1y = derivativeBuffer[3];
    const length = Math.hypot(d1x, d1y) || 1;
    const s = (d * sign) / length;
    out[at] = derivativeBuffer[0] - s * d1y;
    out[at + 1] = derivativeBuffer[1] + s * d1x;
}

/**
 * The derivative in `t` of the height of an arc piece's offset, for the Newton in
 * {@link offsetXAtHeight}, from the derivatives {@link curveDerivatives} has already left in
 * {@link derivativeBuffer}
 *
 * @param sign the sweep direction of the piece
 * @param d the signed offset distance
 * @returns the derivative of the offset's y coordinate
 */
function heightDerivativeFromDerivatives(sign: number, d: number): number {
    const d1x = derivativeBuffer[2];
    const d1y = derivativeBuffer[3];
    const d2x = derivativeBuffer[4];
    const d2y = derivativeBuffer[5];
    const length2 = d1x * d1x + d1y * d1y;
    const length = Math.sqrt(length2) || 1;
    const dLength = (d1x * d2x + d1y * d2y) / length;
    return d1y + d * sign * ((d2x * length - d1x * dLength) / (length2 || 1));
}

/**
 * Where a piece begins or ends, taken from the value it was built with rather than recomputed from
 * its parameter.
 *
 * A piece *ends where it says it ends*. Recomputing that from the parameter is off by an ulp or two
 * — `sin(±π)` is not zero — and the two pieces meeting there disagree about which side of their
 * shared corner it falls on. At the one height where that matters, the corner's own, both then read
 * the corner as outside themselves and the crossing vanishes: the outline appears to have no left
 * edge, and a shape as ordinary as an ellipse reports no free space at all across its middle. The
 * flattened outline never had the problem because two chords share one vertex; here it has to be
 * pinned back in.
 *
 * @param piece the piece
 * @param u the end to take, 0 or 1
 * @returns the point the piece begins or ends at
 */
function endpoint(piece: Piece, u: number): Pt {
    return u === 0 ? piece.p0 : piece.p1;
}

/**
 * Writes a point on the offset of a piece at one of its ends into a buffer, without building a
 * point for it. This is {@link offsetPoint} at an end, and it is what fills a piece's
 * {@link StrokeCache}, from which every later query reads instead.
 *
 * @param piece the piece
 * @param u the end to take, 0 or 1
 * @param d the signed offset distance
 * @param out the buffer to write into
 * @param at the index to write the x coordinate at, with the y coordinate after it
 */
function offsetCornerInto(piece: Piece, u: number, d: number, out: Float64Array, at: number): void {
    const base = u === 0 ? piece.p0 : piece.p1;
    if (piece.kind === "line") {
        out[at] = base.x + d * piece.nx;
        out[at + 1] = base.y + d * piece.ny;
        return;
    }
    if (d === 0) {
        out[at] = base.x;
        out[at + 1] = base.y;
        return;
    }
    curveDerivatives(piece, u === 0 ? piece.t0 : piece.t1);
    const d1x = derivativeBuffer[2];
    const d1y = derivativeBuffer[3];
    const length = Math.hypot(d1x, d1y) || 1;
    const s = (d * arcSign(piece)) / length;
    out[at] = base.x - s * d1y;
    out[at + 1] = base.y + s * d1x;
}

/**
 * Fills a *circular* arc's {@link ArcPiece.branches}, from which its offsets are inverted outright
 * rather than searched for.
 *
 * Every normal of a circle points at its center, so a circular arc offset by `d` is the concentric
 * circle of radius `r - d` — and a circle is the one curve here whose height inverts in closed form:
 * `x = cx ± √(r'² - (y - cy)²)`. The rotation drops out with it, a circle having none to speak of.
 * Which of the two signs is the piece's is settled once, here, rather than at every query: the
 * pieces are cut so that neither coordinate turns inside one, so the side a piece runs on is the
 * side its midpoint runs on. An offset that turns the radius negative — a corner rounded tighter
 * than half the stroke is wide — is the same circle walked the other way round, and only flips that
 * sign.
 *
 * This is what a rounded corner, a stadium's end and a circle are made of, which is three arcs in
 * five across the sample diagrams, and it replaces five or six evaluations of the arc with one
 * square root. An *ellipse's* offset is no ellipse and has no closed form to find, so it keeps the
 * Newton.
 *
 * The closed form is also the more accurate of the two. The Newton is asked for heights right up
 * against a piece's end, and that is where an arc's height flattens out against its parameter, so
 * the last digits of the height say very little about the parameter; measured against an analytic
 * circle it comes out good to some `1e-12` px, where the closed form is exact to the last ulp.
 *
 * @param piece the arc to prepare
 * @param half the stroke half-width
 */
function prepareArcBranches(piece: ArcPiece, half: number): void {
    const branches = piece.branches;
    const sign = arcSign(piece);
    const side = Math.cos(piece.mid + piece.phi) >= 0 ? 1 : -1;
    for (let slot = 0; slot < 3; slot++) {
        const at = slot * 2;
        branches[at] = 0;
        branches[at + 1] = 0;
        if (piece.rx !== piece.ry) {
            continue;
        }
        const radius = piece.rx - (slot - 1) * half * sign;
        if (radius === 0) {
            continue;
        }
        branches[at] = radius > 0 ? side : -side;
        branches[at + 1] = Math.abs(radius);
    }
}

/**
 * Fills a piece's {@link StrokeCache}: where its three offsets begin and end, and the extent of the
 * ribbon the outer two bound.
 *
 * @param piece the piece to prepare
 * @param half the stroke half-width
 */
function prepareStroke(piece: Piece, half: number): void {
    if (piece.kind === "arc") {
        prepareArcBranches(piece, half);
    }
    const ends = piece.ends;
    let top = Infinity;
    let bottom = -Infinity;
    for (let u = 0; u < 2; u++) {
        const at = u * 6;
        offsetCornerInto(piece, u, -half, ends, at);
        offsetCornerInto(piece, u, 0, ends, at + 2);
        offsetCornerInto(piece, u, half, ends, at + 4);
        top = Math.min(top, ends[at + 1], ends[at + 5]);
        bottom = Math.max(bottom, ends[at + 1], ends[at + 5]);
    }
    piece.ribbonTop = top;
    piece.ribbonBottom = bottom;
}

/**
 * A point on the offset of a piece by a signed distance. At either end the base point is the pinned
 * one, so neighbouring pieces agree on the corner they share exactly, see {@link endpoint}.
 *
 * @param piece the piece
 * @param u the position along the piece, between 0 and 1
 * @param d the signed offset distance
 * @returns the point on the offset
 */
function offsetPoint(piece: Piece, u: number, d: number): Pt {
    if (piece.kind === "line") {
        return {
            x: piece.x0 + u * (piece.x1 - piece.x0) + d * piece.nx,
            y: piece.y0 + u * (piece.y1 - piece.y0) + d * piece.ny
        };
    }
    if (u !== 0 && u !== 1) {
        curveDerivatives(piece, piece.t0 + u * (piece.t1 - piece.t0));
        offsetFromDerivatives(arcSign(piece), d, pointBuffer, 0);
        return { x: pointBuffer[0], y: pointBuffer[1] };
    }
    offsetCornerInto(piece, u, d, pointBuffer, 0);
    return { x: pointBuffer[0], y: pointBuffer[1] };
}

/**
 * Where the offset of a piece by a signed distance crosses a height, or undefined if it does not
 * reach that far. The piece is monotone in y, so there is at most one crossing and a Newton kept
 * inside its bracket cannot walk off to another branch.
 *
 * @param piece the piece
 * @param d the signed offset distance
 * @param y the height to cross
 * @returns the x coordinate of the crossing, or undefined
 */
function offsetXAtHeight(piece: Piece, d: number, y: number): number | undefined {
    const ends = piece.ends;
    const at = d < 0 ? 0 : d > 0 ? 4 : 2;
    const startX = ends[at];
    const startY = ends[at + 1];
    const endX = ends[at + 6];
    const endY = ends[at + 7];
    if (y < Math.min(startY, endY) - RANGE_EPSILON || y > Math.max(startY, endY) + RANGE_EPSILON) {
        return undefined;
    }
    if (piece.kind === "line") {
        if (Math.abs(endY - startY) < EPSILON) {
            return startX;
        }
        return startX + ((y - startY) / (endY - startY)) * (endX - startX);
    }
    return curveXAtHeight(piece, d, y, startY, endY);
}

/**
 * Where the offset of a curved piece crosses a height. A circle's offset is inverted outright, see
 * {@link prepareArcBranches}; the rest — an ellipse and every cubic — go to a Newton kept inside the
 * piece's own parameter range. Split out from {@link offsetXAtHeight} so that the closed-form answer
 * a straight piece has stays small enough to be worth inlining into the loops that ask for it.
 *
 * @param piece the curved piece
 * @param d the signed offset distance
 * @param y the height to cross
 * @param startY the height the offset begins at
 * @param endY the height the offset ends at
 * @returns the x coordinate of the crossing
 */
function curveXAtHeight(piece: CurvePiece, d: number, y: number, startY: number, endY: number): number {
    if (piece.kind === "arc") {
        const at = (d < 0 ? 0 : d > 0 ? 2 : 1) * 2;
        const reach = piece.branches[at + 1];
        if (reach > 0) {
            const k = y - piece.cy;
            const inside = (reach - k) * (reach + k);
            return piece.cx + piece.branches[at] * (inside > 0 ? Math.sqrt(inside) : 0);
        }
    }
    const sign = arcSign(piece);
    const rising = endY > startY;
    let low = Math.min(piece.t0, piece.t1);
    let high = Math.max(piece.t0, piece.t1);
    let t = piece.t0 + ((piece.t1 - piece.t0) * (y - startY)) / (endY - startY || 1);
    let evaluatedAt = Number.NaN;
    for (let step = 0; step < NEWTON_STEPS; step++) {
        curveDerivatives(piece, t);
        evaluatedAt = t;
        const d1x = derivativeBuffer[2];
        const d1y = derivativeBuffer[3];
        const s = (d * sign) / (Math.hypot(d1x, d1y) || 1);
        const residual = derivativeBuffer[1] + s * d1x - y;
        if (Math.abs(residual) < 1e-13) {
            break;
        }
        if (rising === residual < 0) {
            low = Math.max(low, Math.min(t, high));
        } else {
            high = Math.min(high, Math.max(t, low));
        }
        const slope = heightDerivativeFromDerivatives(sign, d);
        let next = Math.abs(slope) > EPSILON ? t - residual / slope : 0.5 * (low + high);
        if (!(next > low && next < high)) {
            next = 0.5 * (low + high);
        }
        if (Math.abs(next - t) < 1e-15) {
            t = next;
            break;
        }
        t = next;
    }
    if (t !== evaluatedAt) {
        curveDerivatives(piece, t);
    }
    offsetFromDerivatives(sign, d, pointBuffer, 0);
    return pointBuffer[0];
}

/**
 * The parameters at which an arc's offset by `half` folds back on itself, which is where
 * `1 - d·κ` changes sign. For an ellipse `κ` depends only on `rx²sin²t + ry²cos²t`, so the
 * condition solves in closed form for `sin²t`.
 *
 * @param rx the radius along the ellipse's x-axis
 * @param ry the radius along the ellipse's y-axis
 * @param half the offset distance
 * @returns the parameters in `[0, 2π)` at which the offset folds
 */
function cuspParameters(rx: number, ry: number, half: number): number[] {
    if (half <= 0 || Math.abs(rx - ry) < EPSILON) {
        return [];
    }
    const target = Math.cbrt(half * rx * ry) ** 2;
    const share = (target - ry * ry) / (rx * rx - ry * ry);
    if (!(share >= 0 && share <= 1)) {
        return [];
    }
    const base = Math.asin(Math.sqrt(share));
    return [base, Math.PI - base, Math.PI + base, 2 * Math.PI - base];
}

/**
 * Cuts an arc at every parameter where it or one of its offsets stops being monotone: the two
 * axis-aligned tangents of each axis, and the folds of {@link cuspParameters}.
 *
 * @param cx the x coordinate of the center
 * @param cy the y coordinate of the center
 * @param rx the radius along the ellipse's x-axis
 * @param ry the radius along the ellipse's y-axis
 * @param phi the x-axis rotation in radians
 * @param t0 the parameter the arc starts at
 * @param t1 the parameter the arc ends at
 * @param half the stroke half-width the offsets are taken at
 * @param from the point the arc starts at, as authored
 * @param to the point the arc ends at, as authored
 * @returns the monotone pieces, in order
 */
function splitArc(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    phi: number,
    t0: number,
    t1: number,
    half: number,
    from: Pt,
    to: Pt
): ArcPiece[] {
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    /**
     * Where `x'(t)` and `y'(t)` vanish, each a pair of parameters a half turn apart, together with
     * the folds
     */
    const seeds = [Math.atan2(-ry * sp, rx * cp), Math.atan2(ry * cp, rx * sp), ...cuspParameters(rx, ry, half)];
    const forward = t1 >= t0;
    const low = Math.min(t0, t1);
    const high = Math.max(t0, t1);
    const stops = [t0, t1];
    for (const seed of seeds) {
        /*
         * Walk the whole covered range in half turns, the period both conditions share.
         */
        const first = seed + Math.PI * Math.ceil((low - seed) / Math.PI);
        for (let t = first; t < high - EPSILON; t += Math.PI) {
            if (t > low + EPSILON) {
                stops.push(t);
            }
        }
    }
    stops.sort((a, b) => (forward ? a - b : b - a));
    const kept = [stops[0]];
    for (let i = 1; i < stops.length; i++) {
        if (Math.abs(stops[i] - kept[kept.length - 1]) > EPSILON) {
            kept.push(stops[i]);
        }
    }
    /**
     * The point each stop falls at. The arc's own ends are pinned to what it was authored with, and
     * each interior stop is evaluated once and shared by the two pieces that meet there, so no
     * corner has two values.
     */
    const points: Pt[] = kept.map((t, i) => {
        if (i === 0) {
            return from;
        }
        if (i === kept.length - 1) {
            return to;
        }
        const ux = rx * Math.cos(t);
        const uy = ry * Math.sin(t);
        return { x: cx + ux * cp - uy * sp, y: cy + ux * sp + uy * cp };
    });
    const pieces: ArcPiece[] = [];
    for (let i = 0; i + 1 < kept.length; i++) {
        pieces.push({
            ends: new Float64Array(12),
            ribbonTop: 0,
            ribbonBottom: 0,
            kind: "arc",
            cx,
            cy,
            rx,
            ry,
            phi,
            cosPhi: cp,
            sinPhi: sp,
            branches: new Float64Array(6),
            mid: 0.5 * (kept[i] + kept[i + 1]),
            t0: kept[i],
            t1: kept[i + 1],
            p0: points[i],
            p1: points[i + 1]
        });
    }
    return pieces;
}

/**
 * Levels of subdivision {@link splitCubic} may spend proving a piece fold-free before giving up on
 * it and blocking it by its bounding box instead
 */
const FOLD_DEPTH = 8;

/**
 * Extra pieces the fold subdivision may create across one shape, all told.
 *
 * Subdividing to isolate a fold is what keeps the rest of a curve exact, and for anything but a
 * curve bending tighter than its stroke is wide it stops immediately. A shape built entirely of
 * such curves would otherwise be free to produce pieces — and so slab boundaries — without limit,
 * and {@link bestContentBox} walks pairs of slabs. Past this budget the remaining pieces simply
 * keep their fold, which costs sharpness and never safety.
 */
const FOLD_BUDGET = 480;

/**
 * Whether a cubic's offsets by `half` provably cannot fold back on themselves.
 *
 * An offset folds where `1 - d·κ` changes sign, so the piece has to be cut there for its offsets to
 * stay monotone. An ellipse's fold parameters come out in closed form; a cubic's are the roots of a
 * degree-12 polynomial, which is where the exact treatment of Béziers used to stop.
 *
 * It does not have to be solved. All that is needed is to *rule the fold out*, and curvature is
 * easy to bound from the control points: `κ = |c' × c''| / |c'|³ ≤ |c''| / |c'|²`, with `max|c''|`
 * taken over the hodograph's own control points and `min|c'|` from projecting them on their average
 * direction — both sound by the convex hull property. Where the bound is inconclusive the piece is
 * halved and each half asked again, and since the bound tightens quadratically under subdivision
 * this settles almost at once for any curve whose radius of curvature clears the stroke. Only a
 * curve that genuinely folds — one bending tighter than the stroke is wide — keeps failing, and
 * that piece is then blocked by its bounding box, which over-blocks rather than under-blocks.
 *
 * @param q0 the first control point
 * @param q1 the second control point
 * @param q2 the third control point
 * @param q3 the fourth control point
 * @param half the stroke half-width the offsets are taken at
 * @returns true if no offset of the piece can fold
 */
function foldFree(q0: Pt, q1: Pt, q2: Pt, q3: Pt, half: number): boolean {
    if (half <= 0) {
        return true;
    }
    const v0 = { x: 3 * (q1.x - q0.x), y: 3 * (q1.y - q0.y) };
    const v1 = { x: 3 * (q2.x - q1.x), y: 3 * (q2.y - q1.y) };
    const v2 = { x: 3 * (q3.x - q2.x), y: 3 * (q3.y - q2.y) };
    const sumX = v0.x + v1.x + v2.x;
    const sumY = v0.y + v1.y + v2.y;
    const length = Math.hypot(sumX, sumY);
    if (length < EPSILON) {
        return false;
    }
    const ux = sumX / length;
    const uy = sumY / length;
    const speed = Math.min(v0.x * ux + v0.y * uy, v1.x * ux + v1.y * uy, v2.x * ux + v2.y * uy);
    if (!(speed > 0)) {
        return false;
    }
    const bend = Math.max(Math.hypot(v1.x - v0.x, v1.y - v0.y), Math.hypot(v2.x - v1.x, v2.y - v1.y)) * 2;
    return (half * bend) / (speed * speed) < 1;
}

/**
 * Splits a cubic at a parameter, by de Casteljau
 *
 * @param q the four control points
 * @param t the parameter to split at
 * @returns the control points of the two halves
 */
function splitAt(q: Pt[], t: number): [Pt[], Pt[]] {
    const lerp = (a: Pt, b: Pt): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const a0 = lerp(q[0], q[1]);
    const a1 = lerp(q[1], q[2]);
    const a2 = lerp(q[2], q[3]);
    const b0 = lerp(a0, a1);
    const b1 = lerp(a1, a2);
    const middle = lerp(b0, b1);
    return [
        [q[0], a0, b0, middle],
        [middle, b1, a2, q[3]]
    ];
}

/**
 * The parameters in `(0, 1)` at which a component of a cubic's derivative vanishes, which is where
 * the curve turns around in that axis
 *
 * @param c0 the component of the first control point
 * @param c1 the component of the second control point
 * @param c2 the component of the third control point
 * @param c3 the component of the fourth control point
 * @returns the parameters, in no particular order
 */
function turningPoints(c0: number, c1: number, c2: number, c3: number): number[] {
    const a = -c0 + 3 * c1 - 3 * c2 + c3;
    const b = 2 * (c0 - 2 * c1 + c2);
    const c = c1 - c0;
    const found: number[] = [];
    if (Math.abs(a) < EPSILON) {
        if (Math.abs(b) > EPSILON) {
            found.push(-c / b);
        }
    } else {
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
            const root = Math.sqrt(discriminant);
            found.push((-b + root) / (2 * a), (-b - root) / (2 * a));
        }
    }
    return found.filter((t) => t > EPSILON && t < 1 - EPSILON);
}

/**
 * Cuts a cubic into pieces that are monotone in both axes and whose offsets cannot fold: first at
 * the parameters where `x'` or `y'` vanishes, then by halving whatever {@link foldFree} will not
 * vouch for.
 *
 * Each split point is computed once and shared by the two pieces meeting there, and the run's ends
 * are pinned to the points the curve was authored with, for the reason {@link endpoint} gives.
 *
 * @param control the four control points
 * @param half the stroke half-width the offsets are taken at
 * @param from the point the curve starts at, as authored
 * @param to the point the curve ends at, as authored
 * @param budget how many more pieces the whole shape may spend isolating folds
 * @returns the pieces, in order
 */
function splitCubic(
    control: Pt[],
    half: number,
    from: Pt,
    to: Pt,
    budget: {
        /**
         * Extra pieces still available, decremented by every split taken
         */
        remaining: number;
    }
): CubicPiece[] {
    const stops = [
        ...turningPoints(control[0].x, control[1].x, control[2].x, control[3].x),
        ...turningPoints(control[0].y, control[1].y, control[2].y, control[3].y)
    ].sort((a, b) => a - b);
    let rest = control;
    let consumed = 0;
    const runs: Pt[][] = [];
    for (const stop of stops) {
        if (stop <= consumed + EPSILON || stop >= 1 - EPSILON) {
            continue;
        }
        const [head, tail] = splitAt(rest, (stop - consumed) / (1 - consumed));
        runs.push(head);
        rest = tail;
        consumed = stop;
    }
    runs.push(rest);

    const pieces: CubicPiece[] = [];
    const emit = (q: Pt[], depth: number): void => {
        const free = foldFree(q[0], q[1], q[2], q[3], half);
        if (!free && depth < FOLD_DEPTH && budget.remaining > 0) {
            budget.remaining--;
            const [head, tail] = splitAt(q, 0.5);
            emit(head, depth + 1);
            emit(tail, depth + 1);
            return;
        }
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const point of q) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        pieces.push({
            ends: new Float64Array(12),
            ribbonTop: 0,
            ribbonBottom: 0,
            kind: "cubic",
            q0: q[0],
            q1: q[1],
            q2: q[2],
            q3: q[3],
            t0: 0,
            t1: 1,
            p0: q[0],
            p1: q[3],
            folds: !free,
            minX,
            maxX,
            minY,
            maxY
        });
    };
    for (const run of runs) {
        emit(run, 0);
    }
    if (pieces.length > 0) {
        pieces[0] = { ...pieces[0], p0: from };
        pieces[pieces.length - 1] = { ...pieces[pieces.length - 1], p1: to };
    }
    return pieces;
}

/**
 * Converts an SVG arc from its endpoint parametrisation to the center one, following the
 * implementation notes of the SVG specification: out-of-range radii are scaled up until the
 * endpoints are reachable, and the center is picked by the two flags.
 *
 * @param x0 the x coordinate the arc starts at
 * @param y0 the y coordinate the arc starts at
 * @param rx the radius along the ellipse's x-axis
 * @param ry the radius along the ellipse's y-axis
 * @param rotation the x-axis rotation in degrees
 * @param largeArc whether the arc takes the long way around
 * @param sweep the direction the arc is swept in
 * @param x1 the x coordinate the arc ends at
 * @param y1 the y coordinate the arc ends at
 * @returns the center parametrisation of the arc
 */
function arcCenter(
    x0: number,
    y0: number,
    rx: number,
    ry: number,
    rotation: number,
    largeArc: number,
    sweep: number,
    x1: number,
    y1: number
): {
    /**
     * The x coordinate of the center
     */
    cx: number;
    /**
     * The y coordinate of the center
     */
    cy: number;
    /**
     * The radius along the ellipse's x-axis
     */
    rx: number;
    /**
     * The radius along the ellipse's y-axis
     */
    ry: number;
    /**
     * The x-axis rotation in radians
     */
    phi: number;
    /**
     * The parameter the arc starts at
     */
    t0: number;
    /**
     * The parameter the arc ends at
     */
    t1: number;
} {
    const phi = (rotation * Math.PI) / 180;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    let ax = Math.abs(rx);
    let ay = Math.abs(ry);
    const dx = (x0 - x1) / 2;
    const dy = (y0 - y1) / 2;
    const px = cp * dx + sp * dy;
    const py = -sp * dx + cp * dy;
    const oversized = (px * px) / (ax * ax) + (py * py) / (ay * ay);
    if (oversized > 1) {
        const grow = Math.sqrt(oversized);
        ax *= grow;
        ay *= grow;
    }
    const sign = largeArc === sweep ? -1 : 1;
    const numerator = ax * ax * ay * ay - ax * ax * py * py - ay * ay * px * px;
    const denominator = ax * ax * py * py + ay * ay * px * px;
    const scale = sign * Math.sqrt(Math.max(0, numerator / denominator));
    const qx = (scale * ax * py) / ay;
    const qy = (-scale * ay * px) / ax;
    const cx = cp * qx - sp * qy + (x0 + x1) / 2;
    const cy = sp * qx + cp * qy + (y0 + y1) / 2;
    const t0 = Math.atan2((py - qy) / ay, (px - qx) / ax);
    const t1 = Math.atan2((-py - qy) / ay, (-px - qx) / ax);
    let sweptBy = t1 - t0;
    if (sweep === 1 && sweptBy < 0) {
        sweptBy += 2 * Math.PI;
    }
    if (sweep === 0 && sweptBy > 0) {
        sweptBy -= 2 * Math.PI;
    }
    return { cx, cy, rx: ax, ry: ay, phi, t0, t1: t0 + sweptBy };
}

/**
 * Whether a piece of stroke material only *touches* a height rather than reaching through it, in
 * which case it blocks nothing there — content that comes exactly up to the edge of the stroke is
 * still clear of it. That convention is what makes {@link ExactRegion.top} and
 * {@link ExactRegion.bottom}, which sit exactly a half-width inside the outline, usable at all.
 *
 * @param min the top of the material's extent
 * @param max the bottom of the material's extent
 * @param y the height being measured
 * @returns true if the material does not reach through the height
 */
function onlyTouches(min: number, max: number, y: number): boolean {
    return max <= y + TOUCH_EPSILON || min >= y - TOUCH_EPSILON;
}

/**
 * Adds the x-span the stroked ribbon of one piece covers at a height. A monotone piece sweeps its
 * disc along a curve that never doubles back, so the swept material meets the height in a single
 * interval and the interval's ends are the outermost of where the ribbon's own boundary — the two
 * offsets and the two flat ends, each running from one offset to the other across the piece's own
 * end — crosses that height. Both offsets being monotone in y is also what puts the ribbon's whole
 * extent at its four corners, and so in the piece's {@link StrokeCache}.
 *
 * A piece that folds is the exception: its offsets double back, so nothing can be read off them.
 * The box it lives in is all that can be said, and saying too much here only ever costs content
 * room.
 *
 * @param piece the piece to measure
 * @param half the stroke half-width
 * @param y the height to measure at
 * @param spans the spans collected so far, appended to as `lo, hi`
 */
function addRibbonSpan(piece: Piece, half: number, y: number, spans: Float64Array, at: number): void {
    if (piece.kind === "cubic" && piece.folds) {
        if (onlyTouches(piece.minY - half, piece.maxY + half, y)) {
            spans[at] = Infinity;
            spans[at + 1] = -Infinity;
        } else {
            spans[at] = piece.minX - half;
            spans[at + 1] = piece.maxX + half;
        }
        return;
    }
    if (onlyTouches(piece.ribbonTop, piece.ribbonBottom, y)) {
        spans[at] = Infinity;
        spans[at + 1] = -Infinity;
        return;
    }
    const ends = piece.ends;
    let lo = Infinity;
    let hi = -Infinity;
    for (let at = 0; at < 12; at += 6) {
        const ax = ends[at];
        const ay = ends[at + 1];
        const bx = ends[at + 4];
        const by = ends[at + 5];
        if ((y >= ay && y <= by) || (y >= by && y <= ay)) {
            const share = Math.abs(by - ay) < EPSILON ? 0 : (y - ay) / (by - ay);
            const x = ax + share * (bx - ax);
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
    }
    for (let side = 0; side < 2; side++) {
        const x = offsetXAtHeight(piece, side === 0 ? -half : half, y);
        if (x != undefined) {
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
    }
    spans[at] = hi > lo ? lo : Infinity;
    spans[at + 1] = hi > lo ? hi : -Infinity;
}

/**
 * Writes the x-span a disc covers at a height into its slot
 *
 * @param disc the disc to measure
 * @param y the height to measure at
 * @param spans the blocked spans of this height
 * @param at the slot to write the span into
 */
function addDiscSpan(disc: Disc, y: number, spans: Float64Array, at: number): void {
    const dy = Math.abs(y - disc.cy);
    if (onlyTouches(disc.cy - disc.r, disc.cy + disc.r, y) || dy >= disc.r) {
        spans[at] = Infinity;
        spans[at + 1] = -Infinity;
        return;
    }
    const reach = Math.sqrt(disc.r * disc.r - dy * dy);
    spans[at] = disc.cx - reach;
    spans[at + 1] = disc.cx + reach;
}

/**
 * Adds the x-span a convex patch covers at a height
 *
 * @param patch the patch to measure
 * @param y the height to measure at
 * @param spans the spans collected so far, appended to as `lo, hi`
 */
function addPatchSpan(patch: Patch, y: number, spans: Float64Array, at: number): void {
    if (onlyTouches(patch.minY, patch.maxY, y)) {
        spans[at] = Infinity;
        spans[at + 1] = -Infinity;
        return;
    }
    let lo = Infinity;
    let hi = -Infinity;
    const pts = patch.pts;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a.y <= y && b.y >= y) || (b.y <= y && a.y >= y)) {
            const share = Math.abs(b.y - a.y) < EPSILON ? 0 : (y - a.y) / (b.y - a.y);
            const x = a.x + share * (b.x - a.x);
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
    }
    spans[at] = hi > lo ? lo : Infinity;
    spans[at + 1] = hi > lo ? hi : -Infinity;
}

/**
 * The free region of one shape, measured on true segments
 */
class Region implements ExactRegion {
    /**
     * Top of the region, where a content edge can first sit
     */
    readonly top: number;
    /**
     * Bottom of the region, where a content edge can last sit
     */
    readonly bottom: number;
    /**
     * The heights at which a band's binding constraint can change: every piece's ends, and the
     * ends of both of its offsets, plus the extremes of the joins and caps. Between two of them
     * the region's boundary is smooth and monotone, so a band that clears its own edges and every
     * candidate it spans clears everything in between.
     */
    readonly candidates: number[];
    /**
     * Scratch buffer for the outline crossings of one height
     */
    private readonly crossings: number[] = [];
    /**
     * Scratch buffer for the blocked spans of a whole slab, one slot per blocker
     */
    private readonly blocked: Float64Array;
    /**
     * The two scratch slots {@link sample} writes a moving band edge into
     */
    private readonly slots: Sample[];
    /**
     * The height each scratch slot currently holds, so a slot that is asked for what it already has
     * answers from it, see {@link sample}
     */
    private readonly slotHeights: number[] = [Number.NaN, Number.NaN];
    /**
     * The heights worth keeping a measurement of: the slab boundaries, which every band inside a
     * slab shares
     */
    private readonly boundaryHeights = new Set<number>();
    /**
     * The kept measurements, by height
     */
    private readonly boundaries = new Map<number, Sample>();
    /**
     * Scratch buffer for the intersection of a slab's two interiors
     */
    private readonly scratchC: number[] = [];
    /**
     * Scratch buffer for the runs accumulated across a band's slabs
     */
    private readonly scratchD: number[] = [];
    /**
     * Scratch buffer for the runs of the slab being folded in
     */
    private readonly scratchE: number[] = [];
    /**
     * Scratch buffer for the running intersection of a band's slabs
     */
    private readonly scratchF: number[] = [];
    /**
     * Scratch buffer for the runs {@link measure} picks from
     */
    private readonly scratchG: number[] = [];

    /**
     * Creates a region from the pieces of a shape and its stroke material
     *
     * @param pieces every monotone piece of the outline and the decorations
     * @param outline the pieces the outline itself is made of, which bound the interior
     * @param discs the round joins and caps
     * @param patches the miter and bevel wedges and the square caps
     * @param half the stroke half-width
     */
    constructor(
        private readonly pieces: Piece[],
        private readonly outline: Piece[],
        private readonly discs: Disc[],
        private readonly patches: Patch[],
        private readonly half: number
    ) {
        const slots = 2 * (pieces.length + discs.length + patches.length);
        this.blocked = new Float64Array(slots);
        this.slots = [
            { interior: [], blocked: new Float64Array(slots) },
            { interior: [], blocked: new Float64Array(slots) }
        ];
        for (const piece of pieces) {
            prepareStroke(piece, half);
        }
        let minY = Infinity;
        let maxY = -Infinity;
        for (const piece of outline) {
            minY = Math.min(minY, piece.p0.y, piece.p1.y);
            maxY = Math.max(maxY, piece.p0.y, piece.p1.y);
        }
        this.top = minY + half;
        this.bottom = maxY - half;
        const heights = new Set<number>();
        const distances = [-half, 0, half];
        for (const piece of pieces) {
            for (const d of distances) {
                for (let u = 0; u < 2; u++) {
                    heights.add(offsetPoint(piece, u, d).y);
                }
            }
            if (piece.kind === "cubic" && piece.folds) {
                heights.add(piece.minY - half);
                heights.add(piece.maxY + half);
            }
        }
        for (const disc of discs) {
            heights.add(disc.cy - disc.r);
            heights.add(disc.cy);
            heights.add(disc.cy + disc.r);
        }
        for (const patch of patches) {
            for (const p of patch.pts) {
                heights.add(p.y);
            }
        }
        this.candidates = [...heights]
            .filter((y) => y > this.top + RANGE_EPSILON && y < this.bottom - RANGE_EPSILON)
            .sort((a, b) => a - b);
        for (const y of this.candidates) {
            this.boundaryHeights.add(y);
        }
        this.boundaryHeights.add(this.top);
        this.boundaryHeights.add(this.bottom);
    }

    /**
     * The intervals the outline's interior covers at one height, appended to `out` as `lo, hi`
     * pairs in ascending order.
     *
     * The crossing test is half-open, so a vertex sitting exactly on the line is counted once and
     * the inside/outside alternation survives it. At the very top and bottom that leaves no
     * crossing at all, and there the extent of the pieces merely touching the height stands in.
     *
     * @param y the height to measure at
     * @param out the intervals collected so far, appended to
     */
    private interiorAt(y: number, out: number[]): void {
        const crossings = this.crossings;
        crossings.length = 0;
        let touchMin = Infinity;
        let touchMax = -Infinity;
        for (const piece of this.outline) {
            const a = endpoint(piece, 0);
            const b = endpoint(piece, 1);
            if ((a.y > y && b.y > y) || (a.y < y && b.y < y)) {
                continue;
            }
            const x = offsetXAtHeight(piece, 0, y);
            if (x == undefined) {
                continue;
            }
            touchMin = Math.min(touchMin, x);
            touchMax = Math.max(touchMax, x);
            if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
                crossings.push(x);
            }
        }
        if (crossings.length < 2) {
            if (touchMax > touchMin) {
                out.push(touchMin, touchMax);
            }
            return;
        }
        /*
         * A handful of entries at most, and this runs per piece per height, so the comparison
         * closure a general sort needs costs more than the sort itself.
         */
        for (let i = 1; i < crossings.length; i++) {
            const value = crossings[i];
            let j = i;
            while (j > 0 && crossings[j - 1] > value) {
                crossings[j] = crossings[j - 1];
                j--;
            }
            crossings[j] = value;
        }
        for (let i = 0; i + 1 < crossings.length; i += 2) {
            out.push(crossings[i], crossings[i + 1]);
        }
    }

    /**
     * Everything the stroke blocks at one height, appended to `out` as unsorted `lo, hi` pairs
     *
     * @param y the height to measure at
     * @param out the spans collected so far, appended to
     */
    private blockedAt(y: number, out: Float64Array): void {
        const pieces = this.pieces;
        const discs = this.discs;
        const patches = this.patches;
        let at = 0;
        for (let i = 0; i < pieces.length; i++, at += 2) {
            addRibbonSpan(pieces[i], this.half, y, out, at);
        }
        for (let i = 0; i < discs.length; i++, at += 2) {
            addDiscSpan(discs[i], y, out, at);
        }
        for (let i = 0; i < patches.length; i++, at += 2) {
            addPatchSpan(patches[i], y, out, at);
        }
    }

    /**
     * The free intervals of a band that lies within one slab — that is, one whose ends fall in the
     * same gap between two {@link candidates}, so that no piece begins or ends inside it.
     *
     * That restriction is what makes two evaluations enough. Every boundary bounding the band is a
     * single branch throughout, monotone in both axes, so
     * - the interior over the band is the *intersection* of the interiors at its two edges: a point
     *   inside at both is inside throughout, since leaving would mean crossing a boundary that has
     *   no room to turn back,
     * - a blocker over the band is the *union* of its spans at the two edges: its own edges move
     *   monotonically, so the material it sweeps is bounded by where it starts and where it ends.
     *
     * The union is the half that matters. Measuring a blocker only where it is sampled would let a
     * shallow diagonal stroke slip between two samples, sweeping clean across a run while sitting
     * outside it at both ends, and the band would be reported free where the stroke crosses it.
     *
     * Which two spans to unite is decided by position: every blocker reports at every height, empty
     * or not, so the two lists line up entry for entry. Without that fixed correspondence a blocker
     * that happened to be skipped at one end would shift every later one against its own
     * counterpart — which is how a shape's left wall came to be unioned with its right tip, blocking
     * the whole width of a slab that was in fact almost entirely free.
     *
     * @param ya the top of the band
     * @param yb the bottom of the band
     * @param out the runs collected so far, appended to as `lo, hi` pairs
     */
    private slabRuns(ya: number, yb: number, out: number[]): void {
        const a = this.sample(ya, 0);
        const b = yb > ya ? this.sample(yb, 1) : a;
        const interior = this.scratchC;
        if (a === b) {
            interior.length = 0;
            copyInto(a.interior, interior);
        } else {
            intersectRuns(a.interior, b.interior, interior);
        }
        if (interior.length === 0) {
            return;
        }
        let blocked = a.blocked;
        if (a !== b) {
            blocked = this.blocked;
            const first = a.blocked;
            const second = b.blocked;
            for (let i = 0; i < blocked.length; i += 2) {
                blocked[i] = Math.min(first[i], second[i]);
                blocked[i + 1] = Math.max(first[i + 1], second[i + 1]);
            }
        }
        subtractSpans(interior, blocked, out);
    }

    /**
     * The interior and the blocked spans at one height.
     *
     * A slab boundary is measured over and over — it is one end of every band the search tries
     * inside that slab — so the boundaries are kept for good, and the other end is written into one
     * of two scratch slots. That is most of what makes searching a band position affordable: only
     * half of each probe is new work.
     *
     * The slots hold on to the height they were last filled at, because the searches move one edge
     * of a band at a time: every probe of a band's bottom asks for the same top, which its slot
     * still has. The two ends keep to their own slot, so neither can be answered with the other's
     * measurement.
     *
     * @param y the height to sample
     * @param slot which scratch slot to use if the height is not a boundary, 0 or 1
     * @returns the interior and blocked spans, which the caller must not hold on to
     */
    private sample(y: number, slot: number): Sample {
        const cached = this.boundaries.get(y);
        if (cached != undefined) {
            return cached;
        }
        if (this.slotHeights[slot] === y) {
            return this.slots[slot];
        }
        const into = this.slots[slot];
        this.slotHeights[slot] = y;
        into.interior.length = 0;
        this.interiorAt(y, into.interior);
        this.blockedAt(y, into.blocked);
        if (this.boundaryHeights.has(y)) {
            const kept: Sample = { interior: [...into.interior], blocked: into.blocked.slice() };
            this.boundaries.set(y, kept);
            return kept;
        }
        return into;
    }

    /**
     * Every free interval of a band, see {@link ExactRegion.runs}. A band already measured is
     * answered from the table rather than measured again.
     *
     * Both searches move one edge of a band at a time and keep walking back over bands they have
     * already been to — a round of the coordinate ascent ends on the band the next one starts from,
     * the two starts of a cell converge towards each other, and the stops of the band search are
     * shared by the stretches on either side of them. Two queries in five are a repeat, and each one
     * saved is a whole height measured on every piece of the shape.
     *
     * The table is one shared set of flat arrays rather than a map per region, see
     * {@link BAND_SLOTS}, and a region takes it over by emptying it. Which costs whichever region
     * had it nothing, as they are searched one after another, and leaves nothing to allocate on the
     * way in — the `inner` solver builds a region per iteration and asks it a few dozen questions
     * before dropping it, and for that region what a cache allocates is the whole of what it costs.
     *
     * @param ya the top of the band
     * @param yb the bottom of the band
     * @param out the runs collected so far, appended to
     */
    runs(ya: number, yb: number, out: number[]): void {
        if (bandOwner !== this) {
            clearBands(this);
        }
        let slot = hashBand(ya, yb) & BAND_MASK;
        while (bandGenerations[slot] === bandGeneration) {
            if (bandTops[slot] === ya && bandBottoms[slot] === yb) {
                const start = bandStarts[slot];
                const end = start + bandCounts[slot];
                for (let i = start; i < end; i++) {
                    out.push(bandData[i]);
                }
                return;
            }
            slot = (slot + 1) & BAND_MASK;
        }
        const start = bandData.length;
        this.bandRuns(ya, yb, bandData);
        bandGenerations[slot] = bandGeneration;
        bandTops[slot] = ya;
        bandBottoms[slot] = yb;
        bandStarts[slot] = start;
        bandCounts[slot] = bandData.length - start;
        for (let i = start; i < bandData.length; i++) {
            out.push(bandData[i]);
        }
        bandTaken++;
        if (bandTaken * 8 > BAND_SLOTS * BAND_LOAD) {
            clearBands(this);
        }
    }

    /**
     * Measures every free interval of a band. A band that lies inside a single slab — which the
     * searches ask for far more often than any other, as they move one edge at a time within one —
     * is handed straight to {@link slabRuns}, with nothing to accumulate across.
     *
     * @param ya the top of the band
     * @param yb the bottom of the band
     * @param out the runs collected so far, appended to
     */
    private bandRuns(ya: number, yb: number, out: number[]): void {
        let index = lowerBound(this.candidates, ya);
        if (!(index < this.candidates.length && this.candidates[index] < yb)) {
            this.slabRuns(ya, yb, out);
            return;
        }
        const accumulated = this.scratchD;
        const slab = this.scratchE;
        accumulated.length = 0;
        let start = ya;
        let done = false;
        while (!done) {
            let end = yb;
            while (index < this.candidates.length && this.candidates[index] <= start) {
                index++;
            }
            if (index < this.candidates.length && this.candidates[index] < yb) {
                end = this.candidates[index];
                index++;
            } else {
                done = true;
            }
            slab.length = 0;
            this.slabRuns(start, end, slab);
            if (slab.length === 0) {
                return;
            }
            if (start === ya) {
                copyInto(slab, accumulated);
            } else {
                intersectRuns(accumulated, slab, this.scratchF);
                accumulated.length = 0;
                copyInto(this.scratchF, accumulated);
                if (accumulated.length === 0) {
                    return;
                }
            }
            start = end;
        }
        copyInto(accumulated, out);
    }

    /**
     * The free interval of the band between two heights, see {@link ExactRegion.measure}
     *
     * @param ya the top of the band
     * @param yb the bottom of the band
     * @param span filled with the interval that was found
     * @param around the x an interval has to contain, or undefined to take the widest one
     * @returns true if an interval was found, which is then left in `span`
     */
    measure(ya: number, yb: number, span: Span, around?: number): boolean {
        const found = this.scratchG;
        found.length = 0;
        this.runs(ya, yb, found);
        let bestWidth = 0;
        let ok = false;
        for (let i = 0; i < found.length; i += 2) {
            const lo = found[i];
            const hi = found[i + 1];
            if (around == undefined) {
                if (hi - lo > bestWidth) {
                    bestWidth = hi - lo;
                    span.min = lo;
                    span.max = hi;
                    ok = true;
                }
            } else if (lo <= around && hi >= around) {
                span.min = lo;
                span.max = hi;
                return true;
            }
        }
        return ok;
    }
}

/**
 * One height's worth of measurement: where the outline's interior is and what the stroke blocks
 */
interface Sample {
    /**
     * The interior intervals, ascending and disjoint, as `lo, hi` pairs
     */
    readonly interior: number[];
    /**
     * The blocked spans, one slot per blocker, as `lo, hi` pairs. A blocker that covers nothing at
     * this height still holds its slot, empty, because {@link Region.slabRuns} unites the two ends
     * of a slab slot for slot.
     */
    readonly blocked: Float64Array;
}

/**
 * Appends every entry of one list to another
 *
 * @param from the list to copy
 * @param to the list to append to
 */
function copyInto(from: number[], to: number[]): void {
    for (let i = 0; i < from.length; i++) {
        to.push(from[i]);
    }
}

/**
 * Intersects two ascending lists of disjoint intervals, held as `lo, hi` pairs
 *
 * @param a the first list
 * @param b the second list
 * @param out filled with the intersection, replacing whatever it held
 */
function intersectRuns(a: number[], b: number[], out: number[]): void {
    out.length = 0;
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        const lo = Math.max(a[i], b[j]);
        const hi = Math.min(a[i + 1], b[j + 1]);
        if (hi > lo) {
            out.push(lo, hi);
        }
        if (a[i + 1] < b[j + 1]) {
            i += 2;
        } else {
            j += 2;
        }
    }
}

/**
 * Subtracts a set of spans from an ascending list of disjoint intervals
 *
 * The spans are walked in order of where each starts, sorted by insertion for the same reason
 * {@link Region.interiorAt} sorts that way. The empty slots a blocker holds where it covers nothing
 * are dropped here: they only exist so the two ends of a slab line up slot for slot, which is no
 * concern of this.
 *
 * @param runs the intervals to subtract from, as ascending disjoint `lo, hi` pairs
 * @param spans the spans to subtract, one slot per blocker, as `lo, hi` pairs
 * @param out the remaining intervals, appended to as `lo, hi` pairs
 */
function subtractSpans(runs: number[], spans: Float64Array, out: number[]): void {
    const order = sortOrder;
    order.length = 0;
    for (let i = 0; i < spans.length; i += 2) {
        if (!(spans[i + 1] > spans[i])) {
            continue;
        }
        let j = order.length;
        order.push(i);
        while (j > 0 && spans[order[j - 1]] > spans[i]) {
            order[j] = order[j - 1];
            j--;
        }
        order[j] = i;
    }
    for (let i = 0; i < runs.length; i += 2) {
        let cursor = runs[i];
        const end = runs[i + 1];
        for (const at of order) {
            const lo = spans[at];
            const hi = spans[at + 1];
            if (hi <= cursor) {
                continue;
            }
            if (lo >= end) {
                break;
            }
            if (lo > cursor) {
                out.push(cursor, lo);
            }
            cursor = Math.max(cursor, hi);
            if (cursor >= end) {
                break;
            }
        }
        if (end > cursor) {
            out.push(cursor, end);
        }
    }
}

/**
 * The index of the first entry of an ascending list that is greater than a value
 *
 * @param values the ascending list to search
 * @param value the value to search for
 * @returns the index of the first entry greater than the value
 */
function lowerBound(values: readonly number[], value: number): number {
    let low = 0;
    let high = values.length;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (values[middle] > value) {
            high = middle;
        } else {
            low = middle + 1;
        }
    }
    return low;
}

/**
 * Adds the material a join covers on the outside of its turn: a disc for a round join, the quad up
 * to the miter tip for a miter within its limit, and the triangle between the two offset corners
 * otherwise. On the inside of the turn the two ribbons already overlap, which is why the wedge is
 * built from the outward normals. Where two pieces meet smoothly, which is every cut
 * {@link splitArc} makes, the turn is zero and nothing is added.
 *
 * @param v the corner the join sits at
 * @param d1 the unit direction the arriving piece ends with
 * @param d2 the unit direction the leaving piece starts with
 * @param stroke the stroke the shape is painted with
 * @param discs the round joins collected so far
 * @param patches the wedges collected so far
 */
function addJoin(v: Pt, d1: Pt, d2: Pt, stroke: ShapeStroke, discs: Disc[], patches: Patch[]): void {
    const half = stroke.width / 2;
    const cross = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cross) < EPSILON || half <= 0) {
        return;
    }
    if (stroke.lineJoin === LineJoin.Round) {
        discs.push({ cx: v.x, cy: v.y, r: half });
        return;
    }
    const s = cross > 0 ? 1 : -1;
    const p1 = { x: v.x + s * d1.y * half, y: v.y - s * d1.x * half };
    const p2 = { x: v.x + s * d2.y * half, y: v.y - s * d2.x * half };
    if (stroke.lineJoin === LineJoin.Miter) {
        const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / cross;
        const tip = { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
        const miter = Math.hypot(tip.x - v.x, tip.y - v.y);
        if (miter - half < JOIN_EPSILON) {
            return;
        }
        if (miter <= stroke.miterLimit * half + EPSILON) {
            patches.push(patchOf([v, p1, tip, p2]));
            return;
        }
    }
    patches.push(patchOf([v, p1, p2]));
}

/**
 * The unit tangent at one end of a piece
 *
 * @param piece the piece
 * @param u the end to take it at, 0 or 1
 * @returns the unit tangent, pointing along the piece
 */
function tangent(piece: Piece, u: number): Pt {
    if (piece.kind === "line") {
        const dx = piece.x1 - piece.x0;
        const dy = piece.y1 - piece.y0;
        const length = Math.hypot(dx, dy) || 1;
        return { x: dx / length, y: dy / length };
    }
    curveDerivatives(piece, piece.t0 + u * (piece.t1 - piece.t0));
    const d1x = derivativeBuffer[2];
    const d1y = derivativeBuffer[3];
    const sign = arcSign(piece);
    const length = Math.hypot(d1x, d1y) || 1;
    return { x: (sign * d1x) / length, y: (sign * d1y) / length };
}

/**
 * A sink cutting a walked sub-path into monotone pieces, and collecting the joins and caps its
 * stroke adds once the walk is done.
 *
 * This is the one place a shape turns into geometry. The layout walks its vertices straight in
 * ({@link buildExactRegion}), and the divider, which is handed a path that has already been
 * rendered, walks the string it was given ({@link buildExactRegionFromPath}) — both through the same
 * sink, so neither can measure a shape on an outline the other would not have drawn.
 */
class PieceSink implements SubPathSink {
    /**
     * The pieces of each run. A decoration attribute is split into sub-paths before it gets here,
     * but a stray move must still start a new run rather than let a join bridge two strokes that
     * never meet.
     */
    private readonly runs: Piece[][] = [];
    /**
     * The pieces of the run being cut
     */
    private pieces: Piece[] = [];
    /**
     * The x coordinate the pen sits at
     */
    private penX = 0;
    /**
     * The y coordinate the pen sits at
     */
    private penY = 0;
    /**
     * The x coordinate the current run started at, which a close returns to
     */
    private startX = 0;
    /**
     * The y coordinate the current run started at, which a close returns to
     */
    private startY = 0;

    /**
     * Creates a sink cutting for one stroke
     *
     * @param half the stroke half-width
     * @param budget how many more pieces the whole shape may spend isolating folds
     */
    constructor(
        private readonly half: number,
        private readonly budget: {
            /**
             * Extra pieces still available for isolating folds
             */
            remaining: number;
        }
    ) {}

    moveTo(x: number, y: number): void {
        if (this.pieces.length > 0) {
            this.runs.push(this.pieces);
            this.pieces = [];
        }
        this.startX = x;
        this.startY = y;
        this.penX = x;
        this.penY = y;
    }

    lineTo(x: number, y: number): void {
        this.straight(x, y);
    }

    close(): void {
        this.straight(this.startX, this.startY);
    }

    arcTo(rx: number, ry: number, rotation: number, largeArc: 0 | 1, sweep: 0 | 1, x: number, y: number): void {
        if (rx < EPSILON || ry < EPSILON) {
            this.straight(x, y);
            return;
        }
        if (Math.hypot(x - this.penX, y - this.penY) > EPSILON) {
            const from = { x: this.penX, y: this.penY };
            const c = arcCenter(this.penX, this.penY, rx, ry, rotation, largeArc, sweep, x, y);
            this.pieces.push(...splitArc(c.cx, c.cy, c.rx, c.ry, c.phi, c.t0, c.t1, this.half, from, { x, y }));
        }
        this.penX = x;
        this.penY = y;
    }

    cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
        this.bezier(
            [
                { x: this.penX, y: this.penY },
                { x: c1x, y: c1y },
                { x: c2x, y: c2y },
                { x, y }
            ],
            x,
            y
        );
    }

    quadTo(c1x: number, c1y: number, x: number, y: number): void {
        const start = { x: this.penX, y: this.penY };
        const end = { x, y };
        /*
         * A quadratic raised to the cubic drawing exactly the same curve, so one code path covers
         * both — degree elevation is exact.
         */
        this.bezier(
            [
                start,
                { x: start.x + (2 / 3) * (c1x - start.x), y: start.y + (2 / 3) * (c1y - start.y) },
                { x: end.x + (2 / 3) * (c1x - end.x), y: end.y + (2 / 3) * (c1y - end.y) },
                end
            ],
            x,
            y
        );
    }

    /**
     * Adds a straight piece from the pen to a point, dropping one with no length at all, and moves
     * the pen there either way
     *
     * @param x the x coordinate to draw to
     * @param y the y coordinate to draw to
     */
    private straight(x: number, y: number): void {
        if (Math.hypot(x - this.penX, y - this.penY) > EPSILON) {
            this.pieces.push(linePiece(this.penX, this.penY, x, y));
        }
        this.penX = x;
        this.penY = y;
    }

    /**
     * Cuts a cubic into monotone pieces and moves the pen to its end
     *
     * @param control the four control points, starting at the pen
     * @param x the x coordinate the curve ends at
     * @param y the y coordinate the curve ends at
     */
    private bezier(control: Pt[], x: number, y: number): void {
        const start = control[0];
        /*
         * A curve that comes back to where it started is a loop, not a nothing, so it is the control
         * polygon rather than the endpoints that decides whether it exists.
         */
        const spread = control.reduce(
            (far, point) => Math.max(far, Math.hypot(point.x - start.x, point.y - start.y)),
            0
        );
        if (spread > EPSILON) {
            this.pieces.push(...splitCubic(control, this.half, start, { x, y }, this.budget));
        }
        this.penX = x;
        this.penY = y;
    }

    /**
     * Hands over everything the walk cut, adding the joins between neighbouring pieces and the caps
     * at the ends of an open run
     *
     * @param closed whether the sub-path closes back to its first point
     * @param stroke the stroke the shape is painted with
     * @param into the pieces collected so far
     * @param discs the round joins and caps collected so far
     * @param patches the wedges and square caps collected so far
     */
    finish(closed: boolean, stroke: ShapeStroke, into: Piece[], discs: Disc[], patches: Patch[]): void {
        if (this.pieces.length > 0) {
            this.runs.push(this.pieces);
            this.pieces = [];
        }
        const half = this.half;
        for (const run of this.runs) {
            into.push(...run);
            const count = run.length;
            const joins = closed ? count : count - 1;
            for (let i = 0; i < joins; i++) {
                const from = run[i];
                const to = run[(i + 1) % count];
                addJoin(endpoint(from, 1), tangent(from, 1), tangent(to, 0), stroke, discs, patches);
            }
            if (!closed && half > 0) {
                const ends: [Piece, number][] = [
                    [run[0], 0],
                    [run[count - 1], 1]
                ];
                for (const [piece, u] of ends) {
                    const p = endpoint(piece, u);
                    if (stroke.lineCap === LineCap.Round) {
                        discs.push({ cx: p.x, cy: p.y, r: half });
                    } else if (stroke.lineCap === LineCap.Square) {
                        const t = tangent(piece, u);
                        const out = u === 0 ? -1 : 1;
                        const ex = p.x + out * t.x * half;
                        const ey = p.y + out * t.y * half;
                        const nx = -t.y * half;
                        const ny = t.x * half;
                        patches.push(
                            patchOf([
                                { x: p.x + nx, y: p.y + ny },
                                { x: ex + nx, y: ey + ny },
                                { x: ex - nx, y: ey - ny },
                                { x: p.x - nx, y: p.y - ny }
                            ])
                        );
                    }
                }
            }
        }
        this.runs.length = 0;
    }
}

/**
 * Walks a rendered path string into a sink.
 *
 * `unshort` spells out the two commands that state their control point by reflection, which is
 * exact, so the walk below sees every command SVG has rather than most of them.
 *
 * @param pathStr the path to walk
 * @param sink the sink to report to
 */
function walkPath(pathStr: string, sink: SubPathSink): void {
    svgpath(pathStr)
        .abs()
        .unshort()
        .iterate((seg, _index, penX, penY) => {
            const cmd = seg[0];
            const at = seg as [string, ...number[]];
            if (cmd === "M") {
                sink.moveTo(at[1], at[2]);
            } else if (cmd === "L") {
                sink.lineTo(at[1], at[2]);
            } else if (cmd === "H") {
                sink.lineTo(at[1], penY);
            } else if (cmd === "V") {
                sink.lineTo(penX, at[1]);
            } else if (cmd === "Z") {
                sink.close();
            } else if (cmd === "A") {
                sink.arcTo(at[1], at[2], at[3], at[4] as 0 | 1, at[5] as 0 | 1, at[6], at[7]);
            } else if (cmd === "C") {
                sink.cubicTo(at[1], at[2], at[3], at[4], at[5], at[6]);
            } else if (cmd === "Q") {
                sink.quadTo(at[1], at[2], at[3], at[4]);
            }
        });
}

/**
 * Builds the exact free region of a shape, or undefined if the outline holds no segment of any
 * length — which is what a shape whose two vertices coincide comes out as — leaving its caller to
 * fall back on the box the stroke alone leaves.
 *
 * The vertices are walked straight in rather than formatted into the path string the shape is
 * rendered from and parsed back out of it, which is a parse saved for every iteration of a solver
 * that runs dozens of them. The walk rounds as the string did, so the region still measures exactly
 * the shape the renderer draws.
 *
 * @param outline the evaluated vertices of the outline, in order
 * @param decorations the evaluated decoration sub-paths
 * @param stroke the stroke the shape is painted with
 * @returns the exact region, or undefined if the outline has no extent at all
 */
export function buildExactRegion(
    outline: EvaluatedVertex[],
    decorations: EvaluatedDecoration[],
    stroke: ShapeStroke
): ExactRegion | undefined {
    if (outline.length === 0) {
        return undefined;
    }
    const pieces: Piece[] = [];
    const discs: Disc[] = [];
    const patches: Patch[] = [];
    const half = stroke.width / 2;
    const sink = new PieceSink(half, { remaining: FOLD_BUDGET });
    walkOutline(outline, sink);
    sink.finish(true, stroke, pieces, discs, patches);
    const outlinePieces = [...pieces];
    if (outlinePieces.length === 0) {
        return undefined;
    }
    for (const decoration of decorations) {
        if (decoration.vertices.length === 0) {
            continue;
        }
        walkDecoration(decoration.vertices, decoration.closed, sink);
        sink.finish(decoration.closed, stroke, pieces, discs, patches);
    }
    return new Region(pieces, outlinePieces, discs, patches, half);
}

/**
 * Builds the exact free region of an already rendered path, see {@link buildExactRegion}. This is
 * for the divider, which is handed the path a shape was laid out as rather than the shape itself.
 *
 * @param outlinePath the outline, as the path string it is rendered from
 * @param decorations the decoration sub-paths, as the strings they are rendered from
 * @param stroke the stroke the shape is painted with
 * @returns the exact region, or undefined if the outline has no extent at all
 */
export function buildExactRegionFromPath(
    outlinePath: string,
    decorations: {
        /**
         * The sub-path, as the string it is rendered from
         */
        path: string;
        /**
         * Whether the sub-path closes back to its start
         */
        closed: boolean;
    }[],
    stroke: ShapeStroke
): ExactRegion | undefined {
    const pieces: Piece[] = [];
    const discs: Disc[] = [];
    const patches: Patch[] = [];
    const half = stroke.width / 2;
    const sink = new PieceSink(half, { remaining: FOLD_BUDGET });
    walkPath(outlinePath, sink);
    sink.finish(true, stroke, pieces, discs, patches);
    const outline = [...pieces];
    if (outline.length === 0) {
        return undefined;
    }
    for (const decoration of decorations) {
        if (decoration.path.length === 0) {
            continue;
        }
        walkPath(decoration.path, sink);
        sink.finish(decoration.closed, stroke, pieces, discs, patches);
    }
    return new Region(pieces, outline, discs, patches, half);
}

import type { ShapeIR, Pt } from "./shapeIr.js";
import { evaluateDecorations, evaluateVertices } from "./shapeIr.js";
import { evalAffine } from "./expr.js";
import { decorationToSvgPath, outlineToSvgPath } from "./geometry.js";
import { LineJoin, LineCap } from "./types.js";
import type { ShapeStroke, Box } from "./types.js";
import svgpath from "svgpath";

/**
 * Content fitting for a shape outline.
 *
 * Content may go anywhere inside the outline that the stroke does not already cover. The stroke is
 * taken as the region it really is — a rectangle per segment, a wedge per join, a cap per open end
 * ({@link buildStrokeRegion}) — rather than as a distance the outline is shrunk by, because no
 * single shrink is right: pulling a scanline's interval in by the half-width is exact against a
 * vertical boundary, leaves `half/√2` against a diagonal one, and does nothing at all against a
 * boundary running along the scanline, such as the crest of a wavy edge.
 *
 * Everything is then derived from one data structure, the {@link ContentProfile}: the outline is cut
 * into {@link SCANLINES} horizontal slabs, each recording the widest interval that is free — inside
 * the outline and clear of the stroke — over the *whole* slab, not just at one height. A rectangle
 * fits exactly when it stays inside the free interval of every slab it covers, so an inscribed
 * rectangle is a *band* of slabs, its width the narrowest free interval over that band. Because a
 * slab's interval already accounts for everything between its two edges, a band can miss nothing
 * that happens between samples, and the rectangle it yields is guaranteed clear of the stroke.
 *
 * That reduces both questions the layout asks to a scan over bands:
 * - given the outer size, the largest content box is the band of maximal area
 *   ({@link bestContentBox}), refined to the exact height its constraint binds at,
 * - given the content, the smallest outer size is searched for by asking how wide a band of the
 *   content's height would be ({@link widestBand}), which is the constraint the `inner` solver
 *   minimises the shape's area against.
 *
 * The slabs sit at fixed *fractions* of the outline's height, and every outline coordinate is affine
 * in the box, so every band measurement is a smooth function of the box — the fixpoint sees no
 * sampling jitter as it moves.
 *
 * A slab may well be cut into several free intervals — a wavy lower edge leaves a lobe at either end
 * just below its crest — and only one of them is recorded, the widest. That can under-use a shape
 * whose lobes trade places from one slab to the next, but it can never over-use one: whichever
 * interval a slab contributes is genuinely free, so any band, being their intersection, is free too.
 */

/**
 * How far (px) a flattened curve may stray from the true one. Every chord is kept within this of the
 * curve *and* the stroke is widened by it wherever it is derived from a chord, so the approximation
 * can only ever cost content a sliver of room — it can never let content out through a curve.
 */
const FLATNESS = 0.02;

/**
 * Ceiling on the chords one curve is cut into, for a curve too large to meet {@link FLATNESS}
 */
const MAX_CURVE_CHORDS = 512;

/**
 * The number of chords a curve needs to stay within {@link FLATNESS} of it, from a bound on its
 * second derivative: a polyline taken at `n` equal steps of `t` is off by at most `max|p''| / (8n²)`.
 * The bound comes from the control points themselves — the same way {@link svgPathBbox} reads a
 * curve's extrema off its coefficients instead of sampling for them — so the count is a property of
 * the curve rather than of a chosen resolution, and a curve split in two (as `unarc` splits an arc,
 * once or twice depending on its sweep) is flattened to the same fidelity either way.
 *
 * @param secondDerivative a bound on `max|p''|` of the curve
 * @param flatness how far the chords may stray from the curve
 * @returns the number of chords to cut the curve into
 */
function chordCount(secondDerivative: number, flatness: number): number {
    if (!(secondDerivative > 0)) {
        return 1;
    }
    const exact = Math.ceil(Math.sqrt(secondDerivative / (8 * flatness)));
    return Math.max(1, Math.min(MAX_CURVE_CHORDS, exact));
}

/**
 * Computes `max|p''|` of a cubic: `6 · max(|p0 - 2c1 + c2|, |c1 - 2c2 + p1|)`
 *
 * @param p0 the start point
 * @param c1 the first control point
 * @param c2 the second control point
 * @param p1 the end point
 * @returns the bound on the second derivative
 */
function cubicSecondDerivative(p0: Pt, c1: Pt, c2: Pt, p1: Pt): number {
    const ax = p0.x - 2 * c1.x + c2.x;
    const ay = p0.y - 2 * c1.y + c2.y;
    const bx = c1.x - 2 * c2.x + p1.x;
    const by = c1.y - 2 * c2.y + p1.y;
    return 6 * Math.sqrt(Math.max(ax * ax + ay * ay, bx * bx + by * by));
}

/**
 * A cubic Bézier, as the pieces one authored curve is made of
 */
interface Cubic {
    /**
     * The start point
     */
    readonly p0: Pt;
    /**
     * The first control point
     */
    readonly c1: Pt;
    /**
     * The second control point
     */
    readonly c2: Pt;
    /**
     * The end point
     */
    readonly p1: Pt;
}

/**
 * Raises a quadratic to the cubic that draws exactly the same curve, so one code path samples every
 * curved edge. Degree elevation is exact, and the elevated control points give back the quadratic's
 * own `|p''|` — both differences come out as `(p0 - 2c1 + p1) / 3` — so the chord count is unchanged.
 *
 * @param p0 the start point
 * @param c1 the control point
 * @param p1 the end point
 * @returns the equivalent cubic
 */
function quadToCubic(p0: Pt, c1: Pt, p1: Pt): Cubic {
    return {
        p0,
        c1: { x: (p0.x + 2 * c1.x) / 3, y: (p0.y + 2 * c1.y) / 3 },
        c2: { x: (p1.x + 2 * c1.x) / 3, y: (p1.y + 2 * c1.y) / 3 },
        p1
    };
}

/**
 * Converts one arc into the cubics svgpath's `unarc` would produce for it — the same conversion the
 * renderer's own path goes through. Returns an empty list for a degenerate arc (coincident endpoints,
 * or a zero radius), which SVG draws as a straight line.
 *
 * The run's ends are pinned to the arc's own endpoints, which the conversion otherwise only lands on
 * to about `1e-6` px: an arc that spans exactly a quarter of its ellipse leaves the center it solves
 * for as the square root of a cancelled-out zero, and that halves the digits. An arc *ends where it
 * says it ends*, and a closed ring has to come back to the point it started at exactly, or the
 * profile is walked with a sliver of a segment that the shape does not have.
 *
 * @param from the current pen position
 * @param seg the absolute arc segment, as `A rx ry rotation largeArc sweep x y`
 * @returns the cubics the arc is made of, in order
 */
function arcToCubics(from: Pt, seg: (string | number)[]): Cubic[] {
    const [, rx, ry, rotation, largeArc, sweep, x, y] = seg as [string, ...number[]];
    const cubics: Cubic[] = [];
    svgpath(`M ${from.x} ${from.y} A ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${x} ${y}`)
        .unarc()
        .iterate((s, _index, penX, penY) => {
            if (s[0] === "C") {
                cubics.push({
                    p0: { x: penX, y: penY },
                    c1: { x: s[1], y: s[2] },
                    c2: { x: s[3], y: s[4] },
                    p1: { x: s[5], y: s[6] }
                });
            }
        });
    if (cubics.length > 0) {
        cubics[0] = { ...cubics[0], p0: from };
        cubics[cubics.length - 1] = { ...cubics[cubics.length - 1], p1: { x, y } };
    }
    return cubics;
}

/**
 * Evaluates a cubic at `t`
 *
 * @param c the cubic to evaluate
 * @param t the parameter to evaluate at, between 0 and 1
 * @returns the point on the curve
 */
function evaluateCubic(c: Cubic, t: number): Pt {
    const mt = 1 - t;
    const wa = mt * mt * mt;
    const wb = 3 * mt * mt * t;
    const wc = 3 * mt * t * t;
    const wd = t * t * t;
    return {
        x: wa * c.p0.x + wb * c.c1.x + wc * c.c2.x + wd * c.p1.x,
        y: wa * c.p0.y + wb * c.c1.y + wc * c.c2.y + wd * c.p1.y
    };
}

/**
 * A flattened sub-path. `curved[i]` marks the edge from vertex `i` to vertex `i + 1` as a curve
 * chord, which is the only kind of edge that carries a flattening error.
 */
interface Polyline {
    /**
     * The x coordinate of each vertex
     */
    readonly x: number[];
    /**
     * The y coordinate of each vertex
     */
    readonly y: number[];
    /**
     * Whether the edge leaving each vertex is a curve chord
     */
    readonly curved: boolean[];
    /**
     * Whether the sub-path closes back to its first vertex
     */
    readonly closed: boolean;
}

/**
 * Samples an SVG path into a polyline, cutting each curve into as many chords as it takes to stay
 * within `flatness` of it. Curves go through exactly the conversion the renderer's own path does
 * (arcs to cubics by svgpath), so anything fitted to these points tracks the same curve the user
 * sees — no separate arc math to drift out of sync.
 *
 * @param pathStr the path to flatten
 * @param closed whether the sub-path closes back to its first vertex
 * @param flatness how far a chord may stray from the curve
 * @returns the flattened polyline
 */
function flattenPath(pathStr: string, closed: boolean, flatness: number): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    const curved: boolean[] = [];
    const push = (px: number, py: number, isCurve: boolean): void => {
        if (x.length > 0) {
            curved.push(isCurve);
        }
        x.push(px);
        y.push(py);
    };
    const pushCurve = (cubics: Cubic[]): void => {
        for (const cubic of cubics) {
            const chords = chordCount(cubicSecondDerivative(cubic.p0, cubic.c1, cubic.c2, cubic.p1), flatness);
            for (let k = 1; k <= chords; k++) {
                const point = evaluateCubic(cubic, k / chords);
                push(point.x, point.y, true);
            }
        }
    };
    svgpath(pathStr)
        .abs()
        .iterate((seg, _index, penX, penY) => {
            const cmd = seg[0];
            if (cmd === "M" || cmd === "L") {
                push(seg[1], seg[2], false);
            } else if (cmd === "H") {
                push(seg[1], penY, false);
            } else if (cmd === "V") {
                push(penX, seg[1], false);
            } else if (cmd === "C") {
                pushCurve([
                    {
                        p0: { x: penX, y: penY },
                        c1: { x: seg[1], y: seg[2] },
                        c2: { x: seg[3], y: seg[4] },
                        p1: { x: seg[5], y: seg[6] }
                    }
                ]);
            } else if (cmd === "Q") {
                pushCurve([quadToCubic({ x: penX, y: penY }, { x: seg[1], y: seg[2] }, { x: seg[3], y: seg[4] })]);
            } else if (cmd === "A") {
                const cubics = arcToCubics({ x: penX, y: penY }, seg);
                if (cubics.length === 0) {
                    push(seg[6], seg[7], false);
                } else {
                    pushCurve(cubics);
                }
            }
        });
    return { x, y, curved, closed };
}

/**
 * The region the stroke covers, kept as the convex pieces it is made of: a rectangle per segment,
 * and per join or cap either a wedge (a quad for a miter, a triangle for a bevel) or a disc (a round
 * join or cap). Every piece is convex, so the span it blocks across a slab is an interval that falls
 * out of clipping it to that slab — which is what makes an exact answer cheap.
 *
 * The pieces are bucketed by height so a query only visits those near it.
 */
interface StrokeRegion {
    /**
     * Convex pieces, four vertices each (a triangle repeats its last), x/y interleaved
     */
    readonly polygons: Float64Array;
    /**
     * How many convex pieces {@link polygons} holds
     */
    readonly polygonCount: number;
    /**
     * Discs, as `cx, cy, r`
     */
    readonly discs: Float64Array;
    /**
     * How many discs {@link discs} holds
     */
    readonly discCount: number;
    /**
     * Top of the bucketed y-range
     */
    readonly minY: number;
    /**
     * Height of one bucket cell
     */
    readonly yStep: number;
    /**
     * The convex pieces bucketed by height
     */
    readonly polygonBuckets: BucketIndex;
    /**
     * The discs bucketed by height
     */
    readonly discBuckets: BucketIndex;
}

/**
 * Vertices per convex piece
 */
const POLYGON_VERTICES = 4;
/**
 * Offset of a convex piece's cached bounding box (minX, maxX, minY, maxY) within its record
 */
const POLYGON_BOUNDS = POLYGON_VERTICES * 2;
/**
 * Numbers one convex piece occupies: its vertices followed by its cached bounding box
 */
const POLYGON_STRIDE = POLYGON_BOUNDS + 4;
/**
 * Numbers one disc occupies
 */
const DISC_STRIDE = 3;

/**
 * Number of cells the stroke pieces and the outline edges are bucketed into. Building the profile is
 * the hottest thing the fixpoint does — one query per slab, every iteration — and rescanning every
 * piece per query would dominate.
 */
const SPAN_BUCKETS = 128;

/**
 * Tolerance for the "touches but does not overlap" comparisons; a stroke's edge is not inside it
 */
const TOUCH_EPSILON = 1e-9;

/**
 * How far (px) a join may reach past the segments it joins before it is worth modelling at all
 */
const JOIN_EPSILON = 1e-3;

/**
 * Computes the cell index of a coordinate on an axis spanning `[min, min + step*SPAN_BUCKETS]`
 *
 * @param v the coordinate to look up
 * @param min the start of the bucketed range
 * @param step the height of one cell
 * @returns the cell index, clamped to the bucketed range
 */
function cellIndex(v: number, min: number, step: number): number {
    if (!(step > 0)) {
        return 0;
    }
    const c = Math.floor((v - min) / step);
    return c < 0 ? 0 : c > SPAN_BUCKETS ? SPAN_BUCKETS : c;
}

/**
 * Collects the convex pieces of a stroke, growing its buffers as it goes
 */
class StrokeRegionBuilder {
    /**
     * The convex pieces collected so far, x/y interleaved and followed by the cached bounding box
     */
    private polygons = new Float64Array(64 * POLYGON_STRIDE);
    /**
     * How many convex pieces {@link polygons} holds
     */
    private polygonCount = 0;
    /**
     * The discs collected so far, as `cx, cy, r`
     */
    private discs = new Float64Array(64 * DISC_STRIDE);
    /**
     * How many discs {@link discs} holds
     */
    private discCount = 0;

    /**
     * Creates a new builder for a stroke
     *
     * @param stroke the stroke whose region is built
     */
    constructor(private readonly stroke: ShapeStroke) {}

    /**
     * Appends a convex piece and its bounding box, growing the buffer if needed.
     * A triangle is passed as a quad which repeats its last vertex.
     *
     * @param x0 the x coordinate of the first vertex
     * @param y0 the y coordinate of the first vertex
     * @param x1 the x coordinate of the second vertex
     * @param y1 the y coordinate of the second vertex
     * @param x2 the x coordinate of the third vertex
     * @param y2 the y coordinate of the third vertex
     * @param x3 the x coordinate of the fourth vertex
     * @param y3 the y coordinate of the fourth vertex
     */
    private addPolygon(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number
    ): void {
        if (this.polygonCount * POLYGON_STRIDE === this.polygons.length) {
            const grown = new Float64Array(this.polygons.length * 2);
            grown.set(this.polygons);
            this.polygons = grown;
        }
        const o = this.polygonCount * POLYGON_STRIDE;
        this.polygons[o] = x0;
        this.polygons[o + 1] = y0;
        this.polygons[o + 2] = x1;
        this.polygons[o + 3] = y1;
        this.polygons[o + 4] = x2;
        this.polygons[o + 5] = y2;
        this.polygons[o + 6] = x3;
        this.polygons[o + 7] = y3;
        this.polygons[o + POLYGON_BOUNDS] = Math.min(x0, x1, x2, x3);
        this.polygons[o + POLYGON_BOUNDS + 1] = Math.max(x0, x1, x2, x3);
        this.polygons[o + POLYGON_BOUNDS + 2] = Math.min(y0, y1, y2, y3);
        this.polygons[o + POLYGON_BOUNDS + 3] = Math.max(y0, y1, y2, y3);
        this.polygonCount++;
    }

    /**
     * Appends a disc, growing the buffer if needed
     *
     * @param cx the x coordinate of the center
     * @param cy the y coordinate of the center
     * @param r the radius
     */
    private addDisc(cx: number, cy: number, r: number): void {
        if (this.discCount * DISC_STRIDE === this.discs.length) {
            const grown = new Float64Array(this.discs.length * 2);
            grown.set(this.discs);
            this.discs = grown;
        }
        const o = this.discCount * DISC_STRIDE;
        this.discs[o] = cx;
        this.discs[o + 1] = cy;
        this.discs[o + 2] = r;
        this.discCount++;
    }

    /**
     * Adds the stroke of one sub-path: a rectangle per segment, a wedge or disc per join, and the
     * caps of an open end. A join only ever adds material on the *outside* of its turn — on the
     * inside the two segment rectangles already overlap — which is why the wedge is built from the
     * outward normals of the two edges.
     *
     * @param line the flattened sub-path to stroke
     */
    add(line: Polyline): void {
        const { x, y, curved, closed } = line;
        const count = x.length;
        if (count < 2) {
            return;
        }
        const half = this.stroke.width / 2;
        const edges = closed ? count : count - 1;
        /**
         * Radius the edge leaving vertex `i` is stroked with, the flattening allowance included
         */
        const radiusOf = (i: number): number => half + (curved[i] === true ? FLATNESS : 0);
        for (let i = 0; i < edges; i++) {
            const j = (i + 1) % count;
            let ax = x[i];
            let ay = y[i];
            let bx = x[j];
            let by = y[j];
            const length = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
            if (length < TOUCH_EPSILON) {
                continue;
            }
            const dx = (bx - ax) / length;
            const dy = (by - ay) / length;
            const r = radiusOf(i);
            if (this.stroke.lineCap === LineCap.Square && !closed) {
                if (i === 0) {
                    ax -= dx * half;
                    ay -= dy * half;
                }
                if (i === edges - 1) {
                    bx += dx * half;
                    by += dy * half;
                }
            }
            const nx = -dy * r;
            const ny = dx * r;
            this.addPolygon(ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny);
        }
        const joins = closed ? count : count - 2;
        for (let k = 0; k < joins; k++) {
            const v = closed ? k : k + 1;
            const u = (v - 1 + count) % count;
            const w = (v + 1) % count;
            this.addJoin(x[u], y[u], x[v], y[v], x[w], y[w], Math.max(radiusOf(u), radiusOf(v)));
        }
        if (!closed && this.stroke.lineCap === LineCap.Round) {
            this.addDisc(x[0], y[0], half);
            this.addDisc(x[count - 1], y[count - 1], half);
        }
    }

    /**
     * Adds the material a join covers on the outside of its turn: a disc for a round join, the quad up
     * to the miter tip for a miter within its limit, and the triangle between the two offset corners
     * for a bevel or a miter past its limit.
     *
     * A turn gentle enough that its miter barely reaches past the segments — every vertex a flattened
     * curve is made of — is skipped: the notch it leaves between the two segment rectangles is
     * shallower than the join is wide, and filling it would double the pieces the profile has to walk
     * for a fraction of the flattening tolerance.
     *
     * @param ux the x coordinate of the vertex the arriving edge starts at
     * @param uy the y coordinate of the vertex the arriving edge starts at
     * @param vx the x coordinate of the vertex the join sits at
     * @param vy the y coordinate of the vertex the join sits at
     * @param wx the x coordinate of the vertex the leaving edge ends at
     * @param wy the y coordinate of the vertex the leaving edge ends at
     * @param r the radius the join is as wide as
     */
    private addJoin(ux: number, uy: number, vx: number, vy: number, wx: number, wy: number, r: number): void {
        const inLength = Math.sqrt((vx - ux) * (vx - ux) + (vy - uy) * (vy - uy));
        const outLength = Math.sqrt((wx - vx) * (wx - vx) + (wy - vy) * (wy - vy));
        if (inLength < TOUCH_EPSILON || outLength < TOUCH_EPSILON) {
            return;
        }
        const d1x = (vx - ux) / inLength;
        const d1y = (vy - uy) / inLength;
        const d2x = (wx - vx) / outLength;
        const d2y = (wy - vy) / outLength;
        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < TOUCH_EPSILON) {
            return;
        }
        if (this.stroke.lineJoin === LineJoin.Round) {
            this.addDisc(vx, vy, r);
            return;
        }
        const s = cross > 0 ? 1 : -1;
        const n1x = s * d1y * r;
        const n1y = -s * d1x * r;
        const n2x = s * d2y * r;
        const n2y = -s * d2x * r;
        const p1x = vx + n1x;
        const p1y = vy + n1y;
        const p2x = vx + n2x;
        const p2y = vy + n2y;
        if (this.stroke.lineJoin === LineJoin.Miter) {
            const t = ((p2x - p1x) * d2y - (p2y - p1y) * d2x) / cross;
            const tipX = p1x + d1x * t;
            const tipY = p1y + d1y * t;
            const miter = Math.sqrt((tipX - vx) * (tipX - vx) + (tipY - vy) * (tipY - vy));
            if (miter - r < JOIN_EPSILON) {
                return;
            }
            if (miter <= this.stroke.miterLimit * (this.stroke.width / 2) + TOUCH_EPSILON) {
                this.addPolygon(vx, vy, p1x, p1y, tipX, tipY, p2x, p2y);
                return;
            }
        }
        this.addPolygon(vx, vy, p1x, p1y, p2x, p2y, p2x, p2y);
    }

    /**
     * Buckets everything collected so far by height and hands out the finished region
     *
     * @returns the stroked region
     */
    build(): StrokeRegion {
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < this.polygonCount; i++) {
            const o = i * POLYGON_STRIDE + POLYGON_BOUNDS;
            minY = Math.min(minY, this.polygons[o + 2]);
            maxY = Math.max(maxY, this.polygons[o + 3]);
        }
        for (let i = 0; i < this.discCount * DISC_STRIDE; i += DISC_STRIDE) {
            minY = Math.min(minY, this.discs[i + 1] - this.discs[i + 2]);
            maxY = Math.max(maxY, this.discs[i + 1] + this.discs[i + 2]);
        }
        const yStep = (maxY - minY) / SPAN_BUCKETS;
        const polygons = this.polygons;
        const discs = this.discs;
        const polygonBuckets = buildBuckets(this.polygonCount, minY, yStep, (i, out) => {
            const o = i * POLYGON_STRIDE + POLYGON_BOUNDS;
            out[0] = polygons[o + 2];
            out[1] = polygons[o + 3];
        });
        const discBuckets = buildBuckets(this.discCount, minY, yStep, (i, out) => {
            const o = i * DISC_STRIDE;
            out[0] = discs[o + 1] - discs[o + 2];
            out[1] = discs[o + 1] + discs[o + 2];
        });
        return {
            polygons: this.polygons,
            polygonCount: this.polygonCount,
            discs: this.discs,
            discCount: this.discCount,
            minY,
            yStep,
            polygonBuckets,
            discBuckets
        };
    }
}

/**
 * Items bucketed by height, flat: the ids in cell `c` are `items[offsets[c] .. offsets[c + 1])`. A
 * query runs the hottest loop there is here, so it walks a typed array by index rather than an array
 * of arrays by iterator.
 */
interface BucketIndex {
    /**
     * Where each cell starts in {@link items}, with one extra entry holding the total
     */
    readonly offsets: Int32Array;
    /**
     * The item ids, grouped by cell
     */
    readonly items: Int32Array;
}

/**
 * Builds a {@link BucketIndex} over `count` items. An item with no extent at all, such as a horizontal
 * edge which can never be crossed, is left out entirely.
 *
 * @param count how many items to bucket
 * @param minY the start of the bucketed range
 * @param yStep the height of one cell
 * @param extent writes the y-range of the item with the given index into the passed buffer
 * @returns the built index
 */
function buildBuckets(
    count: number,
    minY: number,
    yStep: number,
    extent: (index: number, out: Float64Array) => void
): BucketIndex {
    const range = new Float64Array(2);
    const counts = new Int32Array(SPAN_BUCKETS + 2);
    let total = 0;
    for (let i = 0; i < count; i++) {
        extent(i, range);
        if (range[0] > range[1]) {
            continue;
        }
        const first = cellIndex(range[0], minY, yStep);
        const last = cellIndex(range[1], minY, yStep);
        for (let c = first; c <= last; c++) {
            counts[c + 1]++;
        }
        total += last - first + 1;
    }
    const offsets = new Int32Array(SPAN_BUCKETS + 2);
    for (let c = 1; c < offsets.length; c++) {
        offsets[c] = offsets[c - 1] + counts[c];
    }
    const cursor = offsets.slice();
    const items = new Int32Array(total);
    for (let i = 0; i < count; i++) {
        extent(i, range);
        if (range[0] > range[1]) {
            continue;
        }
        const first = cellIndex(range[0], minY, yStep);
        const last = cellIndex(range[1], minY, yStep);
        for (let c = first; c <= last; c++) {
            items[cursor[c]++] = i;
        }
    }
    return { offsets, items };
}

/**
 * Builds the stroked region of an outline and its decorations
 *
 * @param outline the flattened outline
 * @param decorations the flattened decoration sub-paths
 * @param stroke the stroke everything is painted with
 * @returns the stroked region
 */
function buildStrokeRegion(outline: Polyline, decorations: Polyline[], stroke: ShapeStroke): StrokeRegion {
    const builder = new StrokeRegionBuilder(stroke);
    builder.add(outline);
    for (const decoration of decorations) {
        builder.add(decoration);
    }
    return builder.build();
}

/**
 * Start of the interval the last {@link freeSpan} found
 */
let spanMin = 0;
/**
 * End of the interval the last {@link freeSpan} found
 */
let spanMax = 0;

/**
 * Scratch buffer holding the sorted crossing coordinates of one scanline
 */
let crossings = new Float64Array(64);
/**
 * Scratch buffer holding the blocked spans of one slab, as `lo, hi` pairs sorted by `lo`
 */
let blocked = new Float64Array(256);
/**
 * How many spans {@link blocked} holds
 */
let blockedCount = 0;

/**
 * Inserts a coordinate into the sorted prefix `crossings[0..count)`, growing the buffer if needed
 *
 * @param x the coordinate to insert
 * @param count how many coordinates the sorted prefix holds
 */
function insertCrossing(x: number, count: number): void {
    if (count === crossings.length) {
        const grown = new Float64Array(count * 2);
        grown.set(crossings);
        crossings = grown;
    }
    let i = count;
    while (i > 0 && crossings[i - 1] > x) {
        crossings[i] = crossings[i - 1];
        i--;
    }
    crossings[i] = x;
}

/**
 * Appends a span to {@link blocked}, in whatever order it is found
 *
 * @param lo the start of the span
 * @param hi the end of the span
 */
function pushBlocked(lo: number, hi: number): void {
    if (2 * blockedCount === blocked.length) {
        const grown = new Float64Array(blocked.length * 2);
        grown.set(blocked);
        blocked = grown;
    }
    blocked[2 * blockedCount] = lo;
    blocked[2 * blockedCount + 1] = hi;
    blockedCount++;
}

/**
 * Sorts the collected spans by where they start, which only the search for the *widest* gap needs —
 * looking up the one gap that holds a given x is a single unordered pass, and that is the query a
 * tall range (where there can be hundreds of spans) is asked.
 */
function sortBlocked(): void {
    for (let i = 1; i < blockedCount; i++) {
        const lo = blocked[2 * i];
        const hi = blocked[2 * i + 1];
        let j = i;
        while (j > 0 && blocked[2 * (j - 1)] > lo) {
            blocked[2 * j] = blocked[2 * (j - 1)];
            blocked[2 * j + 1] = blocked[2 * (j - 1) + 1];
            j--;
        }
        blocked[2 * j] = lo;
        blocked[2 * j + 1] = hi;
    }
}

/**
 * An index over the flattened outline that answers "which parts of this height are inside" without
 * rescanning every edge. Each non-horizontal edge is bucketed into the cells its y-range covers.
 */
interface OutlineIndex {
    /**
     * The flattened outline the index is built over
     */
    readonly line: Polyline;
    /**
     * Top of the bucketed y-range
     */
    readonly minY: number;
    /**
     * Height of one bucket cell
     */
    readonly yStep: number;
    /**
     * The outline edges bucketed by height
     */
    readonly buckets: BucketIndex;
}

/**
 * Buckets the non-horizontal edges of a flattened outline by height.
 *
 * Each edge is given one cell of slack on either end: an edge that ends exactly on a cell boundary
 * must not be able to fall out of the cell a query at that very height lands in, which rounding alone
 * could otherwise arrange — and a missed edge silently widens a span. A horizontal edge is left out
 * entirely; it can never be crossed.
 *
 * @param line the flattened outline to index
 * @returns the built index
 */
function buildOutlineIndex(line: Polyline): OutlineIndex {
    const count = line.x.length;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const value of line.y) {
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
    }
    const yStep = (maxY - minY) / SPAN_BUCKETS;
    const buckets = buildBuckets(count, minY, yStep, (i, out) => {
        const j = (i + 1) % count;
        if (line.y[i] === line.y[j]) {
            out[0] = Infinity;
            out[1] = -Infinity;
        } else {
            out[0] = Math.min(line.y[i], line.y[j]) - yStep;
            out[1] = Math.max(line.y[i], line.y[j]) + yStep;
        }
    });
    return { line, minY, yStep, buckets };
}

/**
 * Collects the intervals the horizontal line at `y` cuts out of the outline's interior into
 * {@link crossings}, returning how many crossings it found.
 *
 * The crossings are kept in x order and pair off: for a closed polygon the first pair spans inside,
 * the next gap outside, and so on, so a shape that falls apart into several lobes at this height
 * reports each of them rather than one span bridging the gap between.
 *
 * The crossing test is deliberately half-open (`a.y <= y < b.y`), so a vertex sitting exactly on the
 * line is counted once and the alternation stays intact — the inclusive test counts it twice and
 * turns the inside/outside pairing inside out. At the very top and bottom of the outline that test
 * leaves no crossing at all; there the extent of the edges merely touching the line stands in.
 *
 * @param index the index over the flattened outline
 * @param y the height to cut at
 * @returns how many crossings were found
 */
function interiorCrossings(index: OutlineIndex, y: number): number {
    const { line } = index;
    const count = line.x.length;
    const cell = cellIndex(y, index.minY, index.yStep);
    const { offsets, items } = index.buckets;
    let found = 0;
    let touchMin = Infinity;
    let touchMax = -Infinity;
    for (let slot = offsets[cell]; slot < offsets[cell + 1]; slot++) {
        const i = items[slot];
        const j = (i + 1) % count;
        const ay = line.y[i];
        const by = line.y[j];
        if ((ay > y && by > y) || (ay < y && by < y)) {
            continue;
        }
        const xx = line.x[i] + ((y - ay) / (by - ay)) * (line.x[j] - line.x[i]);
        touchMin = Math.min(touchMin, xx);
        touchMax = Math.max(touchMax, xx);
        if ((ay <= y && by > y) || (by <= y && ay > y)) {
            insertCrossing(xx, found++);
        }
    }
    if (found >= 2) {
        return found;
    }
    if (touchMax >= touchMin) {
        crossings[0] = touchMin;
        crossings[1] = touchMax;
        return 2;
    }
    return 0;
}

/**
 * Collects everything the stroke blocks between two heights into {@link blocked}
 *
 * @param region the stroked region to query
 * @param ya the top of the slab
 * @param yb the bottom of the slab
 */
function collectBlocked(region: StrokeRegion, ya: number, yb: number): void {
    blockedCount = 0;
    const firstCell = cellIndex(ya, region.minY, region.yStep);
    const lastCell = cellIndex(yb, region.minY, region.yStep);
    const polygons = region.polygonBuckets;
    const discs = region.discBuckets;
    for (let c = firstCell; c <= lastCell; c++) {
        for (let i = polygons.offsets[c]; i < polygons.offsets[c + 1]; i++) {
            addPolygonSpan(region, polygons.items[i], ya, yb);
        }
        for (let i = discs.offsets[c]; i < discs.offsets[c + 1]; i++) {
            addDiscSpan(region, discs.items[i], ya, yb);
        }
    }
}

/**
 * Adds the x-span a convex piece covers between `ya` and `yb`: the piece clipped to the slab, which
 * for a convex piece is the extent of its vertices inside the slab together with where its edges
 * cross the two slab boundaries. A piece that only *touches* a boundary covers nothing — content
 * that reaches exactly the edge of the stroke is still clear of it. A piece that does reach inside is
 * measured over the closed slab, so an extreme sitting exactly on a boundary still counts: a miter tip
 * lands on one whenever the corner it belongs to does, and it is what the content has to clear.
 *
 * @param region the stroked region the piece belongs to
 * @param index the index of the piece
 * @param ya the top of the slab
 * @param yb the bottom of the slab
 */
function addPolygonSpan(region: StrokeRegion, index: number, ya: number, yb: number): void {
    const o = index * POLYGON_STRIDE;
    const p = region.polygons;
    const pieceTop = p[o + POLYGON_BOUNDS + 2];
    const pieceBottom = p[o + POLYGON_BOUNDS + 3];
    if (pieceBottom <= ya + TOUCH_EPSILON || pieceTop >= yb - TOUCH_EPSILON) {
        return;
    }
    if (pieceTop >= ya && pieceBottom <= yb) {
        pushBlocked(p[o + POLYGON_BOUNDS], p[o + POLYGON_BOUNDS + 1]);
        return;
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < POLYGON_VERTICES; k++) {
        const at = o + 2 * k;
        const x0 = p[at];
        const y0 = p[at + 1];
        const to = k === POLYGON_VERTICES - 1 ? o : at + 2;
        const x1 = p[to];
        const y1 = p[to + 1];
        if (y0 >= ya && y0 <= yb) {
            lo = Math.min(lo, x0);
            hi = Math.max(hi, x0);
        }
        if (y0 !== y1) {
            if ((y0 < ya && y1 > ya) || (y1 < ya && y0 > ya)) {
                const xx = x0 + ((ya - y0) / (y1 - y0)) * (x1 - x0);
                lo = Math.min(lo, xx);
                hi = Math.max(hi, xx);
            }
            if ((y0 < yb && y1 > yb) || (y1 < yb && y0 > yb)) {
                const xx = x0 + ((yb - y0) / (y1 - y0)) * (x1 - x0);
                lo = Math.min(lo, xx);
                hi = Math.max(hi, xx);
            }
        }
    }
    if (hi > lo) {
        pushBlocked(lo, hi);
    }
}

/**
 * Adds the x-span a disc covers between two heights, at its widest within the slab
 *
 * @param region the stroked region the disc belongs to
 * @param index the index of the disc
 * @param ya the top of the slab
 * @param yb the bottom of the slab
 */
function addDiscSpan(region: StrokeRegion, index: number, ya: number, yb: number): void {
    const o = index * DISC_STRIDE;
    const cx = region.discs[o];
    const cy = region.discs[o + 1];
    const r = region.discs[o + 2];
    const dy = Math.max(0, Math.max(ya - cy, cy - yb));
    if (dy >= r - TOUCH_EPSILON) {
        return;
    }
    const reach = Math.sqrt(r * r - dy * dy);
    pushBlocked(cx - reach, cx + reach);
}

/**
 * The widest interval of the outline's interior between `ya` and `yb` that the stroke leaves free,
 * or null if there is none. With `around` given, the interval containing that x is returned instead
 * of the widest, which is what lets a box already sitting in one lobe be measured against that lobe.
 *
 * The interior is read at `ya` alone even though the answer covers the whole slab: a point that is
 * inside there and never comes within the stroke of the outline cannot have left the outline on the
 * way down, since leaving it means crossing it.
 *
 * The authored inset is breathing room *inside* the space the stroke leaves, so it comes off the free
 * gap rather than off the outline — subtracting it first would let the two overlap.
 *
 * @param index the index over the flattened outline
 * @param region the stroked region
 * @param ya the top of the slab
 * @param yb the bottom of the slab
 * @param clearLeft the authored inset from the left
 * @param clearRight the authored inset from the right
 * @param around the x an interval has to contain, or undefined to take the widest one
 * @returns true if an interval was found, which is then left in {@link spanMin}/{@link spanMax}
 */
function freeSpan(
    index: OutlineIndex,
    region: StrokeRegion,
    ya: number,
    yb: number,
    clearLeft: number,
    clearRight: number,
    around?: number
): boolean {
    const found = interiorCrossings(index, ya);
    if (found < 2) {
        return false;
    }
    collectBlocked(region, ya, yb);
    if (around != undefined) {
        let lo = -Infinity;
        let hi = Infinity;
        for (let i = 0; i + 1 < found; i += 2) {
            if (crossings[i] <= around && crossings[i + 1] >= around) {
                lo = crossings[i];
                hi = crossings[i + 1];
            }
        }
        if (lo > around || hi < around) {
            return false;
        }
        for (let s = 0; s < blockedCount; s++) {
            const spanLow = blocked[2 * s];
            const spanHigh = blocked[2 * s + 1];
            if (spanLow <= around && spanHigh >= around) {
                return false;
            }
            if (spanHigh <= around) {
                lo = Math.max(lo, spanHigh);
            } else {
                hi = Math.min(hi, spanLow);
            }
        }
        spanMin = lo + clearLeft;
        spanMax = hi - clearRight;
        return spanMax > spanMin;
    }
    sortBlocked();
    let bestMin = 0;
    let bestMax = 0;
    let bestWidth = 0;
    for (let i = 0; i + 1 < found; i += 2) {
        let cursor = crossings[i];
        const end = crossings[i + 1];
        for (let s = 0; s < blockedCount && cursor < end; s++) {
            const lo = blocked[2 * s];
            const hi = blocked[2 * s + 1];
            if (hi <= cursor) {
                continue;
            }
            if (lo >= end) {
                break;
            }
            if (lo - cursor > bestWidth) {
                bestWidth = lo - cursor;
                bestMin = cursor;
                bestMax = lo;
            }
            cursor = hi;
        }
        if (end - cursor > bestWidth) {
            bestWidth = end - cursor;
            bestMin = cursor;
            bestMax = end;
        }
    }
    spanMin = bestMin + clearLeft;
    spanMax = bestMax - clearRight;
    return spanMax > spanMin;
}

/**
 * Number of slabs a profile is cut into. Divisible by 32, so the fractions land exactly on the
 * breakpoints of every predefined shape (a chevron's notch at `h/2`, a note's fold at `0.25h`).
 */
const SCANLINES = 128;

/**
 * Tolerance (px) for the "at least this wide/tall" comparisons
 */
const FIT_EPSILON = 1e-9;

/**
 * Steps of bisection used to grow a fitted box to where its constraint really binds
 */
const REFINE_STEPS = 30;

/**
 * The free space of a shape, cut into {@link SCANLINES} slabs of equal height. `left[k]`/`right[k]`
 * bound the interval content may occupy anywhere within slab `k`; an empty slab is recorded as
 * `left = +Infinity`, `right = -Infinity` so it poisons any band covering it.
 */
export interface ContentProfile {
    /**
     * Top of the first slab
     */
    readonly top: number;
    /**
     * Bottom of the last slab
     */
    readonly bottom: number;
    /**
     * Height of one slab; `0` for a geometry too degenerate to hold anything
     */
    readonly step: number;
    /**
     * Left bound of the free interval of each slab
     */
    readonly left: Float64Array;
    /**
     * Right bound of the free interval of each slab
     */
    readonly right: Float64Array;
    /**
     * Width of the band covering the whole profile (negative if not even that band is free)
     */
    readonly fullWidth: number;
    /**
     * The free interval over an arbitrary range, for the exact answers the fixed slabs cannot give:
     * the tail of a band that ends between two slabs, and the refinement of a fitted box. The
     * interval is left in {@link spanMin}/{@link spanMax} rather than returned, since the profile
     * build asks this once per slab and an object apiece is the most expensive part of the answer.
     */
    readonly measure: (ya: number, yb: number, around?: number) => boolean;
}

/**
 * Samples the free space of a shape at a concrete size into a {@link ContentProfile}.
 *
 * The usable height is the outline's own extent shrunk by any authored top/bottom inset, and each
 * slab holds what the stroke leaves free across it, shrunk by any authored left/right inset. The
 * stroke of a decoration blocks exactly as the outline's does, so content flows around a component's
 * ports and below a database's rim without any shape-specific knowledge.
 *
 * The slabs start where content can: a box edge cannot come closer than the stroke half-width to the
 * outline's own top or bottom, so laying the grid out from there makes a shape with a flat top and
 * bottom — the common one — measure its content height exactly rather than to the nearest slab. A
 * shape whose extreme is a lone spike gives up the sliver above it.
 *
 * @param ir the shape to sample
 * @param width the geometry width
 * @param height the geometry height
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @returns the sampled profile
 */
export function buildContentProfile(
    ir: ShapeIR,
    width: number,
    height: number,
    rounding: number,
    stroke: ShapeStroke
): ContentProfile {
    const half = stroke.width / 2;
    const clearLeft = Math.max(0, evalAffine(ir.content.left, width, height, rounding));
    const clearRight = Math.max(0, evalAffine(ir.content.right, width, height, rounding));
    const clearTop = Math.max(0, evalAffine(ir.content.top, width, height, rounding));
    const clearBottom = Math.max(0, evalAffine(ir.content.bottom, width, height, rounding));

    const outline = flattenPath(outlineToSvgPath(evaluateVertices(ir, width, height, rounding)), true, FLATNESS);
    const decorations = evaluateDecorations(ir, width, height, rounding).map((decoration) =>
        flattenPath(decorationToSvgPath(decoration.vertices, decoration.closed), decoration.closed, FLATNESS)
    );
    const index = buildOutlineIndex(outline);
    const region = buildStrokeRegion(outline, decorations, stroke);

    let minY = Infinity;
    let maxY = -Infinity;
    for (const value of outline.y) {
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
    }

    const measure = (ya: number, yb: number, around?: number): boolean =>
        freeSpan(index, region, ya, yb, clearLeft, clearRight, around);

    const top = minY + half + clearTop;
    const bottom = maxY - half - clearBottom;
    const step = bottom > top ? (bottom - top) / SCANLINES : 0;
    const left = new Float64Array(SCANLINES);
    const right = new Float64Array(SCANLINES);
    let fullLeft = -Infinity;
    let fullRight = Infinity;
    for (let k = 0; k < SCANLINES; k++) {
        if (step > 0 && measure(top + k * step, top + (k + 1) * step)) {
            left[k] = spanMin;
            right[k] = spanMax;
        } else {
            left[k] = Infinity;
            right[k] = -Infinity;
        }
        fullLeft = Math.max(fullLeft, left[k]);
        fullRight = Math.min(fullRight, right[k]);
    }
    return { top, bottom, step, left, right, fullWidth: fullRight - fullLeft, measure };
}

/**
 * Scratch deque of slab indices for the left bound of the sliding window in {@link widestBand}
 */
const windowMax = new Int32Array(SCANLINES + 2);
/**
 * Scratch deque of slab indices for the right bound of the sliding window in {@link widestBand}
 */
const windowMin = new Int32Array(SCANLINES + 2);

/**
 * The free interval over an arbitrary band: the slabs it covers whole read straight off the profile,
 * and the one or two it only reaches into measured over just that part of them.
 *
 * Both questions the layout asks go through here, so what the solver is told a shape can hold and
 * what the finished shape is then given are the same measurement — the two drifting apart is what
 * leaves content in a shape too small for it.
 *
 * @param profile the profile to query
 * @param y0 the top of the band
 * @param y1 the bottom of the band
 * @returns the free interval, or null if the band holds nothing
 */
function bandInterval(
    profile: ContentProfile,
    y0: number,
    y1: number
): {
    /**
     * Left bound of the free interval
     */
    min: number;
    /**
     * Right bound of the free interval
     */
    max: number;
} | null {
    const { top, step, left, right } = profile;
    const firstSlab = Math.max(0, Math.floor((y0 - top) / step + FIT_EPSILON));
    const lastSlab = Math.min(SCANLINES - 1, Math.ceil((y1 - top) / step - FIT_EPSILON) - 1);
    let lo = -Infinity;
    let hi = Infinity;
    for (let k = firstSlab; k <= lastSlab; k++) {
        const slabTop = top + k * step;
        const slabBottom = slabTop + step;
        let slabLeft: number;
        let slabRight: number;
        if (y0 <= slabTop + FIT_EPSILON && y1 >= slabBottom - FIT_EPSILON) {
            slabLeft = left[k];
            slabRight = right[k];
        } else {
            if (!profile.measure(Math.max(y0, slabTop), Math.min(y1, slabBottom))) {
                return null;
            }
            slabLeft = spanMin;
            slabRight = spanMax;
        }
        lo = Math.max(lo, slabLeft);
        hi = Math.min(hi, slabRight);
        if (hi <= lo) {
            return null;
        }
    }
    return lo > -Infinity ? { min: lo, max: hi } : null;
}

/**
 * The width of the widest band of exactly `height` — how wide content of that height may be.
 *
 * This is the constraint the `inner` solver works against: it grows with the shape, and for a shape
 * that eats into itself as it gets taller (a chevron's notch, a hexagon's corners, a note's fold) it
 * *shrinks* with the height, which is precisely what makes such a shape settle flat.
 *
 * The band is placed at every slab in turn, and the part of a slab its lower edge cuts through is
 * measured exactly rather than interpolated, so the result is a smooth function of the shape rather
 * than one that snaps to the sampling grid. A shape too short to hold the band at all reports the
 * width of its whole profile minus the height it is missing, which keeps the value continuous and
 * still pointing outwards.
 *
 * The sliding window runs over whole slabs, rounded up: a band measured that way is at most one slab
 * taller than the content asks for, so the width it reports is one a box of exactly this height can
 * really be given — which is what keeps this and {@link bestContentBox} from disagreeing about whether
 * the content fits. The winning position is then measured at the exact height, which can only be wider.
 *
 * @param profile the profile to query
 * @param height the height of the band
 * @returns the width of the widest band of that height
 */
export function widestBand(profile: ContentProfile, height: number): number {
    const usable = profile.bottom - profile.top;
    if (profile.step <= 0 || height > usable + FIT_EPSILON) {
        return profile.fullWidth - Math.max(0, height - usable);
    }
    const { top, step, left, right } = profile;
    const span = Math.min(SCANLINES, Math.max(1, Math.ceil(height / step - FIT_EPSILON)));
    const lastFirst = Math.max(0, SCANLINES - span);
    let maxHead = 0;
    let maxTail = 0;
    let minHead = 0;
    let minTail = 0;
    const pushMax = (index: number): void => {
        while (maxTail > maxHead && left[windowMax[maxTail - 1]] <= left[index]) {
            maxTail--;
        }
        windowMax[maxTail++] = index;
    };
    const pushMin = (index: number): void => {
        while (minTail > minHead && right[windowMin[minTail - 1]] >= right[index]) {
            minTail--;
        }
        windowMin[minTail++] = index;
    };
    for (let k = 0; k < span; k++) {
        pushMax(k);
        pushMin(k);
    }
    let widest = -Infinity;
    let bestFirst = 0;
    for (let first = 0; first <= lastFirst; first++) {
        while (maxHead < maxTail && windowMax[maxHead] < first) {
            maxHead++;
        }
        while (minHead < minTail && windowMin[minHead] < first) {
            minHead++;
        }
        const width = right[windowMin[minHead]] - left[windowMax[maxHead]];
        if (width > widest) {
            widest = width;
            bestFirst = first;
        }
        const next = first + span;
        if (next < SCANLINES) {
            pushMax(next);
            pushMin(next);
        }
    }
    const bandTop = top + bestFirst * step;
    const free = bandInterval(profile, bandTop, bandTop + height);
    return free == undefined ? widest : Math.max(widest, free.max - free.min);
}

/**
 * Grows a fitted box to where its constraint really binds, so its edges are not left on the sampling
 * grid: each of the four is pushed outwards by bisection against the exact free space, bottom and
 * top first (which is where a band can only end on a slab boundary) and then the two sides, which
 * fall out of measuring the free space over the final height.
 *
 * @param profile the profile the box was fitted against
 * @param box the fitted box
 * @returns the grown box, or the passed one if it cannot be measured
 */
function refine(profile: ContentProfile, box: Box): Box {
    const { step } = profile;
    const middle = box.x + box.width / 2;
    const holds = (ya: number, yb: number): boolean =>
        profile.measure(ya, yb, middle) && spanMin <= box.x + FIT_EPSILON && spanMax >= box.x + box.width - FIT_EPSILON;
    let top = box.y;
    let bottom = box.y + box.height;
    let low = bottom;
    let high = Math.min(profile.bottom, bottom + step);
    for (let i = 0; i < REFINE_STEPS && high - low > FIT_EPSILON; i++) {
        const middleY = (low + high) / 2;
        if (holds(top, middleY)) {
            low = middleY;
        } else {
            high = middleY;
        }
    }
    bottom = low;
    low = Math.max(profile.top, top - step);
    high = top;
    for (let i = 0; i < REFINE_STEPS && high - low > FIT_EPSILON; i++) {
        const middleY = (low + high) / 2;
        if (holds(middleY, bottom)) {
            high = middleY;
        } else {
            low = middleY;
        }
    }
    top = high;
    if (!profile.measure(top, bottom, middle)) {
        return box;
    }
    return { x: spanMin, y: top, width: spanMax - spanMin, height: bottom - top };
}

/**
 * The largest-area axis-aligned rectangle that fits inside the outline clear of the stroke, or null
 * if nothing fits.
 *
 * `minWidth`/`minHeight` constrain the result to rectangles that still hold a required content size;
 * a band of exactly `minHeight` is always considered, so a content box that was solved to fit
 * tightly is found even when its height falls between two slabs. That band is measured over exactly
 * the required height rather than over the slabs it happens to straddle, which is the same measurement
 * {@link widestBand} reports to the solver, so a shape solved to hold its content really does.
 *
 * @param profile the profile to fit against
 * @param minWidth the width the result has to hold
 * @param minHeight the height the result has to hold
 * @returns the largest fitting rectangle, or null if nothing fits
 */
export function bestContentBox(profile: ContentProfile, minWidth: number, minHeight: number): Box | null {
    if (profile.step <= 0) {
        return null;
    }
    const { top, step, left, right } = profile;
    let best: Box | null = null;
    let bestArea = 0;
    const record = (x: number, y: number, boxWidth: number, boxHeight: number): void => {
        if (boxWidth <= 0 || boxHeight <= 0) {
            return;
        }
        if (boxWidth < minWidth - FIT_EPSILON || boxHeight < minHeight - FIT_EPSILON) {
            return;
        }
        const area = boxWidth * boxHeight;
        if (area > bestArea) {
            bestArea = area;
            best = { x, y, width: boxWidth, height: boxHeight };
        }
    };
    for (let first = 0; first < SCANLINES; first++) {
        const bandTop = top + first * step;
        const end = bandTop + minHeight;
        const endSlab = Math.floor((end - top) / step - FIT_EPSILON);
        if (minHeight > 0 && end <= profile.bottom + FIT_EPSILON) {
            const free = bandInterval(profile, bandTop, end);
            if (free != undefined) {
                record(free.min, bandTop, free.max - free.min, minHeight);
            }
        }
        let bandLeft = -Infinity;
        let bandRight = Infinity;
        for (let last = first; last < SCANLINES; last++) {
            bandLeft = Math.max(bandLeft, left[last]);
            bandRight = Math.min(bandRight, right[last]);
            record(bandLeft, bandTop, bandRight - bandLeft, (last - first + 1) * step);
            const bandWidth = bandRight - bandLeft;
            if (last >= endSlab && (bandWidth <= 0 || bandWidth < minWidth - FIT_EPSILON)) {
                break;
            }
        }
    }
    return best == undefined ? null : refine(profile, best);
}

/**
 * The content box for a shape at a concrete size: the largest-area inscribed rectangle, held to one
 * that also fits `required` where that is given. Falls back to the unconstrained box, and finally to
 * plain per-side insets for geometry too degenerate to fit anything at all.
 *
 * @param profile the profile of the shape at this size
 * @param ir the shape the profile was built from
 * @param width the geometry width
 * @param height the geometry height
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @param required the content size the result has to hold, if any
 * @returns the content box
 */
export function contentBoxFromProfile(
    profile: ContentProfile,
    ir: ShapeIR,
    width: number,
    height: number,
    rounding: number,
    stroke: ShapeStroke,
    required?: {
        /**
         * The width the content box has to hold
         */
        width: number;
        /**
         * The height the content box has to hold
         */
        height: number;
    }
): Box {
    if (required != undefined) {
        const constrained = bestContentBox(profile, required.width, required.height);
        if (constrained != undefined) {
            return constrained;
        }
    }
    const box = bestContentBox(profile, 0, 0);
    if (box != undefined) {
        return box;
    }
    const half = stroke.width / 2;
    const clearLeft = half + Math.max(0, evalAffine(ir.content.left, width, height, rounding));
    const clearRight = half + Math.max(0, evalAffine(ir.content.right, width, height, rounding));
    const clearTop = half + Math.max(0, evalAffine(ir.content.top, width, height, rounding));
    const clearBottom = half + Math.max(0, evalAffine(ir.content.bottom, width, height, rounding));
    return {
        x: clearLeft,
        y: clearTop,
        width: Math.max(0, width - clearLeft - clearRight),
        height: Math.max(0, height - clearTop - clearBottom)
    };
}

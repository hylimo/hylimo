import type { ShapeIR } from "./shapeIr.js";
import { evaluateDecorations, evaluateVertices } from "./shapeIr.js";

import type { ShapeStroke, Box } from "./types.js";
import { buildExactRegion } from "./exactRegion.js";
import type { ExactRegion, Span } from "./exactRegion.js";

/**
 * Content fitting for a shape outline.
 *
 * Content may go anywhere inside the outline that the stroke does not already cover. Where that is
 * lives entirely in {@link ExactRegion}, which measures it on the segments, arcs and curves the
 * renderer draws; this module is the search on top of it, and it answers the two questions the
 * layout asks:
 * - given the outer size, the largest inscribed rectangle ({@link bestContentBox}),
 * - given the content, how wide a band of the content's height would be ({@link widestBand}), which
 *   is the constraint the `inner` solver minimises the shape's area against.
 *
 * Both go through one data structure, the {@link ContentProfile}: the shape cut into horizontal
 * slabs, each recording the widest interval that is free over the *whole* slab rather than at one
 * height. A rectangle fits exactly when it stays inside the free interval of every slab it covers,
 * so an inscribed rectangle is a *band* of slabs, its width the narrowest free interval over that
 * band.
 *
 * The slabs are cut at the shape's own breakpoints ({@link ExactRegion.candidates}) rather than at
 * a chosen resolution, and that is what makes a slab exact rather than a conservative sample of
 * itself: no piece of the outline or of the stroke begins or ends inside one, so every boundary
 * bounding it is a single smooth monotone branch and the slab holds precisely what its two edges
 * say. A default shape needs 2 to 14 of them.
 *
 * Neither answer can be read off the slabs alone, because neither optimum has to sit on a
 * breakpoint — a diamond's widest band does not, and an ellipse's largest rectangle has its edges
 * at `h/(2√2)`, where nothing whatsoever happens to the outline. So both are searched rather than
 * enumerated, each bounded from the profile so that only a handful of positions is ever measured.
 *
 * A slab may well be cut into several free intervals — a wavy lower edge leaves a lobe at either
 * end just below its crest — and only one of them is recorded, the widest. That can under-use a
 * shape whose lobes trade places from one slab to the next, but it can never over-use one:
 * whichever interval a slab contributes is genuinely free, so any band, being their intersection,
 * is free too.
 */

/**
 * Tolerance (px) for the "at least this wide/tall" comparisons
 */
const FIT_EPSILON = 1e-9;

/**
 * Creates a span to measure into
 *
 * @returns the created span
 */
function createSpan(): Span {
    return { min: 0, max: 0 };
}

/**
 * Steps of bisection used to grow a fitted box to where its constraint really binds
 */
const REFINE_STEPS = 30;

/**
 * The free space of a shape, cut into slabs. `left[k]`/`right[k]` bound the interval content may
 * occupy anywhere within slab `k`; an empty slab is recorded as `left = +Infinity`,
 * `right = -Infinity` so it poisons any band covering it.
 *
 * The slabs are cut at the shape's *own* breakpoints — the heights where a piece of the outline or
 * of the stroke begins or ends, {@link ExactRegion.candidates} — not at a chosen resolution. Every
 * boundary of the region is then a single smooth branch across a whole slab, so the slab's interval
 * is *exactly* what it holds rather than a conservative sample of it, and a default shape needs 2
 * to 14 slabs to say so.
 *
 * A shape whose path holds no segment of any length has no slabs at all, and the caller falls back
 * to the box the stroke alone leaves.
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
     * The slab boundaries, ascending, `slabs + 1` of them: `heights[0]` is {@link top} and
     * `heights[slabs]` is {@link bottom}
     */
    readonly heights: Float64Array;
    /**
     * How many slabs the profile holds; `0` for a geometry too degenerate to hold anything
     */
    readonly slabs: number;
    /**
     * Left bound of the free interval of each slab
     */
    readonly left: Float64Array;
    /**
     * Right bound of the free interval of each slab
     */
    readonly right: Float64Array;
    /**
     * Widest the region gets *anywhere* inside each slab, which no band touching that slab can
     * exceed. {@link left} and {@link right} bound what a band covering the whole slab may occupy;
     * this bounds what one merely passing through it may, and that is what lets {@link widestBand}
     * rule out a stretch of band positions without measuring any of them.
     *
     * Every boundary inside a slab is monotone, so the slab's extremes are at its two edges and
     * this costs no measurement of its own.
     */
    readonly outer: Float64Array;
    /**
     * Width of the band covering the whole profile (negative if not even that band is free)
     */
    readonly fullWidth: number;
    /**
     * The geometry the slabs were measured from, which is asked directly for everything the slabs
     * cannot answer: the tail of a band that ends between two of them, and the refinement of a
     * fitted box. {@link EMPTY_REGION} for a shape with no geometry to measure.
     */
    readonly region: ExactRegion;
}

/**
 * Stands in for the region of a shape whose path holds no segment of any length. It reports nothing
 * free anywhere, which is the truth about such a shape, and saves every caller a branch it would
 * only ever take together with `slabs === 0`.
 */
const EMPTY_REGION: ExactRegion = {
    top: 0,
    bottom: 0,
    candidates: [],
    runs: () => undefined,
    measure: () => false
};

/**
 * Measures the free space of a shape at a concrete size into a {@link ContentProfile}.
 *
 * The usable height is the outline's own extent, and each slab holds what the stroke leaves free
 * across it. The stroke of a decoration blocks exactly as the outline's does, so content flows around
 * a component's ports and below a database's rim without any shape-specific knowledge.
 *
 * The slabs start where content can: a box edge cannot come closer than the stroke half-width to the
 * outline's own top or bottom, so laying them out from there makes a shape with a flat top and
 * bottom — the common one — measure its content height exactly. A shape whose extreme is a lone
 * spike gives up the sliver above it.
 *
 * @param ir the shape to measure
 * @param width the geometry width
 * @param height the geometry height
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @returns the measured profile
 */
export function buildContentProfile(
    ir: ShapeIR,
    width: number,
    height: number,
    rounding: number,
    stroke: ShapeStroke
): ContentProfile {
    const region = buildExactRegion(
        evaluateVertices(ir, width, height, rounding),
        evaluateDecorations(ir, width, height, rounding),
        stroke
    );
    if (region == undefined) {
        return emptyProfile();
    }
    const top = region.top;
    const bottom = region.bottom;
    const heights = slabHeights(top, bottom, region);
    const slabs = Math.max(0, heights.length - 1);
    const left = new Float64Array(slabs);
    const right = new Float64Array(slabs);
    const outer = new Float64Array(slabs);
    let fullLeft = -Infinity;
    let fullRight = Infinity;
    const span = createSpan();
    /**
     * Left bound of the region at a single slab boundary, which every band through that height
     * stays inside
     */
    const pointLeft = new Float64Array(slabs + 1);
    /**
     * Right bound of the region at a single slab boundary
     */
    const pointRight = new Float64Array(slabs + 1);
    for (let k = 0; k <= slabs; k++) {
        if (region.measure(heights[k], heights[k], span)) {
            pointLeft[k] = span.min;
            pointRight[k] = span.max;
        } else {
            pointLeft[k] = Infinity;
            pointRight[k] = -Infinity;
        }
    }
    for (let k = 0; k < slabs; k++) {
        if (region.measure(heights[k], heights[k + 1], span)) {
            left[k] = span.min;
            right[k] = span.max;
        } else {
            left[k] = Infinity;
            right[k] = -Infinity;
        }
        outer[k] = Math.max(pointRight[k], pointRight[k + 1]) - Math.min(pointLeft[k], pointLeft[k + 1]);
        fullLeft = Math.max(fullLeft, left[k]);
        fullRight = Math.min(fullRight, right[k]);
    }
    return { top, bottom, heights, slabs, left, right, outer, fullWidth: fullRight - fullLeft, region };
}

/**
 * A profile for a shape with no geometry to measure — one whose path holds no segment of any length.
 * Every band of it is empty, so {@link bestContentBox} finds nothing and the caller falls back to
 * the box the stroke alone leaves.
 *
 * @returns the empty profile
 */
function emptyProfile(): ContentProfile {
    const nothing = new Float64Array(0);
    return {
        top: 0,
        bottom: 0,
        heights: nothing,
        slabs: 0,
        left: nothing,
        right: nothing,
        outer: nothing,
        fullWidth: -Infinity,
        region: EMPTY_REGION
    };
}

/**
 * The slab boundaries of a profile: the shape's own breakpoints, bracketed by the top and bottom of
 * the region. A breakpoint too close to its neighbour to separate them is dropped — it would only
 * cost a slab without narrowing anything.
 *
 * @param top the top of the region
 * @param bottom the bottom of the region
 * @param region the exact region
 * @returns the slab boundaries, ascending
 */
function slabHeights(top: number, bottom: number, region: ExactRegion): Float64Array {
    if (!(bottom > top)) {
        return new Float64Array(0);
    }
    const kept: number[] = [top];
    for (const y of region.candidates) {
        if (y > kept[kept.length - 1] + FIT_EPSILON && y < bottom - FIT_EPSILON) {
            kept.push(y);
        }
    }
    kept.push(bottom);
    return Float64Array.from(kept);
}

/**
 * The first of an ascending list of heights that lies strictly below a height
 *
 * @param heights the heights to search, ascending
 * @param y the height to start from
 * @param fallback what to return if there is none
 * @returns the next height below
 */
function nextHeight(heights: Float64Array, y: number, fallback: number): number {
    for (let k = 0; k < heights.length; k++) {
        if (heights[k] > y + FIT_EPSILON) {
            return heights[k];
        }
    }
    return fallback;
}

/**
 * The last of an ascending list of heights that lies strictly above a height
 *
 * @param heights the heights to search, ascending
 * @param y the height to start from
 * @param fallback what to return if there is none
 * @returns the previous height above
 */
function previousHeight(heights: Float64Array, y: number, fallback: number): number {
    for (let k = heights.length - 1; k >= 0; k--) {
        if (heights[k] < y - FIT_EPSILON) {
            return heights[k];
        }
    }
    return fallback;
}

/**
 * The index of the slab a height falls in, or the nearest one if it falls outside
 *
 * @param profile the profile to search
 * @param y the height to look up
 * @returns the index of the slab containing the height
 */
function slabAt(profile: ContentProfile, y: number): number {
    const heights = profile.heights;
    let low = 0;
    let high = profile.slabs - 1;
    while (low < high) {
        const middle = (low + high + 1) >> 1;
        if (heights[middle] <= y) {
            low = middle;
        } else {
            high = middle - 1;
        }
    }
    return low;
}

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
 * @param into filled with the free interval that was found
 * @returns true if the band holds anything, which is then left in `into`
 */
function bandInterval(profile: ContentProfile, y0: number, y1: number, into: Span): boolean {
    const { heights, left, right, slabs } = profile;
    if (slabs === 0) {
        return false;
    }
    const firstSlab = slabAt(profile, y0 + FIT_EPSILON);
    const lastSlab = slabAt(profile, Math.max(y0, y1 - FIT_EPSILON));
    let lo = -Infinity;
    let hi = Infinity;
    for (let k = firstSlab; k <= lastSlab; k++) {
        const slabTop = heights[k];
        const slabBottom = heights[k + 1];
        let slabLeft: number;
        let slabRight: number;
        if (y0 <= slabTop + FIT_EPSILON && y1 >= slabBottom - FIT_EPSILON) {
            slabLeft = left[k];
            slabRight = right[k];
        } else {
            if (!profile.region.measure(Math.max(y0, slabTop), Math.min(y1, slabBottom), into)) {
                return false;
            }
            slabLeft = into.min;
            slabRight = into.max;
        }
        lo = Math.max(lo, slabLeft);
        hi = Math.min(hi, slabRight);
        if (hi <= lo) {
            return false;
        }
    }
    if (!(lo > -Infinity)) {
        return false;
    }
    into.min = lo;
    into.max = hi;
    return true;
}

/**
 * The width of the slabs a band covers *whole*, which is an upper bound on the width of any band
 * that covers them and more. Constraints are only dropped, never added, so this can be used to rule
 * a whole stretch of band positions out without measuring any of them.
 *
 * @param profile the profile to query
 * @param y0 the top of the range every candidate band covers
 * @param y1 the bottom of that range
 * @returns the upper bound, `Infinity` if the range is empty and nothing can be ruled out
 */
function coreWidth(profile: ContentProfile, y0: number, y1: number): number {
    if (!(y1 > y0) || profile.slabs === 0) {
        return Infinity;
    }
    const { heights, left, right, slabs } = profile;
    let lo = -Infinity;
    let hi = Infinity;
    for (let k = slabAt(profile, y0); k < slabs && heights[k] < y1; k++) {
        if (heights[k] >= y0 - FIT_EPSILON && heights[k + 1] <= y1 + FIT_EPSILON) {
            lo = Math.max(lo, left[k]);
            hi = Math.min(hi, right[k]);
        }
    }
    return hi > lo ? hi - lo : lo === -Infinity ? Infinity : -Infinity;
}

/**
 * The golden section's shorter part, for the steps of {@link maximize} that cannot use a parabola
 */
const GOLDEN_SECTION = 0.381966011250105;

/**
 * Most probes {@link maximize} may spend on one stretch, which it reaches only where the width has
 * a kink and the parabola is no help
 */
const BAND_SEARCH_STEPS = 16;

/**
 * Relative width the bracket in {@link maximize} is narrowed to. A smooth maximum is flat, so the
 * width is found far more accurately than the position it sits at; even at a kink, where the two
 * converge together, this leaves a residue some four orders below the width tolerance the `inner`
 * solver stops at. Nothing downstream is finer: the reported box is measured by {@link refine}.
 */
const BAND_SEARCH_TOLERANCE = 1e-7;

/**
 * Stands in for a band that holds nothing, so the parabola stays arithmetic
 */
const NOTHING = -1e300;

/**
 * The greatest value of a function over a bracket, by Brent's method: fit a parabola through the
 * three best probes so far and jump to its vertex, falling back to a golden step whenever that jump
 * would be wild or leave the bracket.
 *
 * Which matters because of what is being maximised. The width of a band as it slides is smooth —
 * it is built from boundaries that are lines and arcs — and on a smooth function a parabola
 * converges quadratically where the golden section only ever removes a fixed fraction. That is the
 * difference between about ten probes and about forty, and every probe is a measurement of the
 * shape. Where the width has a kink, which is where the constraint binding one edge of the band
 * hands over to another, the parabola is rejected and the search degrades to the golden section it
 * would otherwise have been.
 *
 * @param f the function to maximise, which may return {@link NOTHING} where it has no value
 * @param low the lower end of the bracket
 * @param high the upper end of the bracket
 * @param out filled with where the greatest value was found
 * @returns the greatest value found
 */
function maximize(f: (x: number) => number, low: number, high: number, out: Span): number {
    let a = low;
    let b = high;
    let x = a + GOLDEN_SECTION * (b - a);
    let w = x;
    let v = x;
    let fx = f(x);
    let fw = fx;
    let fv = fx;
    let step = 0;
    let previousStep = 0;
    for (let iteration = 0; iteration < BAND_SEARCH_STEPS; iteration++) {
        const middle = 0.5 * (a + b);
        const tolerance = BAND_SEARCH_TOLERANCE * Math.abs(x) + 1e-12;
        if (Math.abs(x - middle) <= 2 * tolerance - 0.5 * (b - a)) {
            break;
        }
        let parabolic = false;
        if (Math.abs(previousStep) > tolerance) {
            const r = (x - w) * (fx - fv);
            let q = (x - v) * (fx - fw);
            let p = (x - v) * q - (x - w) * r;
            q = 2 * (q - r);
            if (q > 0) {
                p = -p;
            } else {
                q = -q;
            }
            const before = previousStep;
            previousStep = step;
            if (Math.abs(p) < Math.abs(0.5 * q * before) && p > q * (a - x) && p < q * (b - x)) {
                step = p / q;
                if (x + step - a < 2 * tolerance || b - (x + step) < 2 * tolerance) {
                    step = middle >= x ? tolerance : -tolerance;
                }
                parabolic = true;
            }
        }
        if (!parabolic) {
            previousStep = x >= middle ? a - x : b - x;
            step = GOLDEN_SECTION * previousStep;
        }
        const u = Math.abs(step) >= tolerance ? x + step : x + (step >= 0 ? tolerance : -tolerance);
        const fu = f(u);
        if (fu >= fx) {
            if (u >= x) {
                a = x;
            } else {
                b = x;
            }
            v = w;
            w = x;
            x = u;
            fv = fw;
            fw = fx;
            fx = fu;
        } else {
            if (u < x) {
                a = u;
            } else {
                b = u;
            }
            if (fu >= fw || w === x) {
                v = w;
                w = u;
                fv = fw;
                fw = fu;
            } else if (fu >= fv || v === x || v === w) {
                v = u;
                fv = fu;
            }
        }
    }
    out.min = x;
    return fx;
}

/**
 * The width of the widest band of exactly `height` — how wide content of that height may be.
 *
 * This is the constraint the `inner` solver works against: it grows with the shape, and for a shape
 * that eats into itself as it gets taller (a chevron's notch, a hexagon's corners, a note's fold) it
 * *shrinks* with the height, which is precisely what makes such a shape settle flat.
 *
 * A shape too short to hold the band at all reports the width of its whole profile minus the height
 * it is missing, which keeps the value continuous and still pointing outwards.
 *
 * Where the band sits is searched rather than sampled. Slide it and the set of slabs it covers only
 * changes when one of its two edges crosses a slab boundary, so the positions where the binding
 * constraint changes are exactly `heights[i]` and `heights[i] - height` — a few dozen, all measured
 * outright. Between two of them every bound moves smoothly, and the optimum can sit strictly
 * inside: for a diamond it sits where the right bound at the band's top crosses the one at its
 * bottom, which is a local *maximum* of their minimum and therefore at no breakpoint at all. Those
 * stretches are searched by golden section, but only the ones worth searching — a stretch cannot
 * beat a band wider than {@link coreWidth} of the slabs every position in it covers, and that bound
 * is read straight off the profile.
 *
 * @param profile the profile to query
 * @param height the height of the band
 * @returns the width of the widest band of that height
 */
export function widestBand(profile: ContentProfile, height: number): number {
    return widestBandSearch(profile, height, createSpan());
}

/**
 * The widest band of exactly `height` and where it sits, which is {@link widestBand} plus the one
 * thing {@link bestContentBox} needs from it: the position.
 *
 * The two have to agree. What the solver is told a shape can hold and what the finished shape is
 * then given must be the same measurement, or a shape solved to fit its content exactly is handed
 * a box that does not hold it — and since the solver settles on a shape that fits with no slack at
 * all, sharing the search is the only way to be sure.
 *
 * @param profile the profile to query
 * @param height the height of the band
 * @param at filled with the height the widest band starts at, in `min`
 * @returns the width of the widest band of that height
 */
function widestBandSearch(profile: ContentProfile, height: number, at: Span): number {
    const usable = profile.bottom - profile.top;
    at.min = profile.top;
    if (profile.slabs === 0 || height > usable + FIT_EPSILON) {
        return profile.fullWidth - Math.max(0, height - usable);
    }
    const { top, bottom, heights, slabs } = profile;
    const lastTop = bottom - height;
    const interval = createSpan();
    const widthAt = (y0: number): number =>
        bandInterval(profile, y0, y0 + height, interval) ? interval.max - interval.min : -Infinity;

    const stops: number[] = [top, lastTop];
    for (let i = 0; i <= slabs; i++) {
        for (const y of [heights[i], heights[i] - height]) {
            if (y > top + FIT_EPSILON && y < lastTop - FIT_EPSILON) {
                stops.push(y);
            }
        }
    }
    stops.sort((a, b) => a - b);

    let widest = -Infinity;
    for (const stop of stops) {
        const width = widthAt(stop);
        if (width > widest) {
            widest = width;
            at.min = stop;
        }
    }

    /**
     * The widest any band starting in a stretch can be, bounded two ways, both read straight off
     * the profile. Every band starting in the stretch covers whatever lies between the stretch's
     * own end and the far edge of the earliest band, so those slabs bound them all; and every band
     * in it passes through the slabs its two edges start in, so the widest the region gets anywhere
     * in those bounds them too — which is the bound that bites when the band is short next to the
     * slabs, where the first one has nothing to say.
     */
    const bound = (i: number): number =>
        Math.min(
            coreWidth(profile, stops[i + 1], stops[i] + height),
            profile.outer[slabAt(profile, stops[i] + FIT_EPSILON)],
            profile.outer[slabAt(profile, Math.max(stops[i], stops[i] + height - FIT_EPSILON))]
        );
    const pending: number[] = [];
    for (let i = 0; i + 1 < stops.length; i++) {
        if (stops[i + 1] - stops[i] > FIT_EPSILON) {
            pending.push(i);
        }
    }
    pending.sort((a, b) => bound(b) - bound(a));
    const spanA = createSpan();
    const spanB = createSpan();
    /**
     * Where the maximum of a stretch was found — a span of its own, as the search is measuring into
     * the other two as it goes
     */
    const position = createSpan();
    for (const i of pending) {
        const low = stops[i];
        const high = stops[i + 1];
        if (!(bound(i) > widest + FIT_EPSILON)) {
            continue;
        }
        const firstSlab = slabAt(profile, low + FIT_EPSILON);
        const lastSlab = slabAt(profile, Math.max(low, low + height - FIT_EPSILON));
        let coreLeft = -Infinity;
        let coreRight = Infinity;
        for (let k = firstSlab + 1; k < lastSlab; k++) {
            coreLeft = Math.max(coreLeft, profile.left[k]);
            coreRight = Math.min(coreRight, profile.right[k]);
        }
        /**
         * The width of the band starting at a height inside this stretch. Which slabs the band
         * covers whole is what a breakpoint changes, so across one stretch it is fixed: those slabs
         * fold into the two constants above and only the two partial ends stay to be measured,
         * which is the difference between re-walking the band and touching its edges.
         */
        const stretchWidth = (y0: number): number => {
            if (firstSlab === lastSlab) {
                return profile.region.measure(y0, y0 + height, spanA) ? spanA.max - spanA.min : NOTHING;
            }
            if (
                !profile.region.measure(y0, heights[firstSlab + 1], spanA) ||
                !profile.region.measure(heights[lastSlab], y0 + height, spanB)
            ) {
                return NOTHING;
            }
            const lo = Math.max(coreLeft, spanA.min, spanB.min);
            const hi = Math.min(coreRight, spanA.max, spanB.max);
            return hi > lo ? hi - lo : NOTHING;
        };
        const found = maximize(stretchWidth, low, high, position);
        if (found > widest) {
            widest = found;
            at.min = position.min;
        }
    }
    return widest;
}

/**
 * Grows a fitted box to where its constraint really binds: each of the four edges is pushed
 * outwards by bisection against the free space, bottom and top first and then the two sides, which
 * fall out of measuring the free space over the final height.
 *
 * The winning box comes out of a search that stops at a local optimum per cell — and, where the
 * cheap enumeration of whole-slab bands wins, out of edges sitting exactly on two slab boundaries.
 * Neither is where the shape actually stops giving way, and this is what closes that gap. It grows
 * the box it is handed rather than re-deriving one, so the result is that band measured to where it
 * binds and not necessarily the largest rectangle of the whole shape.
 *
 * Growing can only ever find more room, so a box that satisfied a required size before still does
 * after, which is the one guarantee the whole search rests on.
 *
 * An edge can only have been left on one of the heights it was chosen from, so the next one over
 * brackets where it can have moved to, and each bisection has somewhere finite to search.
 *
 * @param profile the profile the box was fitted against
 * @param box the fitted box
 * @param bounds the heights the box's edges were chosen from, which bracket where they can move to
 * @returns the grown box, or the passed one if it cannot be measured
 */
function refine(profile: ContentProfile, box: Box, bounds: Float64Array): Box {
    const middle = box.x + box.width / 2;
    const span = createSpan();
    const measure = (ya: number, yb: number, into: Span): boolean => profile.region.measure(ya, yb, into, middle);
    const holds = (ya: number, yb: number): boolean =>
        measure(ya, yb, span) && span.min <= box.x + FIT_EPSILON && span.max >= box.x + box.width - FIT_EPSILON;
    let top = box.y;
    let bottom = box.y + box.height;
    let low = bottom;
    let high = Math.min(profile.bottom, nextHeight(bounds, bottom, profile.bottom));
    for (let i = 0; i < REFINE_STEPS && high - low > FIT_EPSILON; i++) {
        const middleY = (low + high) / 2;
        if (holds(top, middleY)) {
            low = middleY;
        } else {
            high = middleY;
        }
    }
    bottom = low;
    low = Math.max(profile.top, previousHeight(bounds, top, profile.top));
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
    /*
     * The bisections above left `span` on whichever probe they tried last, so the box the two of
     * them actually settled on is measured before its interval is read off.
     */
    if (!measure(top, bottom, span)) {
        return box;
    }
    return { x: span.min, y: top, width: span.max - span.min, height: bottom - top };
}

/**
 * Rounds of coordinate ascent spent on one cell in {@link bestContentBox}
 */
const FIT_ROUNDS = 3;

/**
 * The largest-area axis-aligned rectangle that fits inside the outline clear of the stroke, or null
 * if nothing fits.
 *
 * `minWidth`/`minHeight` constrain the result to rectangles that still hold a required content size.
 * A band of exactly `minHeight` is always considered, found by the same search {@link widestBand}
 * reports to the solver — so a shape solved to hold its content really does, which matters all the
 * more now that the solver leaves it no slack.
 *
 * The largest rectangle itself cannot be enumerated the way that band can. Sliding a band of known
 * height, the binding constraint only changes at a slab boundary; here *both* edges are free and
 * the area peaks at a breakpoint of nothing — an ellipse's largest inscribed rectangle has its
 * edges at `h/(2√2)`, a height at which nothing whatsoever happens to the outline.
 *
 * So it is searched rather than sampled. Which slabs a rectangle covers whole is fixed by which
 * slabs its two edges fall in, so the pairs of slabs `(i, j)` cut the problem into cells, and inside
 * a cell the area is a smooth function of the two edges — smooth because within a slab every
 * boundary of the region is a single monotone branch. Moving one edge at a time crawls along a
 * ridge, and the largest rectangle sits on one: a rounded rectangle's grows by giving way at the
 * top and the bottom together, and neither move pays on its own. So each round also searches the
 * two directions that move both edges — apart, and along — which is what actually reaches it. Each cell carries an upper bound that costs
 * nothing to compute: its tallest possible rectangle times the narrowest the region gets over the
 * slabs every rectangle in it must cover. Cells are taken best-bound first and dropped as soon as
 * that bound falls below the best rectangle already found, which for a shape of a dozen slabs
 * leaves a handful to actually search.
 *
 * @param profile the profile to fit against
 * @param minWidth the width the result has to hold
 * @param minHeight the height the result has to hold
 * @returns the largest fitting rectangle, or null if nothing fits
 */
function bestContentBox(profile: ContentProfile, minWidth: number, minHeight: number): Box | null {
    if (profile.slabs === 0) {
        return null;
    }
    const { heights, left, right, outer, slabs } = profile;
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
    /**
     * Records the band of exactly the required height starting at a given top
     */
    const interval = createSpan();
    const required = (bandTop: number): void => {
        if (minHeight <= 0 || bandTop < profile.top - FIT_EPSILON) {
            return;
        }
        const end = bandTop + minHeight;
        if (end > profile.bottom + FIT_EPSILON) {
            return;
        }
        if (bandInterval(profile, bandTop, end, interval)) {
            record(interval.min, bandTop, interval.max - interval.min, minHeight);
        }
    };
    /**
     * The area of the rectangle a band yields, or {@link NOTHING} where it yields none
     */
    const areaOf = (y0: number, y1: number): number => {
        if (y1 - y0 < Math.max(minHeight, 0) - FIT_EPSILON || y1 <= y0) {
            return NOTHING;
        }
        if (!bandInterval(profile, y0, y1, interval)) {
            return NOTHING;
        }
        const width = interval.max - interval.min;
        if (width <= 0 || width < minWidth - FIT_EPSILON) {
            return NOTHING;
        }
        record(interval.min, y0, width, y1 - y0);
        return width * (y1 - y0);
    };

    /*
     * The band the solver was promised, at the position it was promised at.
     */
    if (minHeight > 0) {
        const at = createSpan();
        widestBandSearch(profile, minHeight, at);
        required(at.min);
        for (let k = 0; k <= slabs; k++) {
            required(heights[k]);
            required(heights[k] - minHeight);
        }
    }
    /*
     * An incumbent from the bands that span whole slabs, which costs only array reads and gives the
     * bounds below something to beat.
     */
    for (let first = 0; first < slabs; first++) {
        let bandLeft = -Infinity;
        let bandRight = Infinity;
        for (let last = first; last < slabs; last++) {
            bandLeft = Math.max(bandLeft, left[last]);
            bandRight = Math.min(bandRight, right[last]);
            record(bandLeft, heights[first], bandRight - bandLeft, heights[last + 1] - heights[first]);
        }
    }

    const cells: number[] = [];
    const bounds: number[] = [];
    for (let i = 0; i < slabs; i++) {
        let coreLeft = -Infinity;
        let coreRight = Infinity;
        for (let j = i; j < slabs; j++) {
            if (j >= i + 2) {
                coreLeft = Math.max(coreLeft, left[j - 1]);
                coreRight = Math.min(coreRight, right[j - 1]);
            }
            const tallest = heights[j + 1] - heights[i];
            if (tallest < minHeight - FIT_EPSILON) {
                continue;
            }
            const core = coreLeft === -Infinity ? Infinity : coreRight - coreLeft;
            const widest = Math.min(core, outer[i], outer[j]);
            if (!(widest > 0) || widest < minWidth - FIT_EPSILON) {
                continue;
            }
            cells.push(i * slabs + j);
            bounds.push(tallest * widest);
        }
    }
    const order = cells.map((_, index) => index).sort((a, b) => bounds[b] - bounds[a]);

    const position = createSpan();
    for (const index of order) {
        if (!(bounds[index] > bestArea + FIT_EPSILON)) {
            break;
        }
        const i = Math.floor(cells[index] / slabs);
        const j = cells[index] % slabs;
        /*
         * Two starts, as coordinate ascent only ever climbs to the nearest peak: the cell's tallest
         * band, and the one spanning the middles of its two slabs.
         */
        for (const start of [0, 1]) {
            let y0 = start === 0 ? heights[i] : 0.5 * (heights[i] + heights[i + 1]);
            let y1 = start === 0 ? heights[j + 1] : 0.5 * (heights[j] + heights[j + 1]);
            if (y1 <= y0) {
                continue;
            }
            for (let round = 0; round < FIT_ROUNDS; round++) {
                const topHigh = Math.min(heights[i + 1], y1 - Math.max(minHeight, 0));
                if (topHigh > heights[i] + FIT_EPSILON) {
                    maximize((y) => areaOf(y, y1), heights[i], topHigh, position);
                    y0 = position.min;
                }
                const bottomLow = Math.max(heights[j], y0 + Math.max(minHeight, 0));
                if (heights[j + 1] > bottomLow + FIT_EPSILON) {
                    maximize((y) => areaOf(y0, y), bottomLow, heights[j + 1], position);
                    y1 = position.min;
                }
                let low = Math.max(y0 - heights[i + 1], heights[j] - y1);
                let high = Math.min(y0 - heights[i], heights[j + 1] - y1);
                if (high > low + FIT_EPSILON) {
                    const at = maximize((t) => areaOf(y0 - t, y1 + t), low, high, position) > NOTHING;
                    if (at) {
                        y0 -= position.min;
                        y1 += position.min;
                    }
                }
                low = Math.max(heights[i] - y0, heights[j] - y1);
                high = Math.min(heights[i + 1] - y0, heights[j + 1] - y1);
                if (high > low + FIT_EPSILON) {
                    const at = maximize((t) => areaOf(y0 + t, y1 + t), low, high, position) > NOTHING;
                    if (at) {
                        y0 += position.min;
                        y1 += position.min;
                    }
                }
            }
        }
    }
    return best == undefined ? null : refine(profile, best, heights);
}

/**
 * The content box for a shape at a concrete size: the largest-area inscribed rectangle, held to one
 * that also fits `required` where that is given. Falls back to the unconstrained box, and finally to
 * the box the stroke alone leaves for geometry too degenerate to fit anything at all.
 *
 * @param profile the profile of the shape at this size
 * @param width the geometry width
 * @param height the geometry height
 * @param stroke the stroke the shape is painted with
 * @param required the content size the result has to hold, if any
 * @returns the content box
 */
export function contentBoxFromProfile(
    profile: ContentProfile,
    width: number,
    height: number,
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
    return {
        x: half,
        y: half,
        width: Math.max(0, width - 2 * half),
        height: Math.max(0, height - 2 * half)
    };
}

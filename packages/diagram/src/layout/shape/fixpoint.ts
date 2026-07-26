import { svgPathBbox } from "@hylimo/diagram-common";
import svgpath from "svgpath";
import type { ShapeIR } from "./shapeIr.js";
import { evaluateDecorations, evaluateVertices } from "./shapeIr.js";
import { decorationsToSvgPath, outlineToSvgPath } from "./geometry.js";
import { buildContentProfile, contentBoxFromProfile, widestBand } from "./contentBox.js";
import type { ShapeStroke, SizingMode, Size, Box } from "./types.js";

/**
 * The result of laying out a parametric shape at a concrete size
 */
export interface ShapeLayoutResult {
    /**
     * Final outline path, translated so the rendered top-left sits at (0, 0)
     */
    path: string;
    /**
     * Decoration sub-paths (database rim, component ports, …), same translation as `path`; "" if none
     */
    decorationPath: string;
    /**
     * Rendered outer size, stroke overflow included
     */
    size: Size;
    /**
     * The centerline geometry box (W, H) the solver converged on
     */
    geometry: Size;
    /**
     * Content box in rendered coordinates
     */
    contentBox: Box;
    /**
     * Number of fixpoint iterations performed
     */
    iterations: number;
}

/**
 * Iterations after which the fixpoint gives up, no matter how large the residual still is
 */
const MAX_ITERATIONS = 50;
/**
 * Target residual (in px) at which the fixpoint is considered solved
 */
const EPSILON = 1e-6;
/**
 * Below this damping factor the step is too small to matter; stop and keep the best geometry
 */
const DAMPING_FLOOR = 1e-3;
/**
 * Consecutive non-improving iterations after which the fixpoint gives up (target unreachable)
 */
const STALL_LIMIT = 6;
/**
 * The smallest extent a geometry box may be solved at, keeping every division well-conditioned
 */
const MIN_DIM = 0.001;

/**
 * Lower end of the slope band: the response can't sensibly move less than ¼ per unit geometry
 */
const MIN_SLOPE = 0.25;
/**
 * Upper end of the slope band: the response can't sensibly move more than 4× per unit geometry
 */
const MAX_SLOPE = 4;

/**
 * Estimates d(response)/d(dimension) from the current and previous iterate (a secant slope),
 * falling back to 1 on the first step or an ill-conditioned difference, and clamped to a sane
 * band so a flat or noisy measurement can't blow the step up.
 *
 * @param x the current dimension
 * @param prevX the dimension of the previous iterate, or undefined on the first step
 * @param resp the response measured at `x`
 * @param prevResp the response measured at `prevX`
 * @returns the estimated slope, clamped to the slope band
 */
function estimateSlope(x: number, prevX: number | undefined, resp: number, prevResp: number): number {
    if (prevX === undefined) {
        return 1;
    }
    const dx = x - prevX;
    if (Math.abs(dx) < MIN_DIM) {
        return 1;
    }
    const slope = (resp - prevResp) / dx;
    if (!Number.isFinite(slope) || slope <= 0) {
        return 1;
    }
    return Math.max(MIN_SLOPE, Math.min(MAX_SLOPE, slope));
}

/**
 * The outline of a shape rendered at one concrete geometry, together with its measured bounds
 */
interface Measurement {
    /**
     * The outline path at this geometry, before translation
     */
    path: string;
    /**
     * Decoration sub-paths at this geometry (before translation); "" if the shape has none
     */
    decoPath: string;
    /**
     * Minimum x of the raw geometry (centerline) box
     */
    originX: number;
    /**
     * Minimum y of the raw geometry (centerline) box
     */
    originY: number;
    /**
     * Stroke overflow past the left edge of the geometry box
     */
    overflowLeft: number;
    /**
     * Stroke overflow past the right edge of the geometry box
     */
    overflowRight: number;
    /**
     * Stroke overflow past the top edge of the geometry box
     */
    overflowTop: number;
    /**
     * Stroke overflow past the bottom edge of the geometry box
     */
    overflowBottom: number;
    /**
     * Rendered width, meaning the geometry width plus the horizontal overflow
     */
    renderWidth: number;
    /**
     * Rendered height, meaning the geometry height plus the vertical overflow
     */
    renderHeight: number;
}

/**
 * Renders the outline and the decorations at a concrete geometry and measures their combined bounds.
 * The decorations are stroked too, so they count toward the rendered bounds (a component's ports poke
 * out past the body), but the two paths are kept apart so the renderer can fill the outline without
 * filling an open rim into a crescent.
 *
 * @param ir the shape to measure
 * @param width the geometry width
 * @param height the geometry height
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @returns the measurement at this geometry
 */
function measure(ir: ShapeIR, width: number, height: number, rounding: number, stroke: ShapeStroke): Measurement {
    const w = Math.max(MIN_DIM, width);
    const h = Math.max(MIN_DIM, height);
    const path = outlineToSvgPath(evaluateVertices(ir, w, h, rounding));
    const decoPath = decorationsToSvgPath(evaluateDecorations(ir, w, h, rounding));
    const measured = decoPath.length > 0 ? `${path} ${decoPath}` : path;
    const bbox = svgPathBbox(measured, stroke);
    return {
        path,
        decoPath,
        originX: bbox.x,
        originY: bbox.y,
        overflowLeft: bbox.overflow.left,
        overflowRight: bbox.overflow.right,
        overflowTop: bbox.overflow.top,
        overflowBottom: bbox.overflow.bottom,
        renderWidth: bbox.width + bbox.overflow.left + bbox.overflow.right,
        renderHeight: bbox.height + bbox.overflow.top + bbox.overflow.bottom
    };
}

/**
 * Solves the geometry box whose *rendered* bounds match the target size.
 *
 * Single-pass is impossible: the stroke's outward miter spill and the corner angles both depend on
 * the aspect ratio, which is exactly what we are solving for. So we iterate a fixpoint —
 * regenerating the parametric outline and re-measuring each pass — until the residual is negligible,
 * mirroring HyLiMo's existing path layout algorithm. The best iterate's measurement is kept and
 * returned instead of re-evaluating the outline a final time, as the loop already computed exactly
 * that at that geometry.
 *
 * @param ir the shape to solve
 * @param target the rendered size to match
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @returns the solved geometry, the iterations spent, and the measurement taken at that geometry
 */
function solveOuter(
    ir: ShapeIR,
    target: Size,
    rounding: number,
    stroke: ShapeStroke
): {
    /**
     * The solved geometry width
     */
    width: number;
    /**
     * The solved geometry height
     */
    height: number;
    /**
     * The number of iterations spent
     */
    iterations: number;
    /**
     * The measurement taken at the solved geometry
     */
    measurement: Measurement;
} {
    let w = Math.max(MIN_DIM, target.width);
    let h = Math.max(MIN_DIM, target.height);
    let error = Number.POSITIVE_INFINITY;
    let previousError = Number.POSITIVE_INFINITY;
    let iterations = 0;
    let bestError = Number.POSITIVE_INFINITY;
    let bestW = w;
    let bestH = h;
    let damping = 1;
    let stall = 0;
    let prevW: number | undefined;
    let prevH: number | undefined;
    let prevRespW = 0;
    let prevRespH = 0;
    let bestM: Measurement | undefined;

    while (iterations < MAX_ITERATIONS && error > EPSILON) {
        const m = measure(ir, w, h, rounding, stroke);
        const respW = m.renderWidth;
        const respH = m.renderHeight;
        const eW = target.width - respW;
        const eH = target.height - respH;
        error = Math.abs(eW) + Math.abs(eH);
        if (error < bestError - EPSILON) {
            bestError = error;
            bestW = w;
            bestH = h;
            bestM = m;
            stall = 0;
        } else {
            stall++;
        }
        iterations++;
        if (error > previousError + EPSILON) {
            damping *= 0.5;
        }
        if (damping < DAMPING_FLOOR || stall >= STALL_LIMIT) {
            break;
        }
        previousError = error;

        const slopeW = estimateSlope(w, prevW, respW, prevRespW);
        const slopeH = estimateSlope(h, prevH, respH, prevRespH);
        prevW = w;
        prevH = h;
        prevRespW = respW;
        prevRespH = respH;
        w = Math.max(MIN_DIM, w + (eW / slopeW) * damping);
        h = Math.max(MIN_DIM, h + (eH / slopeH) * damping);
    }

    return {
        width: bestW,
        height: bestH,
        iterations,
        measurement: bestM ?? measure(ir, bestW, bestH, rounding, stroke)
    };
}

/**
 * Golden ratio conjugate, driving the 1-D search over the shape's height
 */
const GOLDEN = 0.618033988749895;
/**
 * Lower end of that search, expressed as the share of the shape's usable height the content takes:
 * `1` is a shape exactly as tall as its content (a rectangle, a chevron), and the shapes that must
 * be taller settle well above this bound — an ellipse at `1/√2`, a diamond at `1/2`.
 */
const MIN_HEIGHT_SHARE = 0.1;
/**
 * Golden-section steps; each one narrows the bracket by ~38%
 */
const HEIGHT_SEARCH_STEPS = 10;
/**
 * Secant steps allowed when solving the width that makes the content fit at a fixed height
 */
const MAX_WIDTH_STEPS = 5;
/**
 * Residual at which the content counts as fitting exactly, as a share of the content width and as an
 * absolute floor. It is deliberately no finer than the outline flattening is: a curved side is a
 * chord polygon, so its measured width wobbles by a fraction of a pixel as the shape is scaled, and
 * chasing a residual below that wobble would only burn iterations on noise. The solver always stops
 * on the fitting side of the residual, so the cost of the slack is a shape a fraction of a pixel
 * larger than strictly needed.
 */
const WIDTH_TOLERANCE_RATIO = 2e-3;
/**
 * Absolute floor of the width residual described by {@link WIDTH_TOLERANCE_RATIO}
 */
const MIN_WIDTH_TOLERANCE = 0.05;
/**
 * Largest factor a single width step may grow or shrink the shape by
 */
const WIDTH_STEP_LIMIT = 4;
/**
 * A shape this many times wider than its content is taken as "nothing fits at this height"
 */
const WIDTH_RUNAWAY_LIMIT = 100;
/**
 * Bracket width (in height share) below which the search has nothing left to gain
 */
const HEIGHT_SEARCH_TOLERANCE = 0.004;

/**
 * Solves the smallest geometry box whose content region holds the target content size.
 *
 * "Smallest" is taken as least area, which is what makes the result look right for every outline at
 * once: a rectangle wraps its content exactly, an ellipse settles at the classic `√2` around it, a
 * diamond at twice its content, and a chevron stays as flat as its content because every bit of
 * extra height would have to be paid for twice over in width by its notch and point.
 *
 * The feasible shapes form a one-parameter family — for each height there is a least width that
 * still fits the content, found by a secant on {@link widestBand}, which is affine in the width for
 * a shape whose sides simply move apart. A step that is too small to measure a new slope, or one whose
 * measurement comes out the wrong way round, keeps the previous slope: an outline that really does not
 * open up as it widens is caught by the runaway bound instead, which cannot misfire on noise. Once the
 * content fits, a single secant step lands on the root, as the response is affine in the width wherever
 * the same walls bound the region, and a nudge by the tolerance keeps it on the fitting side.
 *
 * What remains is a one-dimensional minimisation of the area
 * over that family, run as a golden-section search on the share of the shape's height the content
 * occupies. That variable is scale-free, its useful range is bounded by construction, and the corner
 * case — a shape that wants to be exactly as tall as its content — sits on the bracket's edge, so it
 * is checked outright rather than searched for. Golden-section never visits a bracket end, so that
 * corner case is measured up front, and if the area only ever falls towards it, it already is the
 * minimum of a single-dipped curve — the case for every outline with straight, parallel top and bottom
 * edges, which is most of them — and searching on would just walk back to the same shape.
 *
 * @param ir the shape to solve
 * @param target the content size which has to fit
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @returns the solved geometry and the iterations spent
 */
function solveInner(
    ir: ShapeIR,
    target: Size,
    rounding: number,
    stroke: ShapeStroke
): {
    /**
     * The solved geometry width
     */
    width: number;
    /**
     * The solved geometry height
     */
    height: number;
    /**
     * The number of iterations spent
     */
    iterations: number;
} {
    const contentWidth = Math.max(MIN_DIM, target.width);
    const contentHeight = Math.max(MIN_DIM, target.height);
    /**
     * The vertical clearance the content loses to the stroke on its way to the shape's own height
     */
    const padding = stroke.width;
    const tolerance = Math.max(MIN_WIDTH_TOLERANCE, contentWidth * WIDTH_TOLERANCE_RATIO);
    const runaway = contentWidth * WIDTH_RUNAWAY_LIMIT;
    let iterations = 0;
    let warmWidth = contentWidth;
    let warmSlope = 1;

    /**
     * How much wider than the content the region of its height is at this geometry
     */
    const marginAt = (width: number, height: number): number => {
        iterations++;
        return widestBand(buildContentProfile(ir, width, height, rounding, stroke), contentHeight) - contentWidth;
    };

    /**
     * The least width whose content region holds the content at this height, `Infinity` if the shape
     * would have to run away to hold it — which is how a height too close to the content's own is
     * ruled out for an outline that tapers, such as an ellipse.
     */
    const widthFor = (height: number): number => {
        let w = Math.max(MIN_DIM, warmWidth);
        let margin = marginAt(w, height);
        let slope = warmSlope;
        for (let step = 0; step < MAX_WIDTH_STEPS && !(margin >= 0 && margin <= tolerance); step++) {
            const stepped = w - margin / slope;
            const next = Math.max(MIN_DIM, Math.min(Math.max(stepped, w / WIDTH_STEP_LIMIT), w * WIDTH_STEP_LIMIT));
            if (next > runaway) {
                return Number.POSITIVE_INFINITY;
            }
            const nextMargin = marginAt(next, height);
            const measured = (nextMargin - margin) / (next - w);
            if (Math.abs(next - w) > MIN_DIM && measured > 0) {
                slope = measured;
                warmSlope = measured;
            }
            w = next;
            margin = nextMargin;
        }
        if (margin < 0) {
            w += -margin / slope + tolerance;
            if (w > runaway || marginAt(w, height) < 0) {
                return Number.POSITIVE_INFINITY;
            }
        }
        warmWidth = w;
        return w;
    };

    let best = { width: Math.max(MIN_DIM, contentWidth), height: Math.max(MIN_DIM, contentHeight) };
    let bestArea = Number.POSITIVE_INFINITY;
    const consider = (share: number): number => {
        const height = contentHeight / share + padding;
        const width = widthFor(height);
        const area = width * height;
        if (area < bestArea) {
            bestArea = area;
            best = { width, height };
        }
        return area;
    };

    const flatArea = consider(1);
    let low = MIN_HEIGHT_SHARE;
    let high = 1;
    let leftShare = high - GOLDEN * (high - low);
    let rightShare = low + GOLDEN * (high - low);
    let leftArea = consider(leftShare);
    let rightArea = consider(rightShare);
    if (flatArea <= rightArea && rightArea <= leftArea) {
        return { width: best.width, height: best.height, iterations };
    }
    for (let step = 0; step < HEIGHT_SEARCH_STEPS && high - low > HEIGHT_SEARCH_TOLERANCE; step++) {
        if (leftArea <= rightArea) {
            high = rightShare;
            rightShare = leftShare;
            rightArea = leftArea;
            leftShare = high - GOLDEN * (high - low);
            leftArea = consider(leftShare);
        } else {
            low = leftShare;
            leftShare = rightShare;
            leftArea = rightArea;
            rightShare = low + GOLDEN * (high - low);
            rightArea = consider(rightShare);
        }
    }
    return { width: best.width, height: best.height, iterations };
}

/**
 * Solves the geometry box for a shape so that either its rendered bounds (`outer`) or its content
 * region (`inner`) matches the target size — see {@link solveOuter} and {@link solveInner} — and
 * renders the result.
 *
 * The reported content box is the largest-area rectangle that fits inside the solved outline. The
 * `required` size, if given, holds it to a rectangle that also really fits that content, which
 * matters wherever the largest-area region has a different shape than the content itself — a
 * stadium-shaped action holding a single line of text is widest across its middle, but the line
 * needs the full width the corners leave. In `inner` mode the content that has to fit is the target
 * itself, which keeps the reported box consistent with what the children were measured to.
 *
 * @param ir the shape to lay out
 * @param mode whether `target` is the rendered size or the content size
 * @param target the size to match, interpreted according to `mode`
 * @param rounding the corner rounding
 * @param stroke the stroke the shape is painted with
 * @param required the content size the reported content box has to hold, if any
 * @returns the rendered paths, the solved sizes, and the content box
 */
export function layoutShape(
    ir: ShapeIR,
    mode: SizingMode,
    target: Size,
    rounding: number,
    stroke: ShapeStroke,
    required?: Size
): ShapeLayoutResult {
    let w: number;
    let h: number;
    let iterations: number;
    let final: Measurement;
    if (mode === "outer") {
        const solved = solveOuter(ir, target, rounding, stroke);
        w = solved.width;
        h = solved.height;
        iterations = solved.iterations;
        final = solved.measurement;
    } else {
        const solved = solveInner(ir, target, rounding, stroke);
        w = solved.width;
        h = solved.height;
        iterations = solved.iterations;
        final = measure(ir, w, h, rounding, stroke);
    }
    const profile = buildContentProfile(ir, w, h, rounding, stroke);
    const content = contentBoxFromProfile(profile, ir, w, h, rounding, stroke, mode === "inner" ? target : required);

    const dx = -final.originX + final.overflowLeft;
    const dy = -final.originY + final.overflowTop;
    const path = svgpath(final.path).translate(dx, dy).toString();
    const decorationPath = final.decoPath.length > 0 ? svgpath(final.decoPath).translate(dx, dy).toString() : "";

    return {
        path,
        decorationPath,
        size: { width: final.renderWidth, height: final.renderHeight },
        geometry: { width: w, height: h },
        contentBox: {
            x: content.x + final.overflowLeft - final.originX,
            y: content.y + final.overflowTop - final.originY,
            width: content.width,
            height: content.height
        },
        iterations
    };
}

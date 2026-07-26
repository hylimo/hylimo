import type { Type } from "@hylimo/core";
import { finiteNumberType, objectType, optional, stringType } from "@hylimo/core";
import type { Element, Size, Point, Line } from "@hylimo/diagram-common";
import { Path } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { matchToConstraints } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { ContentShapeLayoutConfig } from "./contentShapeLayoutConfig.js";
import { getContentLayoutConfig } from "./layout/contentLayout.js";
import type { ShapeIR } from "../shape/shapeIr.js";
import type { ShapeStroke, SizingMode } from "../shape/types.js";
import { resolveStroke } from "../shape/types.js";
import { parseShape } from "../shape/parse.js";
import type { ShapeLayoutResult } from "../shape/fixpoint.js";
import { layoutShape } from "../shape/fixpoint.js";
import { buildShapeOutline } from "../shape/shapeOutline.js";

/**
 * Fractions of the bounded dimension a shape is assumed to take along an *unbounded* one while the
 * children are first measured. Only the bounded axis' content constraint is derived from them (the
 * free axis stays unbounded), and which stand-in is the generous one depends on the outline: a shape
 * whose interior narrows in proportion as it grows — a chevron's notch — is at its roomiest when it
 * is flat, while one with a fixed-size feature — a note's fold — is at its roomiest once it is big
 * enough for that feature not to dominate. Both ends are therefore tried and the widest answer kept,
 * which is the safe direction to err in: {@link ShapeLayoutConfig.measure} tightens a constraint that
 * turned out too generous, but nothing can undo children that were wrapped too early.
 */
const UNBOUNDED_ESTIMATE_RATIOS = [1 / 32, 1];

/**
 * Number of times {@link ShapeLayoutConfig.measure} re-measures its children against a tightened
 * content constraint before accepting the result.
 *
 * A pass is needed whenever the shape wrapped around the content came out wider (or taller) than the
 * element is allowed to be, which only the content it holds can fix: the content constraint is
 * re-derived from the bound that was exceeded, now that the shape's other extent is known, and the
 * children are laid out again. Each pass narrows the constraint monotonically, so the loop terminates
 * and this only bounds how closely the wrapped shape approaches its outer bound, never correctness.
 */
const MAX_MEASURE_PASSES = 3;

/**
 * The resolved definition of a shape for one layout pass.
 */
interface ResolvedShape {
    /**
     * Parsed outline IR
     */
    ir: ShapeIR;
    /**
     * Outline path source (part of the fixpoint cache key)
     */
    path: string;
    /**
     * Optional decoration path source (part of the fixpoint cache key)
     */
    decoration: string | undefined;
    /**
     * The corner rounding radius, usable as `r` in the shape path
     */
    rounding: number;
    /**
     * The stroke the shape is painted with
     */
    stroke: ShapeStroke;
}

/**
 * Layout config for the generic parametric `shape`.
 *
 * A shape is defined by a `shape` attribute holding an SVG-like `path` (and an optional stroke-only
 * `decoration` sub-path), whose coordinates are affine functions of the box (`w`, `h`) and the
 * `cornerRounding` style (`r`). The outline is laid out by a fixpoint that fits the shape either to
 * its rendered bounds or to its content, accounting for stroke overflow — see {@link layoutShape}.
 * It renders as a {@link Path} model (outline + optional decoration + content). This replaces the
 * former dedicated `rect` and `ellipse` layout configs.
 */
export class ShapeLayoutConfig extends ContentShapeLayoutConfig {
    override type = "shape";

    /**
     * Creates a new ShapeLayoutConfig
     */
    constructor() {
        super(
            [
                {
                    name: "shape",
                    description: "the shape definition: an object with a 'path' and an optional 'decoration' path",
                    type: objectType(
                        new Map<string | number, Type>([
                            ["path", stringType],
                            ["decoration", optional(stringType)]
                        ])
                    )
                }
            ],
            [
                {
                    name: "cornerRounding",
                    description: "the corner rounding radius, usable as `r` in the shape path",
                    type: finiteNumberType
                }
            ]
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        this.normalizeStrokeWidth(element);
        const shape = this.resolveShape(element);
        if (element.children.length === 0) {
            element.shapeContentSize = undefined;
            return constraints.min;
        }
        const innerMin = this.innerSize(layout, shape, constraints.min);
        let innerMax = this.innerSize(layout, shape, constraints.max);
        let contentsSize: Size;
        let result: ShapeLayoutResult;
        for (let pass = 0; ; pass++) {
            contentsSize = getContentLayoutConfig(element).measure(layout, element, {
                min: innerMin,
                max: innerMax
            });
            result = this.solve(layout, shape, "inner", contentsSize);
            if (pass >= MAX_MEASURE_PASSES) {
                break;
            }
            const exceeds =
                result.size.width > constraints.max.width + 1e-6 || result.size.height > constraints.max.height + 1e-6;
            if (!exceeds) {
                break;
            }
            const tightened = this.innerSize(layout, shape, {
                width: Math.min(constraints.max.width, result.size.width),
                height: Math.min(constraints.max.height, result.size.height)
            });
            const next: Size = {
                width: Math.min(innerMax.width, tightened.width),
                height: Math.min(innerMax.height, tightened.height)
            };
            if (next.width >= innerMax.width - 1e-6 && next.height >= innerMax.height - 1e-6) {
                break;
            }
            innerMax = next;
        }
        element.shapeContentSize = contentsSize;
        return matchToConstraints(result.size, constraints);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const shape = this.resolveShape(element);
        const laidOut = this.solve(layout, shape, "outer", size, element.shapeContentSize as Size | undefined);
        const result: Path = {
            type: Path.TYPE,
            id,
            ...position,
            ...size,
            ...this.extractShapeProperties(element),
            path: laidOut.path,
            decoration: laidOut.decorationPath.length > 0 ? laidOut.decorationPath : undefined,
            children: [],
            edits: element.edits
        };
        if (element.children.length > 0) {
            const box = laidOut.contentBox;
            const contentPosition = { x: position.x + box.x, y: position.y + box.y };
            const contentSize = { width: box.width, height: box.height };
            result.children.push(
                ...getContentLayoutConfig(element).layout(layout, element, contentPosition, contentSize, id)
            );
        }
        if (element.isHidden) {
            return result.children;
        } else {
            return [result];
        }
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const shape = this.resolveShape(element);
        const laidOut = this.solve(layout, shape, "outer", size, element.shapeContentSize as Size | undefined);
        const outline = buildShapeOutline(laidOut.path, position, shape.stroke, id);
        if (outline == undefined) {
            return super.outline(layout, element, position, size, id);
        }
        return outline;
    }

    /**
     * Resolves the shape definition (parsed outline IR, corner rounding, resolved stroke) for the
     * current layout pass. The parsed IR is memoised on the element keyed by the source strings, so
     * measure/layout/outline within one render don't re-parse.
     *
     * @param element the element to resolve the shape of
     * @returns the resolved shape
     * @throws Error if the element has no `shape` attribute with a string `path`
     */
    private resolveShape(element: LayoutElement): ResolvedShape {
        this.normalizeStrokeWidth(element);
        const stroke = resolveStroke(this.extractShapeProperties(element).stroke);
        const rounding = Math.max(0, (element.styles.cornerRounding as number | undefined) ?? 0);
        const attribute = element.element.getLocalFieldOrUndefined("shape")?.value.toNative() as
            | {
                  /**
                   * The outline path source
                   */
                  path?: unknown;
                  /**
                   * The decoration path source
                   */
                  decoration?: unknown;
              }
            | undefined;
        const path = attribute?.path;
        if (typeof path !== "string") {
            throw new Error("a shape requires a 'shape' attribute with a string 'path'");
        }
        const decoration = typeof attribute?.decoration === "string" ? attribute.decoration : undefined;
        const key = `${path} ${decoration ?? ""}`;
        if (element.shapeIrKey !== key) {
            element.shapeIr = parseShape(path, decoration);
            element.shapeIrKey = key;
        }
        return { ir: element.shapeIr as ShapeIR, path, decoration, rounding, stroke };
    }

    /**
     * Solves the shape fixpoint for the given mode/target, caching the (iterative) result on the
     * engine so an unchanged shape isn't re-solved every render — mirroring the path/text caches.
     *
     * @param layout the layout the shape is solved in
     * @param shape the resolved shape to solve
     * @param mode whether `target` is the rendered size or the content size
     * @param target the size to match, interpreted according to `mode`
     * @param required the content size the reported content box has to hold, if any
     * @returns the solved shape
     */
    private solve(
        layout: Layout,
        shape: ResolvedShape,
        mode: SizingMode,
        target: Size,
        required?: Size
    ): ShapeLayoutResult {
        return layout.engine.shapeCache.getOrCompute(
            {
                path: shape.path,
                decoration: shape.decoration,
                stroke: shape.stroke,
                rounding: shape.rounding,
                mode,
                target,
                required
            },
            () => layoutShape(shape.ir, mode, target, shape.rounding, shape.stroke, required)
        );
    }

    /**
     * Computes the content (inner) size available for a given rendered outer size, so the children
     * can be measured before the shape's final size is known. Runs the same `outer`-mode fixpoint the
     * layout uses, so the estimate matches the final content box exactly — in particular it accounts
     * for the stroke overflow, which the outer size includes but the (centerline) geometry does not.
     * An unbounded axis stays unbounded: it is solved at each stand-in derived from the bounded one
     * (see {@link UNBOUNDED_ESTIMATE_RATIOS}) and reported as `Infinity`, while the bounded axis gets
     * the roomiest content extent any of those shapes offers.
     *
     * @param layout the layout the shape is solved in
     * @param shape the resolved shape to measure
     * @param outer the rendered outer size, which may be unbounded along either axis
     * @returns the content size available at that outer size
     */
    private innerSize(layout: Layout, shape: ResolvedShape, outer: Size): Size {
        const wFinite = Number.isFinite(outer.width);
        const hFinite = Number.isFinite(outer.height);
        if (!wFinite && !hFinite) {
            return { width: Infinity, height: Infinity };
        }
        if (wFinite && hFinite) {
            const box = this.solve(layout, shape, "outer", {
                width: Math.max(1, outer.width),
                height: Math.max(1, outer.height)
            }).contentBox;
            return { width: box.width, height: box.height };
        }
        const bounded = wFinite ? outer.width : outer.height;
        let best = 0;
        for (const ratio of UNBOUNDED_ESTIMATE_RATIOS) {
            const standIn = Math.max(1, bounded * ratio, shape.stroke.width * 2);
            const box = this.solve(layout, shape, "outer", {
                width: wFinite ? Math.max(1, outer.width) : standIn,
                height: hFinite ? Math.max(1, outer.height) : standIn
            }).contentBox;
            best = Math.max(best, wFinite ? box.width : box.height);
        }
        return {
            width: wFinite ? best : Infinity,
            height: hFinite ? best : Infinity
        };
    }
}

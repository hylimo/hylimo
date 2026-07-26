import type { Affine } from "./expr.js";
import { constant, evalAffine } from "./expr.js";

/**
 * How the shape's own outline corner is treated. This is the *geometry* of the corner
 * (part of the path), independent of the stroke `lineJoin` (which only affects how the
 * stroke is painted around whatever geometry there is).
 */
export type CornerStyle = "sharp" | "round" | "chamfer";

/**
 * A 2D point whose coordinates are affine functions of the box
 */
export interface AffinePt {
    /**
     * The x coordinate
     */
    readonly x: Affine;
    /**
     * The y coordinate
     */
    readonly y: Affine;
}

/**
 * How the edge *leading into* a vertex is drawn. Absent means a straight line (the common
 * case). A curved edge lets the outline bulge or round with true curves — cubic/quadratic
 * Béziers or an elliptical arc — which a corner-rounding radius (circular only) cannot express.
 * All control values are affine in the box, so the curve reshapes with the box like everything else.
 */
export type EdgeCurve =
    | {
          /**
           * Discriminator marking a cubic Bézier
           */
          readonly kind: "cubic";
          /**
           * The control point next to the previous vertex
           */
          readonly c1: AffinePt;
          /**
           * The control point next to this vertex
           */
          readonly c2: AffinePt;
      }
    | {
          /**
           * Discriminator marking a quadratic Bézier
           */
          readonly kind: "quad";
          /**
           * The single control point
           */
          readonly c1: AffinePt;
      }
    | {
          /**
           * Discriminator marking an elliptical arc
           */
          readonly kind: "arc";
          /**
           * The radius along the x-axis
           */
          readonly rx: Affine;
          /**
           * The radius along the y-axis
           */
          readonly ry: Affine;
          /**
           * x-axis rotation in degrees (constant; rarely animated with the box)
           */
          readonly rotation: number;
          /**
           * Whether the arc takes the long way around
           */
          readonly largeArc: 0 | 1;
          /**
           * The direction the arc is swept in
           */
          readonly sweep: 0 | 1;
      };

/**
 * A single vertex of the (closed) outline. Its position is an affine function of the box, so
 * the outline reshapes as the box changes — e.g. an arrow tip whose depth is `h/2` stays
 * proportional to the height at every size.
 */
export interface Vertex {
    /**
     * The x coordinate
     */
    readonly x: Affine;
    /**
     * The y coordinate
     */
    readonly y: Affine;
    /**
     * How the outline corner at this vertex is shaped
     */
    readonly corner: CornerStyle;
    /**
     * Radius (round) or cut depth (chamfer). Ignored for sharp corners.
     */
    readonly radius: Affine;
    /**
     * Curve of the edge from the previous vertex to this one. Absent means a straight line.
     */
    readonly edge?: EdgeCurve;
}

/**
 * The affine inset of the content box from each side of the (centerline) outline box.
 * The stroke half-width is added on top of this at layout time so content never overlaps
 * the stroke.
 */
export interface ContentInset {
    /**
     * The inset from the left edge
     */
    readonly left: Affine;
    /**
     * The inset from the right edge
     */
    readonly right: Affine;
    /**
     * The inset from the top edge
     */
    readonly top: Affine;
    /**
     * The inset from the bottom edge
     */
    readonly bottom: Affine;
}

/**
 * A **decoration** sub-path: an extra stroke that is drawn *inside* (or overlapping) the outline
 * but is not part of the silhouette — the front rim of a database cylinder, the ports of a UML
 * component, the crease of a folded note. It is painted and it counts toward the outer bounds,
 * and the content box is kept clear of it, but it never contributes to the outline itself.
 * `closed` decides whether it is stroked as an open polyline or closed back to its start.
 */
export interface Decoration {
    /**
     * The vertices of the sub-path, in order
     */
    readonly vertices: Vertex[];
    /**
     * Whether the sub-path is closed back to its start
     */
    readonly closed: boolean;
}

/**
 * The static, size-independent description of a parametric shape. This is what the DSL path
 * front-end compiles to, and what the layout engine consumes.
 */
export interface ShapeIR {
    /**
     * The vertices of the outline, in order
     */
    readonly vertices: Vertex[];
    /**
     * The inset of the content box from the outline box
     */
    readonly content: ContentInset;
    /**
     * Extra internal strokes for compound shapes (database rim, component ports, …)
     */
    readonly decorations?: Decoration[];
}

/**
 * A concrete 2D point
 */
export interface Pt {
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
 * A concrete evaluated curved edge
 */
export type EvaluatedEdge =
    | {
          /**
           * Discriminator marking a cubic Bézier
           */
          readonly kind: "cubic";
          /**
           * The control point next to the previous vertex
           */
          readonly c1: Pt;
          /**
           * The control point next to this vertex
           */
          readonly c2: Pt;
      }
    | {
          /**
           * Discriminator marking a quadratic Bézier
           */
          readonly kind: "quad";
          /**
           * The single control point
           */
          readonly c1: Pt;
      }
    | {
          /**
           * Discriminator marking an elliptical arc
           */
          readonly kind: "arc";
          /**
           * The radius along the x-axis
           */
          readonly rx: number;
          /**
           * The radius along the y-axis
           */
          readonly ry: number;
          /**
           * x-axis rotation in degrees
           */
          readonly rotation: number;
          /**
           * Whether the arc takes the long way around
           */
          readonly largeArc: 0 | 1;
          /**
           * The direction the arc is swept in
           */
          readonly sweep: 0 | 1;
      };

/**
 * A concrete evaluated vertex
 */
export interface EvaluatedVertex extends Pt {
    /**
     * How the outline corner at this vertex is shaped
     */
    readonly corner: CornerStyle;
    /**
     * Radius (round) or cut depth (chamfer). Ignored for sharp corners.
     */
    readonly radius: number;
    /**
     * Evaluated curve of the edge leading into this vertex, if any
     */
    readonly edge?: EvaluatedEdge;
}

/**
 * A concrete evaluated decoration sub-path
 */
export interface EvaluatedDecoration {
    /**
     * The evaluated vertices of the sub-path, in order
     */
    readonly vertices: EvaluatedVertex[];
    /**
     * Whether the sub-path is closed back to its start
     */
    readonly closed: boolean;
}

/**
 * Evaluates an affine point for a concrete box size and corner rounding
 *
 * @param p the point to evaluate
 * @param width the box width
 * @param height the box height
 * @param rounding the corner rounding
 * @returns the evaluated point
 */
function evalPt(p: AffinePt, width: number, height: number, rounding: number): Pt {
    return { x: evalAffine(p.x, width, height, rounding), y: evalAffine(p.y, width, height, rounding) };
}

/**
 * Evaluates a curved edge for a concrete box size and corner rounding
 *
 * @param edge the edge to evaluate
 * @param width the box width
 * @param height the box height
 * @param rounding the corner rounding
 * @returns the evaluated edge
 */
function evalEdge(edge: EdgeCurve, width: number, height: number, rounding: number): EvaluatedEdge {
    switch (edge.kind) {
        case "cubic":
            return {
                kind: "cubic",
                c1: evalPt(edge.c1, width, height, rounding),
                c2: evalPt(edge.c2, width, height, rounding)
            };
        case "quad":
            return { kind: "quad", c1: evalPt(edge.c1, width, height, rounding) };
        case "arc":
            return {
                kind: "arc",
                rx: Math.max(0, evalAffine(edge.rx, width, height, rounding)),
                ry: Math.max(0, evalAffine(edge.ry, width, height, rounding)),
                rotation: edge.rotation,
                largeArc: edge.largeArc,
                sweep: edge.sweep
            };
    }
}

/**
 * Evaluates a vertex for a concrete box size and corner rounding
 *
 * @param vertex the vertex to evaluate
 * @param width the box width
 * @param height the box height
 * @param rounding the corner rounding
 * @returns the evaluated vertex
 */
function evalVertex(vertex: Vertex, width: number, height: number, rounding: number): EvaluatedVertex {
    return {
        x: evalAffine(vertex.x, width, height, rounding),
        y: evalAffine(vertex.y, width, height, rounding),
        corner: vertex.corner,
        radius: Math.max(0, evalAffine(vertex.radius, width, height, rounding)),
        edge: vertex.edge ? evalEdge(vertex.edge, width, height, rounding) : undefined
    };
}

/**
 * Evaluates every vertex of the outline for a concrete box size and corner rounding
 *
 * @param ir the shape to evaluate
 * @param width the box width
 * @param height the box height
 * @param rounding the corner rounding
 * @returns the evaluated vertices, in order
 */
export function evaluateVertices(ir: ShapeIR, width: number, height: number, rounding: number): EvaluatedVertex[] {
    return ir.vertices.map((vertex) => evalVertex(vertex, width, height, rounding));
}

/**
 * Evaluates the decoration sub-paths for a concrete box size and corner rounding
 *
 * @param ir the shape to evaluate
 * @param width the box width
 * @param height the box height
 * @param rounding the corner rounding
 * @returns the evaluated decorations, in order
 */
export function evaluateDecorations(
    ir: ShapeIR,
    width: number,
    height: number,
    rounding: number
): EvaluatedDecoration[] {
    return (ir.decorations ?? []).map((decoration) => ({
        vertices: decoration.vertices.map((vertex) => evalVertex(vertex, width, height, rounding)),
        closed: decoration.closed
    }));
}

/**
 * Convenience builder for a sharp vertex
 *
 * @param x the x coordinate
 * @param y the y coordinate
 * @returns the created vertex
 */
export function sharpVertex(x: Affine, y: Affine): Vertex {
    return { x, y, corner: "sharp", radius: constant(0) };
}

/**
 * An all-zero content inset
 */
export const noInset: ContentInset = {
    left: constant(0),
    right: constant(0),
    top: constant(0),
    bottom: constant(0)
};

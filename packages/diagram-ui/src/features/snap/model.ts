import type { Point, Bounds, Vector } from "@hylimo/diagram-common";

/**
 * Represents the type of snap
 */
export enum SnapType {
    /**
     * Gap snap
     */
    GAP = "gap",
    /**
     * Point snap
     */
    POINT = "point",
    /**
     * Size snap
     */
    SIZE = "size"
}

/**
 * Represents a pair of points, typically used for defining line segments in snap lines.
 */
export type PointPair = [Point, Point];

/**
 * Represents a snap point used during snapping calculations.
 */
export type PointSnap = {
    /**
     * Identifies this snap as a point snap.
     */
    type: SnapType.POINT;
    /**
     * The ID of the context (canvas) in which this snap occurs.
     */
    context: string;
    /**
     * The point from the element being moved/snapped.
     */
    point: Point;
    /**
     * The reference point to which this point is snapping.
     */
    referencePoint: Point;
    /**
     * The distance to snap in pixels.
     */
    offset: number;
};

/**
 * Represents a point in a 2D coordinate system.
 */
export type InclusiveRange = [number, number];

/**
 * Gap between two elements/bounds
 *
 * start side ↓     length
 * ┌───────────┐◄───────────────►
 * │           │-----------------┌───────────┐
 * │  start    │       ↑         │           │
 * │  element  │    overlap      │  end      │
 * │           │       ↓         │  element  │
 * └───────────┘-----------------│           │
 *                               └───────────┘
 *                               ↑ end side
 */
export interface Gap {
    /**
     * Bounds of the starting element
     */
    startBounds: Bounds;
    /**
     * Bounds of the ending element
     */
    endBounds: Bounds;
    /**
     * Points defining the side of the starting element
     */
    startSide: [Point, Point];
    /**
     * Points defining the side of the ending element
     */
    endSide: [Point, Point];
    /**
     * Range of overlap between the elements on the perpendicular axis
     */
    overlap: InclusiveRange;
    /**
     * Length of the gap between the elements
     */
    length: number;
}

/**
 * Container for horizontal and vertical gaps between elements
 */
export interface Gaps {
    /**
     * Array of gaps in the horizontal direction
     */
    horizontalGaps: Gap[];
    /**
     * Array of gaps in the vertical direction
     */
    verticalGaps: Gap[];
}

/**
 * Direction of a gap snap.
 */
export enum GapSnapDirection {
    /**
     * Snap to the horizontal center of a gap.
     */
    CENTER_HORIZONTAL = "center_horizontal",
    /**
     * Snap to the vertical center of a gap.
     */
    CENTER_VERTICAL = "center_vertical",
    /**
     * Snap to the left side of a gap.
     */
    SIDE_LEFT = "side_left",
    /**
     * Snap to the right side of a gap.
     */
    SIDE_RIGHT = "side_right",
    /**
     * Snap to the top side of a gap.
     */
    SIDE_TOP = "side_top",
    /**
     * Snap to the bottom side of a gap.
     */
    SIDE_BOTTOM = "side_bottom"
}

/**
 * Represents a snap to a gap between elements.
 */
export interface GapSnap {
    /**
     * Identifies this snap as a gap snap.
     */
    type: SnapType.GAP;
    /**
     * The ID of the context (canvas) in which this snap occurs.
     */
    context: string;
    /**
     * The direction of the gap snap.
     */
    direction: GapSnapDirection;
    /**
     * The gap information this snap relates to.
     */
    gap: Gap;
    /**
     * The bounds of the element being snapped.
     */
    bounds: Bounds;
    /**
     * The distance to snap in pixels.
     */
    offset: number;
}

/**
 * Represents a snap to the size of an element
 */
export interface SizeSnap {
    /**
     * Identifies this snap as a size snap.
     */
    type: SnapType.SIZE;
    /**
     * The ID of the context (canvas) in which this snap occurs.
     */
    context: string;
    /**
     * The bounds of the element being snapped.
     */
    bounds: Bounds;
    /**
     * The bounds of the target element to which size snapping is applied.
     */
    targetBounds: Bounds;
    /**
     * Offset, always NaN
     */
    offset: number;
}

/**
 * Collection of gap snaps
 */
export type GapSnaps = GapSnap[];

/**
 * Union type for different kinds of snaps (point or gap)
 */
export type Snap = GapSnap | PointSnap | SizeSnap;

/**
 * Collection of snaps
 */
export type Snaps = Snap[];

/**
 * Represents the type of snap line.
 */
export enum SnapLineType {
    /**
     * Point-based snap line
     */
    POINTS = "points",
    /**
     * Gap-based snap line
     */
    GAP = "gap",
    /**
     * Size-based snap line
     */
    SIZE = "size"
}

/**
 * Represents a snap line created from point snaps.
 */
export type PointSnapLine = {
    /**
     * Identifies this snap line as a points-based snap line.
     */
    type: SnapLineType.POINTS;
    /**
     * The points that make up this snap line.
     */
    points: Point[];
};

/**
 * Direction of a snap line.
 */
export enum SnapDirection {
    /**
     * Vertical snap line (along Y-axis).
     */
    VERTICAL = "vertical",
    /**
     * Horizontal snap line (along X-axis).
     */
    HORIZONTAL = "horizontal"
}

/**
 * Represents a snap line created from gap snaps.
 */
export type GapSnapLine = {
    /**
     * Identifies this snap line as a gap-based snap line.
     */
    type: SnapLineType.GAP;
    /**
     * Direction of the snap line (horizontal or vertical).
     */
    direction: SnapDirection;
    /**
     * Pair of points defining the start and end of the snap line.
     */
    points: PointPair;
};

/**
 * Represents a snap line created from size snaps.
 */
export type SizeSnapLine = {
    /**
     * Identifies this snap line as a size-based snap line.
     */
    type: SnapLineType.SIZE;
    /**
     * Pair of points defining the start and end of the snap line.
     */
    points: PointPair;
};

/**
 * Union type for different kinds of snap lines (point-based or gap-based)
 */
export type SnapLine = PointSnapLine | GapSnapLine | SizeSnapLine;

/**
 * Collection of snap lines by context
 */
export type SnapLines = Map<string, SnapLine[]>;

/**
 * Information about elements to snap to in the context of a given canvas
 */
export interface ContextSnapReferenceData {
    /**
     * The points used for snapping (sorted)
     */
    points: Point[];
    /**
     * The bounds of the elements, position in the context, but aligned with the root coordinate system, sorted
     */
    bounds: Bounds[];
    /**
     * The global rotation of the canvas
     */
    globalRotation: number;
}

/**
 * Data about the dragged elements in the context of a given canvas
 */
export interface ContextSnapData {
    /**
     * The points used for snapping (sorted)
     */
    points: Point[];
    /**
     * The bounds of the elements, position in the context, but aligned with the root coordinate system
     */
    bounds: Bounds | undefined;
}

/**
 * Snapping data for all contexts
 */
export type SnapReferenceData = Map<string, ContextSnapReferenceData>;

/**
 * Snap data for all contexts
 */
export type SnapElementData = Map<string, ContextSnapData>;

/**
 * Configuration options for gap snapping behavior
 */
export interface GapSnapOptions {
    /**
     * Enable snapping to the left side of gaps
     */
    left: boolean;
    /**
     * Enable snapping to the right side of gaps
     */
    right: boolean;
    /**
     * Enable snapping to the top side of gaps
     */
    top: boolean;
    /**
     * Enable snapping to the bottom side of gaps
     */
    bottom: boolean;
    /**
     * Enable snapping to the horizontal center of gaps
     */
    centerHorizontal: boolean;
    /**
     * Enable snapping to the vertical center of gaps
     */
    centerVertical: boolean;
}

/**
 * Options for size snapping behavior
 */
export interface SizeSnapOptions {
    /**
     * The factor by which to multiply the  horizontal size different to get the distance used to find the nearest snap
     */
    horizontal: number;
    /**
     * The factor by which to multiply the vertical size different to get the distance used to find the nearest snap
     */
    vertical: number;
}

/**
 * Configuration options for the snapping behavior
 */
export interface SnapOptions {
    /**
     * If true, elements can be snapped in the x direction
     */
    snapX: boolean;
    /**
     * If true, elements can be snapped in the y direction
     */
    snapY: boolean;
    /**
     * If true, point snapping is enabled
     */
    snapPoints: boolean;
    /**
     * If true or a GapSnapOptions object, gap snapping is enabled
     */
    snapGaps: boolean | GapSnapOptions;
    /**
     * If not false, parameters required for size snapping
     */
    snapSize: false | SizeSnapOptions;
}

/**
 * Snapping result
 */
export interface SnapResult {
    /**
     * The offset to snap to, NOT including the elementOffset
     * If snapping in a direction is not possible, the elementOffset is returned
     */
    snapOffset: Vector;
    /**
     * Nearest snaps for the x axis (used for calculating snap lines)
     */
    nearestSnapsX: Snaps;
    /**
     * Nearest snaps for the y axis (used for calculating snap lines)
     */
    nearestSnapsY: Snaps;
    /**
     * Global rotation values for all contexts
     */
    contextGlobalRotations: Map<string, number>;
}

/**
 * Internal state for performing snapping
 */
export interface SnapState {
    /**
     * Nearest snaps for the x axis (used for calculating snap lines)
     */
    nearestSnapsX: Snaps;
    /**
     * Nearest snaps for the y axis (used for calculating snap lines)
     */
    nearestSnapsY: Snaps;
    /**
     * The minimum offset to snap to (absolute value)
     */
    minOffset: Vector;
}

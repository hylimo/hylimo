/**
 * This is a highly modified version of the original svg-path-bbox (https://github.com/mondeja/svg-path-bbox).
 * For the license, see LICENCES.
 * For the original file, see https://github.com/mondeja/svg-path-bbox/blob/44981d5dd5934099029ee03bddbddffcaed06b40/src/index.ts.
 */

import svgPath from "svgpath";
import { Math2D, Point } from "@hylimo/diagram-common";

/**
 * Bounding box of a path, represented as [minX, minY, maxX, maxY]
 */
type BBox = [minX: number, minY: number, maxX: number, maxY: number];

/**
 * Subset of SVG path styles that are relevant for bounding box calculation
 */
interface Styles {
    /**
     * Stroke width
     */
    lineWidth: number;
    /**
     * Stroke line cap
     */
    lineCap: "butt" | "round" | "square";
    /**
     * Stroke line join
     */
    lineJoin: "miter" | "round" | "bevel";
    /**
     * Miter limit
     */
    miterLimit: number;
}

/**
 * Min and max range array
 */
type MinMax = [min: number, max: number];

/**
 * svgpath path type
 */
type SvgPath = ReturnType<typeof svgPath>;

/**
 * svgpath segment type
 */
type Segment = Parameters<Parameters<SvgPath["iterate"]>[0]>[0];

/**
 * Precision for consider cubic polynom as quadratic one
 */
const CBEZIER_MINMAX_EPSILON = 0.00000001;

/**
 * Helper class for calculating the bounding box of a path
 */
class PathBBoxCalculator {
    /**
     * The path to calculate the bounding box for
     */
    private path: SvgPath;

    /**
     * Calculated bounding box
     */
    readonly bbox: BBox = [
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY
    ];

    /**
     * Creates a new PathBBoxCalculator
     * @param d the svg path string
     * @param styles the styles of the path
     */
    constructor(d: string, private readonly styles: Styles) {
        this.path = svgPath(d + "m 0 0")
            .abs()
            .unarc()
            .unshort();
        this.calculateBBox();
    }

    /**
     * Calculates the bounding box of the path
     */
    private calculateBBox(): void {
        let lastVector: Point | undefined = undefined;
        let globalStart: Point | undefined = undefined;
        let globalStartVector: Point | undefined = undefined;
        this.path.iterate((segment, _, x, y) => {
            const start = { x, y };
            const type = segment[0];
            if (type === "M") {
                if (globalStartVector != undefined) {
                    this.applyEndPoint(globalStart!, {
                        x: -globalStartVector.x,
                        y: -globalStartVector.y
                    });
                    this.applyEndPoint(start, lastVector!);
                }
                globalStart = {
                    x: segment[1],
                    y: segment[2]
                };
                this.applyPoint(globalStart);
                globalStartVector = undefined;
                lastVector = undefined;
            } else if (type === "Z") {
                if (globalStartVector != undefined) {
                    const vector = {
                        x: globalStart!.x - x,
                        y: globalStart!.y - y
                    };
                    this.applyInnerPoint(start, lastVector!, vector);
                    this.applyInnerPoint(globalStart!, vector, globalStartVector);
                }
                globalStartVector = undefined;
                lastVector = undefined;
            } else {
                const { startVector, endVector } = this.extractSegmentData(segment, x, y);
                if (globalStartVector == undefined) {
                    globalStartVector = startVector;
                }
                if (lastVector != undefined) {
                    this.applyInnerPoint(start, lastVector, startVector);
                }
                lastVector = endVector;
            }
        });
    }

    /**
     * Extracts from a segment defined by the svgpath segment and a start point
     * - the start vector (vector pointing in the direction of the line at the start point)
     * - the end vector (vector pointing in the direction of the line at the end point)
     *
     * @param seg the svgpath segment
     * @param x the start point x coordinate
     * @param y the start point y coordinate
     * @returns the extracted vectors
     */
    private extractSegmentData(seg: Segment, x: number, y: number): { startVector: Point; endVector: Point } {
        let startVector: Point;
        let endVector: Point;
        switch (seg[0]) {
            case "H": {
                startVector = {
                    x: seg[1] - x,
                    y: 0
                };
                endVector = startVector;
                break;
            }
            case "V": {
                startVector = {
                    x: 0,
                    y: seg[1] - y
                };
                endVector = startVector;
                break;
            }
            case "L": {
                startVector = {
                    x: seg[1] - x,
                    y: seg[2] - y
                };
                endVector = startVector;
                break;
            }
            case "C": {
                const cxMinMax = this.minmaxC([x, seg[1], seg[3], seg[5]]);
                const cyMinMax = this.minmaxC([y, seg[2], seg[4], seg[6]]);
                this.extendBounds(cxMinMax, cyMinMax);
                startVector = {
                    x: seg[1] - x,
                    y: seg[2] - y
                };
                endVector = {
                    x: seg[5] - seg[3],
                    y: seg[6] - seg[4]
                };
                break;
            }
            case "Q": {
                const qxMinMax = this.minmaxQ([x, seg[1], seg[3]]);
                const qyMinMax = this.minmaxQ([y, seg[2], seg[4]]);
                this.extendBounds(qxMinMax, qyMinMax);
                startVector = {
                    x: seg[1] - x,
                    y: seg[2] - y
                };
                endVector = {
                    x: seg[3] - seg[1],
                    y: seg[4] - seg[2]
                };
                break;
            }
            default: {
                throw new Error("invalid case");
            }
        }

        return {
            startVector,
            endVector
        };
    }

    /**
     * Extends the bounds by the provided bounds consisting of min and max values for x and y.
     *
     * @param minMaxX min and max values for x
     * @param minMaxY min and max values for y
     */
    private extendBounds(minMaxX: MinMax, minMaxY: MinMax): void {
        const halfWidth = this.styles.lineWidth / 2;
        this.bbox[0] = Math.min(this.bbox[0], minMaxX[0] - halfWidth);
        this.bbox[1] = Math.min(this.bbox[1], minMaxY[0] - halfWidth);
        this.bbox[2] = Math.max(this.bbox[2], minMaxX[1] + halfWidth);
        this.bbox[3] = Math.max(this.bbox[3], minMaxY[1] + halfWidth);
    }

    /**
     * Extends the bounding box to include a line join.
     * Caution: startVector must point towards the intersection point, and endVector must point away from it.
     *
     * @param point the inner point of the join
     * @param startVector the vector in the direction of the first line segment
     * @param endVector the vector in the direction of the second line segment
     */
    private applyInnerPoint(point: Point, startVector: Point, endVector: Point): void {
        if (this.styles.lineWidth === 0) {
            this.applyPoint(point);
        } else {
            const invertedEndVector = Math2D.scale(endVector, -1);
            switch (this.styles.lineJoin) {
                case "round": {
                    this.applyRoundJoin(point, startVector, invertedEndVector);
                    break;
                }
                case "bevel": {
                    this.applyBevelJoin(point, startVector, invertedEndVector);
                    break;
                }
                case "miter": {
                    this.applyMiterJoin(point, startVector, invertedEndVector);
                    break;
                }
                default: {
                    throw new Error("invalid case");
                }
            }
        }
    }

    /**
     * Extends the bounding box to include a miter line join at the given point.
     * If the miter length is greater than the miter limit, a bevel join is used instead.
     * Caution: both vectors must point towards the intersection point.
     *
     * @param point the point where the two line segments meet
     * @param startVector the vector in the direction of the first line segment
     * @param endVector the vector in the direction of the second line segment
     */
    private applyMiterJoin(point: Point, startVector: Point, endVector: Point): void {
        const normalizedStartVector = Math2D.normalize(startVector);
        const normalizedEndVector = Math2D.normalize(endVector);
        const theta = Math2D.angleBetween(normalizedStartVector, normalizedEndVector);
        const halfWidth = this.styles.lineWidth / 2;
        const miterLength = halfWidth / Math.sin(theta / 2);
        if (miterLength <= this.styles.miterLimit * halfWidth) {
            const miterVector = Math2D.add(normalizedStartVector, normalizedEndVector);
            const miterPoint = Math2D.add(point, Math2D.scaleTo(miterVector, miterLength));
            this.applyPoint(miterPoint);
        } else {
            this.applyBevelJoin(point, startVector, endVector);
        }
    }

    /**
     * Extends the bounding box to include a bevel line join at the given point.
     * Caution: both vectors must point towards the intersection point.
     *
     * @param point the point where the two line segments meet
     * @param startVector the vector in the direction of the first line segment
     * @param endVector the vector in the direction of the second line segment
     */
    private applyBevelJoin(point: Point, startVector: Point, endVector: Point): void {
        this.applyButtEndPoint(point, startVector);
        this.applyButtEndPoint(point, endVector);
    }

    /**
     * Extends the bounding box to include a round line join at the given point.
     * Caution: both vectors must point towards the intersection point.
     *
     * @param point the point where the two line segments meet
     * @param startVector the vector in the direction of the first line segment
     * @param endVector the vector in the direction of the second line segment
     */
    private applyRoundJoin(point: Point, startVector: Point, endVector: Point): void {
        this.applyBevelJoin(point, startVector, endVector);
        const halfWidth = this.styles.lineWidth / 2;
        const startAngle = Math2D.angle(startVector);
        const dot = Math2D.dot(startVector, endVector);
        const det = startVector.x * endVector.y - startVector.y * endVector.x;
        const deltaAngle = Math.atan2(det, dot);
        let normalStartAngle: number;
        let normalDeltaAngle: number;
        if (deltaAngle > 0) {
            normalStartAngle = startAngle + deltaAngle - Math.PI / 2;
            normalDeltaAngle = Math.PI - deltaAngle;
        } else {
            normalStartAngle = startAngle + deltaAngle + Math.PI / 2;
            normalDeltaAngle = -Math.PI - deltaAngle;
        }
        if (this.isAngleInRange(0, normalStartAngle, normalDeltaAngle)) {
            this.bbox[2] = Math.max(this.bbox[2], point.x + halfWidth);
        }
        if (this.isAngleInRange(Math.PI / 2, normalStartAngle, normalDeltaAngle)) {
            this.bbox[3] = Math.max(this.bbox[3], point.y + halfWidth);
        }
        if (this.isAngleInRange(Math.PI, normalStartAngle, normalDeltaAngle)) {
            this.bbox[0] = Math.min(this.bbox[0], point.x - halfWidth);
        }
        if (this.isAngleInRange(-Math.PI / 2, normalStartAngle, normalDeltaAngle)) {
            this.bbox[1] = Math.min(this.bbox[1], point.y - halfWidth);
        }
    }

    /**
     * Checks if the given angle is in the range defined by the start angle and the delta angle.
     *
     * @param angle the angle to check, may not be normalized
     * @param startAngle the start angle of the range, may not be normalized
     * @param deltaAngle the delta angle of the range
     * @returns true if the angle is in the range, false otherwise
     */
    private isAngleInRange(angle: number, startAngle: number, deltaAngle: number): boolean {
        const rotatedAngle = (angle - startAngle + Math.PI * 2) % (Math.PI * 2);
        if (deltaAngle > 0) {
            return rotatedAngle <= deltaAngle;
        } else {
            return rotatedAngle - 2 * Math.PI >= deltaAngle;
        }
    }

    /**
     * Extends the bounding box to include the given end point.
     * The exact dimensions of the bounding box depend on the line cap style.
     *
     * @param point the end point of the line
     * @param vector the vector of the line
     */
    private applyEndPoint(point: Point, vector: Point): void {
        if (this.styles.lineWidth === 0) {
            this.applyPoint(point);
        } else {
            switch (this.styles.lineCap) {
                case "round":
                    this.applyRoundEnd(point);
                    break;
                case "butt":
                    this.applyButtEndPoint(point, vector);
                    break;
                case "square":
                    this.applySquareEndPoint(point, vector);
                    break;
                default:
                    throw new Error("invalid case");
            }
        }
    }

    /**
     * Extends the bounding box to include the given round line cap end point.
     * Even though the line cap is only half a circle, the bounding box is extended in all directions.
     *
     * @param point the end point of the line
     */
    private applyRoundEnd(point: Point): void {
        const halfWidth = this.styles.lineWidth / 2;
        this.bbox[0] = Math.min(this.bbox[0], point.x - halfWidth);
        this.bbox[1] = Math.min(this.bbox[1], point.y - halfWidth);
        this.bbox[2] = Math.max(this.bbox[2], point.x + halfWidth);
        this.bbox[3] = Math.max(this.bbox[3], point.y + halfWidth);
    }

    /**
     * Extends the bounding box to include the given butt line cap end point.
     *
     * @param point the end point of the line
     * @param vector the vector of the line
     */
    private applyButtEndPoint(point: Point, vector: Point): void {
        const normal = Math2D.normalize(Math2D.normal(vector));
        this.applyPoint(Math2D.add(point, Math2D.scale(normal, this.styles.lineWidth / 2)));
        this.applyPoint(Math2D.add(point, Math2D.scale(normal, -this.styles.lineWidth / 2)));
    }

    /**
     * Extends the bounding box to include the given square line cap end point.
     *
     * @param point the end point of the line
     * @param vector the vector of the line
     */
    private applySquareEndPoint(point: Point, vector: Point): void {
        const newEndPoint = Math2D.add(point, Math2D.scaleTo(vector, this.styles.lineWidth / 2));
        this.applyButtEndPoint(newEndPoint, vector);
    }

    /**
     * Extends the bounding box to include the given point
     *
     * @param point the point to apply
     */
    private applyPoint(point: Point): void {
        this.bbox[0] = Math.min(this.bbox[0], point.x);
        this.bbox[1] = Math.min(this.bbox[1], point.y);
        this.bbox[2] = Math.max(this.bbox[2], point.x);
        this.bbox[3] = Math.max(this.bbox[3], point.y);
    }

    /**
     * Calculates the min and max of a quadratic bezier curve
     * Does not consider the start and end points, only points on the curve where the derivative is 0.
     * Start and end points have to be handled separately.
     * Modified version of https://github.com/kpym/SVGPathy/blob/acd1a50c626b36d81969f6e98e8602e128ba4302/lib/box.js#L89
     *
     * @param A the quadratic bezier curve
     * @returns the min and max of the curve
     */
    minmaxQ(A: [number, number, number]): MinMax {
        const min = Math.min(A[0], A[2]);

        if (A[1] > A[0] ? A[2] >= A[1] : A[2] <= A[1]) {
            // if no extremum in ]0,1[
            return [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        }

        // check if the extremum E is min or max
        const E = (A[0] * A[2] - A[1] * A[1]) / (A[0] - 2 * A[1] + A[2]);
        if (E < min) {
            return [E, Number.NEGATIVE_INFINITY];
        } else {
            return [Number.POSITIVE_INFINITY, E];
        }
    }

    /**
     * Calculates the min and max of a cubic bezier curve
     * Does not consider the start and end points, only points on the curve where the derivative is 0.
     * Start and end points have to be handled separately.
     * Modified version of https://github.com/kpym/SVGPathy/blob/acd1a50c626b36d81969f6e98e8602e128ba4302/lib/box.js#L127
     *
     * @param A defines the cubic bezier curve as [A0, A1, A2, A3]
     * @returns the min and max of the curve
     */
    minmaxC(A: [number, number, number, number]): MinMax {
        const K = A[0] - 3 * A[1] + 3 * A[2] - A[3];

        // if the polynomial is (almost) quadratic and not cubic
        if (Math.abs(K) < CBEZIER_MINMAX_EPSILON) {
            if (A[0] === A[3] && A[0] === A[1]) {
                // no curve, point targeting same location
                return [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
            }

            return this.minmaxQ([A[0], -0.5 * A[0] + 1.5 * A[1], A[0] - 3 * A[1] + 3 * A[2]]);
        }

        // the reduced discriminant of the derivative
        const T = -A[0] * A[2] + A[0] * A[3] - A[1] * A[2] - A[1] * A[3] + A[1] * A[1] + A[2] * A[2];

        // if the polynomial is monotone in [0,1]
        if (T <= 0) {
            return [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        }
        const S = Math.sqrt(T);

        // potential extrema
        const min = Math.min(A[0], A[3]),
            max = Math.max(A[0], A[3]);

        const L = A[0] - 2 * A[1] + A[2];
        // check local extrema
        for (let R = (L + S) / K, i = 1; i <= 2; R = (L - S) / K, i++) {
            if (R > 0 && R < 1) {
                // if the extrema is for R in [0,1]
                const Q =
                    A[0] * (1 - R) * (1 - R) * (1 - R) +
                    A[1] * 3 * (1 - R) * (1 - R) * R +
                    A[2] * 3 * (1 - R) * R * R +
                    A[3] * R * R * R;
                let newMin = Number.POSITIVE_INFINITY;
                if (Q < min) {
                    newMin = Q;
                }
                let newMax = Number.NEGATIVE_INFINITY;
                if (Q > max) {
                    newMax = Q;
                }
                return [newMin, newMax];
            }
        }

        return [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    }
}

/**
 * Compute bounding boxes of SVG paths.
 * @param d SVG path for which their bounding box will be computed.
 * @returns The bounding box of the path.
 */
export function svgPathBbox(d: string, styles: Styles): BBox {
    const calculator = new PathBBoxCalculator(d, styles);
    return calculator.bbox;
}

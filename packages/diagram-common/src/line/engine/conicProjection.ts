import type { Point } from "../../common/point.js";

/**
 * Projects a point on a conic using WEP.
 * The conic should be defined by Ax^2 + 2Bxy + Cy^2 + 2Dx + 2Ey + F = 0
 * Adopted version from https://people.cas.uab.edu/~mosya/cl/C++projections/ProjectPointsOntoConicByWEPinv.cpp
 *
 * @param conic the conic = [A, B, C, D, E, F]
 * @param point the point to project
 * @returns possible projections, meaning up to 4 points which can be local minima
 */
export function projectPointOnConic(conic: Tuple<number, 6>, point: Point): Point[] {
    const { x, y } = point;
    const smallNumber = 1 / Math.pow(2, 50);

    const [A, B, C, D, E, F] = conic;

    let cMatrix: M3x3 = [
        [A, B, D],
        [B, C, E],
        [D, E, F]
    ];
    let dMatrix: M3x3 = [
        [B + B, C - A, A * y - B * x + E],
        [C - A, -B - B, B * y - C * x - D],
        [A * y - B * x + E, B * y - C * x - D, 2 * (D * y - E * x)]
    ];

    let cDet = determinant3(cMatrix);
    let dDet = determinant3(dMatrix);

    if (Math.abs(cDet) > Math.abs(dDet)) {
        const temp = cMatrix;
        cMatrix = dMatrix;
        dMatrix = temp;
        const temp2 = cDet;
        cDet = dDet;
        dDet = temp2;
    }
    const cdDet = determinant3(addMatrix(cMatrix, dMatrix));
    const dcDet = determinant3(subMatrix(cMatrix, dMatrix));
    let a = -dDet;
    let b = (cdDet + dcDet) / 2 - cDet;
    let c = (dcDet - cdDet) / 2 + dDet;
    const d = cDet;
    const a0 = b / a;
    const b0 = c / a;
    const c0 = d / a;

    const root = iterateRoot(a0, b0, c0, cMatrix, dMatrix);
    const gMatrix = subMatrix(cMatrix, scaleMatrix(dMatrix, root));

    let detmax = Math.abs(gMatrix[0][0] * gMatrix[1][1] - gMatrix[0][1] * gMatrix[1][0]);
    let detMaxCase: 0 | 1 | 2 = 2;
    let det = Math.abs(gMatrix[2][2] * gMatrix[1][1] - gMatrix[1][2] * gMatrix[2][1]);
    if (detmax < det) {
        detmax = det;
        detMaxCase = 0;
    }
    det = Math.abs(gMatrix[0][0] * gMatrix[2][2] - gMatrix[0][2] * gMatrix[2][0]);
    if (detmax < det) {
        detMaxCase = 1;
    }
    let p: number;
    let q: number;
    switch (detMaxCase) {
        case 0:
            a = gMatrix[1][1];
            b = gMatrix[2][2];
            c = gMatrix[1][2];
            p = gMatrix[1][0];
            q = gMatrix[2][0];
            break;
        case 1:
            a = gMatrix[0][0];
            b = gMatrix[2][2];
            c = gMatrix[0][2];
            p = gMatrix[0][1];
            q = gMatrix[2][1];
            break;
        case 2:
            a = gMatrix[0][2];
            b = gMatrix[1][1];
            c = gMatrix[0][1];
            p = gMatrix[0][2];
            q = gMatrix[1][2];
            break;
    }
    const disc = (a - b) * (a - b) + 4 * c * c;
    const d1 = a + b > 0 ? (a + b + Math.sqrt(disc)) / 2 : (a + b - Math.sqrt(disc)) / 2;
    let d2 = (a * b - c * c) / d1;

    if (d1 * d2 > 0) {
        d2 = 0;
    }

    let v1x: number;
    let v1y: number;
    let den: number;
    if (Math.abs(a - d1) > Math.abs(b - d1)) {
        den = Math.sqrt(c * c + (d1 - a) * (d1 - a));

        if (den == 0) {
            v1x = 1;
            v1y = 0;
        } else {
            v1x = c / den;
            v1y = (d1 - a) / den;
        }
    } else {
        den = Math.sqrt(c * c + (d1 - b) * (d1 - b));

        if (den == 0) {
            v1x = 1;
            v1y = 0;
        } else {
            v1x = (d1 - b) / den;
            v1y = c / den;
        }
    }

    const sd1 = Math.sqrt(Math.abs(d1));
    const sd2 = Math.sqrt(Math.abs(d2));
    const a1 = sd1 * v1x - sd2 * v1y;
    const b1 = sd1 * v1y + sd2 * v1x;
    let a2 = sd1 * v1x + sd2 * v1y;
    let b2 = sd1 * v1y - sd2 * v1x;
    if (d1 < 0) {
        a2 = -a2;
        b2 = -b2;
    }

    det = a1 * b2 - a2 * b1;
    const c1 = (2 * (a1 * q - b1 * p)) / det;
    const c2 = (2 * (b2 * p - a2 * q)) / det;

    let l1: Tuple<number, 3>;
    let l2: Tuple<number, 3>;
    switch (detMaxCase) {
        case 0:
            l1 = [c1, a1, b1];
            l2 = [c2, a2, b2];
            break;
        case 1:
            l1 = [a1, c1, b1];
            l2 = [a2, c2, b2];
            break;
        case 2:
            l1 = [a1, b1, c1];
            l2 = [a2, b2, c2];
            break;
    }

    const results: Point[] = [];

    if (Math.abs(l1[0]) >= Math.abs(l1[1]) && Math.abs(l1[0]) > smallNumber) {
        p = l1[1] / l1[0];
        q = l1[2] / l1[0];

        a = (A * p - 2 * B) * p + C;
        b = (B - A * p) * q + D * p - E;
        c = (A * q - 2 * D) * q + F;

        const disc = b * b - a * c;

        if (a * a == 0) {
            results.push({ y: c / b / 2, x: -p * (c / b / 2) - q });
        } else if (disc >= 0) {
            const rootsum = b > 0 ? b + Math.sqrt(disc) : b - Math.sqrt(disc);
            results.push({ y: rootsum / a, x: -p * (rootsum / a) - q });
            results.push({ y: c / rootsum, x: -p * (c / rootsum) - q });
        }
    }

    if (Math.abs(l1[1]) > Math.abs(l1[0]) && Math.abs(l1[1]) > smallNumber) {
        p = l1[0] / l1[1];
        q = l1[2] / l1[1];

        a = (C * p - 2 * B) * p + A;
        b = (B - C * p) * q + E * p - D;
        c = (C * q - 2 * E) * q + F;

        const disc = b * b - a * c;

        if (a * a == 0) {
            results.push({ x: c / b / 2, y: -p * (c / b / 2) - q });
        } else if (disc >= 0) {
            const rootsum = b > 0 ? b + Math.sqrt(disc) : b - Math.sqrt(disc);
            results.push({ x: rootsum / a, y: -p * (rootsum / a) - q });
            results.push({ x: c / rootsum, y: -p * (c / rootsum) - q });
        }
    }

    if (Math.abs(l2[0]) >= Math.abs(l2[1]) && Math.abs(l2[0]) > smallNumber) {
        p = l2[1] / l2[0];
        q = l2[2] / l2[0];

        a = (A * p - 2 * B) * p + C;
        b = (B - A * p) * q + D * p - E;
        c = (A * q - 2 * D) * q + F;

        const disc = b * b - a * c;

        if (a * a == 0) {
            results.push({ y: c / b / 2, x: -p * (c / b / 2) - q });
        } else if (disc >= 0) {
            const rootsum = b > 0 ? b + Math.sqrt(disc) : b - Math.sqrt(disc);
            results.push({ y: rootsum / a, x: -p * (rootsum / a) - q });
            results.push({ y: c / rootsum, x: -p * (c / rootsum) - q });
        }
    }

    if (Math.abs(l2[1]) > Math.abs(l2[0]) && Math.abs(l2[1]) > smallNumber) {
        p = l2[0] / l2[1];
        q = l2[2] / l2[1];

        a = (C * p - 2 * B) * p + A;
        b = (B - C * p) * q + E * p - D;
        c = (C * q - 2 * E) * q + F;

        const disc = b * b - a * c;

        if (a * a == 0) {
            results.push({ x: c / b / 2, y: -p * (c / b / 2) - q });
        } else if (disc >= 0) {
            const rootsum = b > 0 ? b + Math.sqrt(disc) : b - Math.sqrt(disc);
            results.push({ x: rootsum / a, y: -p * (rootsum / a) - q });
            results.push({ x: c / rootsum, y: -p * (c / rootsum) - q });
        }
    }

    return results;
}

function iterateRoot(a: number, b: number, c: number, cMatrix: M3x3, dMatrix: M3x3): number {
    const maxIterations = 11;
    let root = cubicEquationRoot(a, b, c);
    let f = determinant3(subMatrix(cMatrix, scaleMatrix(dMatrix, root)));
    for (let i = 0; i < maxIterations; i++) {
        const fDer = (3 * a * root + 2 * b) * root + c;
        const step = f / fDer;
        if (root == root - step) {
            break;
        }
        const newRoot = root - step;
        if (!Number.isFinite(newRoot)) {
            break;
        }
        const newF = determinant3(subMatrix(cMatrix, scaleMatrix(dMatrix, newRoot)));
        if (Math.abs(newF) >= Math.abs(f)) {
            break;
        }
        root = newRoot;
        f = newF;
    }
    return root;
}

/**
 * Typescirpt tuple type magic
 */
type Tuple<T, N extends number> = N extends N ? (number extends N ? T[] : _TupleOf<T, N, []>) : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>;

/**
 * 3x3 matrix
 */
type M3x3 = Tuple<Tuple<number, 3>, 3>;

/**
 * Calculates the determinant of a 3x3 matrix
 *
 * @param m the matrix to calculate the determinant of
 * @returns the determinant
 */
function determinant3(m: M3x3): number {
    return (
        m[0][0] * m[1][1] * m[2][2] +
        m[0][1] * m[1][2] * m[2][0] +
        m[0][2] * m[1][0] * m[2][1] -
        m[0][2] * m[1][1] * m[2][0] -
        m[0][0] * m[1][2] * m[2][1] -
        m[0][1] * m[1][0] * m[2][2]
    );
}

/**
 * Adds to 3x3 matrix
 *
 * @param m1 the first matrix
 * @param m2 the second matrix
 * @returns the resulting matrix
 */
function addMatrix(m1: M3x3, m2: M3x3): M3x3 {
    return [
        [m1[0][0] + m2[0][0], m1[0][1] + m2[0][1], m1[0][2] + m2[0][2]],
        [m1[1][0] + m2[1][0], m1[1][1] + m2[1][1], m1[1][2] + m2[1][2]],
        [m1[2][0] + m2[2][0], m1[2][1] + m2[2][1], m1[2][2] + m2[2][2]]
    ];
}

/**
 * Subtracts a 3x3 matrix from another 3x3 matrix
 *
 * @param t1 the first matrix
 * @param t2 the matrix to subtract
 * @returns the resulting matrix
 */
function subMatrix(t1: M3x3, t2: M3x3): M3x3 {
    return [
        [t1[0][0] - t2[0][0], t1[0][1] - t2[0][1], t1[0][2] - t2[0][2]],
        [t1[1][0] - t2[1][0], t1[1][1] - t2[1][1], t1[1][2] - t2[1][2]],
        [t1[2][0] - t2[2][0], t1[2][1] - t2[2][1], t1[2][2] - t2[2][2]]
    ];
}

/**
 * Scales a matrix with a factor
 *
 * @param m1 the matrix to scale
 * @param scale the scale factor
 * @returns the scaled matrix
 */
function scaleMatrix(m1: M3x3, scale: number): M3x3 {
    return [
        [m1[0][0] * scale, m1[0][1] * scale, m1[0][2] * scale],
        [m1[1][0] * scale, m1[1][1] * scale, m1[1][2] * scale],
        [m1[2][0] * scale, m1[2][1] * scale, m1[2][2] * scale]
    ];
}

/**
 * Finds the real root of a cubic equation x^3 + ax^2 + bx + c = 0
 * In case of three real roots, it returns the most distant from the other two (the most well-conditioned root).
 * Modified version of https://people.cas.uab.edu/~mosya/cl/C++projections/RootOfCubicEquation.cpp
 *
 * @param a first coefficient
 * @param b second coefficient
 * @param c third coefficient
 * @returns a real root of x
 */
function cubicEquationRoot(a: number, b: number, c: number) {
    let x: number;
    const thirdRootOfMax = Math.pow(Number.MAX_VALUE, 1 / 3);

    if (Math.abs(a) > 27 * thirdRootOfMax) {
        return -a;
    }

    const aover3 = a / 3;
    const q = aover3 * aover3 - b / 3;

    if (Math.abs(q) > thirdRootOfMax / 4) {
        return -q * Math.pow(4, 1 / 3);
    }

    const q3 = Math.pow(q, 3);
    const r = aover3 * (aover3 * aover3 - b / 2) + c / 2;
    if (Math.abs(r) > Math.sqrt(Number.MAX_VALUE)) {
        x = Math.pow(Math.abs(r), 1 / 3);
        if (r >= 0) {
            return x;
        } else {
            return -x;
        }
    }
    if (q3 == 0 && r * r == 0) {
        x = -aover3;
    } else if (r * r < q3) {
        const pi23 = (Math.PI * 2) / 3;
        const factor = -2 * Math.sqrt(q);
        const theta = Math.acos(r / Math.sqrt(q3)) / 3;
        const x1 = factor * Math.cos(theta) - aover3;
        const x2 = factor * Math.cos(theta + pi23) - aover3;
        const x3 = factor * Math.cos(theta - pi23) - aover3;
        const x13 = Math.abs(x1 - x3);
        const x23 = Math.abs(x2 - x3);
        if (x13 < x23) {
            x = x2;
        } else {
            x = x1;
        }
        if (x1 > x3 || x3 > x2) {
            const x12 = Math.abs(x1 - x2);
            if (x12 <= x13 && x12 <= x23) {
                x = x3;
            }
            if (x13 <= x12 && x13 <= x23) {
                x = x2;
            }
            if (x23 <= x12 && x23 <= x13) {
                x = x1;
            }
        }
    } else {
        const disc = Math.sqrt(r * r - q3);
        const t1 = r > 0 ? -Math.pow(r + disc, 1 / 3) : Math.pow(Math.abs(r) + disc, 1 / 3);
        const t2 = t1 == 0 ? 0 : q / t1;
        x = t1 + t2 - aover3;
    }
    return x;
}

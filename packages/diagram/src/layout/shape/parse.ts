import type { Affine } from "./expr.js";
import { parseAffine, constant, affineEquals, ExprError } from "./expr.js";
import type { Decoration, ShapeIR, Vertex, EdgeCurve } from "./shapeIr.js";
import { noInset } from "./shapeIr.js";

/**
 * Error thrown for a malformed shape path, carrying a human-readable message
 */
export class ShapeParseError extends Error {}

/**
 * Parses an affine expression, translating an {@link ExprError} into a {@link ShapeParseError}
 *
 * @param src the expression to parse
 * @returns the parsed affine value
 * @throws ShapeParseError if the expression is malformed or not affine
 */
function parseExpr(src: string): Affine {
    try {
        return parseAffine(src);
    } catch (error) {
        const message = error instanceof ExprError ? error.message : String(error);
        throw new ShapeParseError(message);
    }
}

/**
 * Scans SVG-like path data into a flat vertex list, recording whether an explicit `Z` appeared.
 * Every coordinate, Bézier control and arc radius is an affine expression over `w`, `h`, and `r`
 * (the corner rounding); the arc rotation and the two flags are plain constants. Shared by the
 * outline (`path`) and by decoration sub-paths; the two differ only in how they treat closure.
 *
 * @param data the path data to scan
 * @returns the scanned vertices and whether an explicit `Z` appeared
 * @throws ShapeParseError if the path data is malformed
 */
function scanPathTokens(data: string): {
    /**
     * The scanned vertices, in order
     */
    vertices: Vertex[];
    /**
     * Whether the path data contained an explicit `Z`
     */
    sawZ: boolean;
} {
    const tokens = data.split(/\s+/).filter((token) => token.length > 0);
    const vertices: Vertex[] = [];
    let lastX: Affine = constant(0);
    let lastY: Affine = constant(0);
    let command = "";
    let sawZ = false;
    let i = 0;
    const pushVertex = (x: Affine, y: Affine, edge?: EdgeCurve): void => {
        lastX = x;
        lastY = y;
        vertices.push({ x, y, corner: "sharp", radius: constant(0), edge });
    };
    const take = (count: number): string[] => {
        if (i + count > tokens.length) {
            throw new ShapeParseError(`"${command}" command is missing arguments`);
        }
        return tokens.slice(i, i + count);
    };
    while (i < tokens.length) {
        const token = tokens[i];
        if (/^[a-zA-Z]$/.test(token)) {
            command = token.toUpperCase();
            i++;
            if (command === "Z") {
                sawZ = true;
                command = "";
            }
            continue;
        }
        switch (command) {
            case "M":
            case "L": {
                const [x, y] = parseCoordinate(token);
                pushVertex(x, y);
                i++;
                break;
            }
            case "H": {
                pushVertex(parseExpr(token), lastY);
                i++;
                break;
            }
            case "V": {
                pushVertex(lastX, parseExpr(token));
                i++;
                break;
            }
            case "C": {
                const [c1, c2, end] = take(3);
                const [c1x, c1y] = parseCoordinate(c1);
                const [c2x, c2y] = parseCoordinate(c2);
                const [x, y] = parseCoordinate(end);
                pushVertex(x, y, { kind: "cubic", c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y } });
                i += 3;
                break;
            }
            case "Q": {
                const [c1, end] = take(2);
                const [c1x, c1y] = parseCoordinate(c1);
                const [x, y] = parseCoordinate(end);
                pushVertex(x, y, { kind: "quad", c1: { x: c1x, y: c1y } });
                i += 2;
                break;
            }
            case "A": {
                const [radii, rotation, flags, end] = take(4);
                const [rx, ry] = parseCoordinate(radii);
                const [largeArc, sweep] = parseFlags(flags);
                const [x, y] = parseCoordinate(end);
                pushVertex(x, y, {
                    kind: "arc",
                    rx,
                    ry,
                    rotation: parseNumber(rotation),
                    largeArc,
                    sweep
                });
                i += 4;
                break;
            }
            default:
                throw new ShapeParseError(`coordinate "${token}" without a command`);
        }
    }
    return { vertices, sawZ };
}

/**
 * Folds a path that explicitly returns to its start point: move the duplicate final vertex's curve
 * onto the start vertex (it becomes the *closing* edge) and drop the duplicate. Returns whether such
 * a fold happened.
 *
 * @param vertices the vertices to fold, modified in place
 * @returns true if the path returned to its start point and was folded
 */
function foldClosingVertex(vertices: Vertex[]): boolean {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    if (vertices.length > 2 && affineEquals(first.x, last.x) && affineEquals(first.y, last.y)) {
        vertices[0] = { ...first, edge: last.edge };
        vertices.pop();
        return true;
    }
    return false;
}

/**
 * Parses the outline path data into the vertices of the (implicitly closed) outline
 *
 * @param data the path data to parse
 * @returns the parsed vertices, in order
 * @throws ShapeParseError if the path data is malformed or has fewer than two points
 */
function parsePathData(data: string): Vertex[] {
    const { vertices } = scanPathTokens(data);
    if (vertices.length < 2) {
        throw new ShapeParseError("path needs at least two points");
    }
    foldClosingVertex(vertices);
    return vertices;
}

/**
 * Parses one decoration sub-path. Unlike the outline it may stay open (a database rim, a fold
 * crease): it is closed only if it uses `Z` or explicitly returns to its start point.
 *
 * @param data the path data of the sub-path
 * @returns the parsed decoration
 * @throws ShapeParseError if the path data is malformed or has fewer than two points
 */
function parseDecoration(data: string): Decoration {
    const { vertices, sawZ } = scanPathTokens(data);
    if (vertices.length < 2) {
        throw new ShapeParseError("decoration needs at least two points");
    }
    const folded = foldClosingVertex(vertices);
    return { vertices, closed: sawZ || folded };
}

/**
 * Parses a token which must be a plain, finite number
 *
 * @param token the token to parse
 * @returns the parsed number
 * @throws ShapeParseError if the token is not a finite number
 */
function parseNumber(token: string): number {
    const value = Number(token);
    if (!Number.isFinite(value)) {
        throw new ShapeParseError(`"${token}" must be a plain number`);
    }
    return value;
}

/**
 * Parses the `largeArc,sweep` flag pair of an arc command
 *
 * @param token the token to parse
 * @returns the two flags
 * @throws ShapeParseError if the token is not a pair of 0/1 flags
 */
function parseFlags(token: string): [0 | 1, 0 | 1] {
    const parts = token.split(",");
    if (parts.length !== 2) {
        throw new ShapeParseError(`arc flags "${token}" must be "largeArc,sweep" (e.g. 0,1)`);
    }
    const toFlag = (part: string): 0 | 1 => {
        if (part !== "0" && part !== "1") {
            throw new ShapeParseError(`arc flag "${part}" must be 0 or 1`);
        }
        return part === "1" ? 1 : 0;
    };
    return [toFlag(parts[0]), toFlag(parts[1])];
}

/**
 * Parses an `x,y` coordinate token into its two affine components
 *
 * @param token the token to parse
 * @returns the x and y expressions
 * @throws ShapeParseError if the token is not a coordinate pair
 */
function parseCoordinate(token: string): [Affine, Affine] {
    const parts = token.split(",");
    if (parts.length !== 2) {
        throw new ShapeParseError(`coordinate "${token}" must be "x,y" (no spaces inside)`);
    }
    return [parseExpr(parts[0]), parseExpr(parts[1])];
}

/**
 * Splits a decoration string into its sub-paths. A single decoration attribute may hold several
 * strokes (a database with three rims, a component with two ports) by starting each with its own
 * `M`. An empty/whitespace string yields no decorations.
 *
 * @param decoration the decoration string to split
 * @returns the sub-path strings
 */
function splitDecorationSubpaths(decoration: string): string[] {
    return decoration
        .split(/(?=[Mm])/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

/**
 * Parses a shape definition — an outline `path` string and an optional `decoration` string (which
 * may contain several `M`-started sub-paths) — into the {@link ShapeIR} the layout engine consumes.
 * Coordinates are affine in `w`, `h`, and the corner rounding `r`. Only the path-based syntax is
 * supported.
 *
 * @param path the outline path string
 * @param decoration the decoration string, or undefined if the shape has no decorations
 * @returns the parsed shape
 * @throws ShapeParseError if the path or the decoration is malformed
 */
export function parseShape(path: string, decoration?: string): ShapeIR {
    if (path.trim().length === 0) {
        throw new ShapeParseError("shape requires a non-empty path");
    }
    const vertices = parsePathData(path);
    const decorations = (decoration ? splitDecorationSubpaths(decoration) : []).map(parseDecoration);
    return {
        vertices,
        content: noInset,
        decorations: decorations.length > 0 ? decorations : undefined
    };
}

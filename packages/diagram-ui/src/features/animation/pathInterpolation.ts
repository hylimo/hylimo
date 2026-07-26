/**
 * Animating a parametric shape means animating its outline, which is an SVG path *string* rather
 * than a set of numeric fields. A plain linear interpolation of `x`/`y` alone leaves the geometry
 * frozen at its final size and merely slides it into place (a centered resize then looks like it
 * grows in a single direction). Because a shape's path coordinates are affine functions of the box
 * (width, height, corner rounding), the old and new path strings for a resize share an identical
 * command structure and differ only in their numbers — so interpolating those numbers token by
 * token reproduces exactly the geometry the layout engine would have produced at each intermediate
 * size, and composes correctly with the animated translation.
 */

/**
 * Matches a single SVG path number: optional sign, integer/fraction, optional exponent. Arc flag
 * digits (`0`/`1`) match too, but during a structure-preserving resize they are identical on both
 * ends, so interpolating them is a no-op and never yields a fractional flag.
 */
const NUMBER_RE = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/**
 * A path string decomposed into the literal glue (command letters, spaces, commas) surrounding its
 * numbers, plus the numbers themselves. Reassembling `glue[0] + n[0] + glue[1] + n[1] + …` yields
 * the original string. `glue` always has exactly `numbers.length + 1` entries.
 */
interface TokenizedPath {
    /**
     * The literal chunks surrounding the numbers
     */
    glue: string[];
    /**
     * The numbers of the path, in order
     */
    numbers: number[];
}

/**
 * Splits a path into its literal glue and its numbers.
 *
 * @param path the SVG path string
 * @returns the tokenized path
 */
function tokenizePath(path: string): TokenizedPath {
    const glue: string[] = [];
    const numbers: number[] = [];
    let lastIndex = 0;
    for (let match = NUMBER_RE.exec(path); match != null; match = NUMBER_RE.exec(path)) {
        glue.push(path.slice(lastIndex, match.index));
        numbers.push(Number.parseFloat(match[0]));
        lastIndex = match.index + match[0].length;
    }
    glue.push(path.slice(lastIndex));
    return { glue, numbers };
}

/**
 * A structure-matched pair of paths ready to be interpolated: the shared glue plus the two number
 * vectors to blend between.
 */
export interface PathInterpolation {
    /**
     * The literal chunks shared by both paths; `glue.length === from.length + 1`
     */
    glue: string[];
    /**
     * The numbers of the start path
     */
    from: number[];
    /**
     * The numbers of the end path
     */
    to: number[];
}

/**
 * Builds a {@link PathInterpolation} for two path strings, but only when their command structure is
 * identical — i.e. they tokenize to the same glue and the same number count. That is the case for a
 * resize of the same shape (the common case), where only the coordinates differ. When the structure
 * differs (the shape type changed, or a segment collapsed at an extreme size) no interpolation is
 * possible and `undefined` is returned so the caller can fall back to snapping to the final path.
 *
 * @param from the start path string
 * @param to the end path string
 * @returns the interpolation, or undefined if the paths are not structurally compatible
 */
export function buildPathInterpolation(from: string, to: string): PathInterpolation | undefined {
    const fromTokens = tokenizePath(from);
    const toTokens = tokenizePath(to);
    if (fromTokens.numbers.length !== toTokens.numbers.length) {
        return undefined;
    }
    for (let i = 0; i < fromTokens.glue.length; i++) {
        if (fromTokens.glue[i] !== toTokens.glue[i]) {
            return undefined;
        }
    }
    return { glue: fromTokens.glue, from: fromTokens.numbers, to: toTokens.numbers };
}

/**
 * Formats an interpolated coordinate, rounding to the same 1e-6 precision the layout engine uses so
 * the animated path stays a compact string.
 *
 * @param value the raw interpolated value
 * @returns the formatted number
 */
function formatCoordinate(value: number): string {
    return (Math.round(value * 1e6) / 1e6).toString();
}

/**
 * Interpolates a path at time `t`, rebuilding the path string from the blended numbers.
 *
 * Two numbers can be glued together by nothing at all, as the minus sign of a negative one already
 * separates them (`0 0 1-1.7e-15`). Rounding can take that sign away — a tiny negative coordinate
 * becomes `0` — which would fuse the two numbers into a single one and shift every following
 * parameter of the command, so the separator is put back explicitly.
 *
 * @param interpolation the structure-matched path pair
 * @param t the interpolation parameter, 0 (start) to 1 (end)
 * @returns the interpolated path string
 */
export function interpolatePath(interpolation: PathInterpolation, t: number): string {
    const { glue, from, to } = interpolation;
    let result = glue[0];
    for (let i = 0; i < from.length; i++) {
        const value = t >= 1 ? to[i] : (1 - t) * from[i] + t * to[i];
        const formatted = formatCoordinate(value);
        if (i > 0 && glue[i].length === 0 && !formatted.startsWith("-")) {
            result += " ";
        }
        result += formatted + glue[i + 1];
    }
    return result;
}

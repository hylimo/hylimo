/**
 * A value that is an affine function of the box dimensions and the corner rounding:
 *
 *     value = w * W + h * H + r * R + c
 *
 * where `W`/`H` are the box width/height and `R` is the corner rounding at evaluation time.
 * Keeping every authored coordinate strictly affine is what makes the layout fixpoint
 * well-behaved: only `W`/`H` are solved for, while `R` is a constant known from the style.
 */
export interface Affine {
    /**
     * Coefficient of the box width `w`
     */
    readonly w: number;
    /**
     * Coefficient of the box height `h`
     */
    readonly h: number;
    /**
     * Coefficient of the corner rounding `r`
     */
    readonly r: number;
    /**
     * Constant offset
     */
    readonly c: number;
}

/**
 * Creates a constant affine value
 *
 * @param c the constant value
 * @returns the affine value which always evaluates to `c`
 */
export function constant(c: number): Affine {
    return { w: 0, h: 0, r: 0, c };
}

/**
 * Evaluates an affine value for a concrete box size and corner rounding
 *
 * @param a the affine value to evaluate
 * @param width the box width
 * @param height the box height
 * @param rounding the corner rounding
 * @returns the resulting number
 */
export function evalAffine(a: Affine, width: number, height: number, rounding: number): number {
    return a.w * width + a.h * height + a.r * rounding + a.c;
}

/**
 * Checks whether an affine value is a plain constant, meaning it does not depend on the box or the rounding
 *
 * @param a the affine value to check
 * @returns true if the value is constant
 */
export function isConstant(a: Affine): boolean {
    return a.w === 0 && a.h === 0 && a.r === 0;
}

/**
 * The box width as an affine value (`w`)
 */
const VAR_W: Affine = { w: 1, h: 0, r: 0, c: 0 };
/**
 * The box height as an affine value (`h`)
 */
const VAR_H: Affine = { w: 0, h: 1, r: 0, c: 0 };
/**
 * The corner rounding as an affine value (`r`)
 */
const VAR_R: Affine = { w: 0, h: 0, r: 1, c: 0 };

/**
 * Checks whether two affine values are equal, meaning they behave identically at every box size
 *
 * @param a the first value
 * @param b the second value
 * @returns true if both values are equal
 */
export function affineEquals(a: Affine, b: Affine): boolean {
    return a.w === b.w && a.h === b.h && a.r === b.r && a.c === b.c;
}

/**
 * Adds two affine values
 *
 * @param a the left summand
 * @param b the right summand
 * @returns the sum
 */
function add(a: Affine, b: Affine): Affine {
    return { w: a.w + b.w, h: a.h + b.h, r: a.r + b.r, c: a.c + b.c };
}

/**
 * Subtracts two affine values
 *
 * @param a the minuend
 * @param b the subtrahend
 * @returns the difference
 */
function sub(a: Affine, b: Affine): Affine {
    return { w: a.w - b.w, h: a.h - b.h, r: a.r - b.r, c: a.c - b.c };
}

/**
 * Multiplies two affine values, which is only affine if at least one of them is constant
 *
 * @param a the left factor
 * @param b the right factor
 * @returns the product
 * @throws ExprError if both factors depend on the box
 */
function mul(a: Affine, b: Affine): Affine {
    if (isConstant(a)) {
        return { w: b.w * a.c, h: b.h * a.c, r: b.r * a.c, c: b.c * a.c };
    }
    if (isConstant(b)) {
        return { w: a.w * b.c, h: a.h * b.c, r: a.r * b.c, c: a.c * b.c };
    }
    throw new ExprError("non-affine expression: cannot multiply two box-dependent terms");
}

/**
 * Divides two affine values, which is only affine if the divisor is a non-zero constant
 *
 * @param a the dividend
 * @param b the divisor
 * @returns the quotient
 * @throws ExprError if the divisor depends on the box or is zero
 */
function div(a: Affine, b: Affine): Affine {
    if (!isConstant(b)) {
        throw new ExprError("non-affine expression: cannot divide by a box-dependent term");
    }
    if (b.c === 0) {
        throw new ExprError("division by zero");
    }
    return { w: a.w / b.c, h: a.h / b.c, r: a.r / b.c, c: a.c / b.c };
}

/**
 * Error thrown when an expression cannot be parsed or is not affine
 */
export class ExprError extends Error {}

/**
 * A single lexical token of an affine expression: a number literal, a variable name, or an operator
 */
type Token =
    | {
          /**
           * Discriminator marking a number literal
           */
          kind: "num";
          /**
           * The parsed numeric value
           */
          value: number;
      }
    | {
          /**
           * Discriminator marking an identifier
           */
          kind: "ident";
          /**
           * The lower-cased identifier
           */
          value: string;
      }
    | {
          /**
           * Discriminator marking an operator or parenthesis
           */
          kind: "op";
          /**
           * The operator character
           */
          value: string;
      };

/**
 * Splits an expression string into number, identifier, and operator tokens
 *
 * @param src the expression to tokenize
 * @returns the resulting tokens
 * @throws ExprError if the expression contains an unexpected character or an invalid number
 */
function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        if (ch === " " || ch === "\t") {
            i++;
            continue;
        }
        if ("+-*/()".includes(ch)) {
            tokens.push({ kind: "op", value: ch });
            i++;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let j = i + 1;
            while (j < src.length && /[0-9.]/.test(src[j])) {
                j++;
            }
            const value = Number.parseFloat(src.slice(i, j));
            if (Number.isNaN(value)) {
                throw new ExprError(`invalid number in "${src}"`);
            }
            tokens.push({ kind: "num", value });
            i = j;
            continue;
        }
        if (/[a-zA-Z]/.test(ch)) {
            let j = i + 1;
            while (j < src.length && /[a-zA-Z]/.test(src[j])) {
                j++;
            }
            tokens.push({ kind: "ident", value: src.slice(i, j).toLowerCase() });
            i = j;
            continue;
        }
        throw new ExprError(`unexpected character "${ch}" in "${src}"`);
    }
    return tokens;
}

/**
 * Recursive-descent parser for affine expressions over the variables `w`, `h`, and `r`.
 * Supports `+ - * /`, parentheses, and implicit multiplication between a number and a
 * variable (e.g. `0.5h`, `2r`). Anything that would make the result non-affine is rejected.
 */
class Parser {
    /**
     * The index of the token which is parsed next
     */
    private pos = 0;

    /**
     * Creates a new parser for the given tokens
     *
     * @param tokens the tokens to parse
     */
    constructor(private readonly tokens: Token[]) {}

    /**
     * Parses the whole token stream
     *
     * @returns the parsed affine value
     * @throws ExprError if the expression is malformed or not affine
     */
    parse(): Affine {
        const result = this.parseAddSub();
        if (this.pos < this.tokens.length) {
            throw new ExprError("unexpected trailing tokens");
        }
        return result;
    }

    /**
     * Provides the token which is parsed next without consuming it
     *
     * @returns the next token, or undefined if the end of the expression is reached
     */
    private peek(): Token | undefined {
        return this.tokens[this.pos];
    }

    /**
     * Parses a sequence of additions and subtractions
     *
     * @returns the parsed affine value
     */
    private parseAddSub(): Affine {
        let left = this.parseMulDiv();
        for (;;) {
            const token = this.peek();
            if (token?.kind === "op" && (token.value === "+" || token.value === "-")) {
                this.pos++;
                const right = this.parseMulDiv();
                left = token.value === "+" ? add(left, right) : sub(left, right);
            } else {
                return left;
            }
        }
    }

    /**
     * Parses a sequence of multiplications and divisions.
     * Two operands with no operator between them are an implicit multiplication (`2 h`, `2(...)`, `h(...)`).
     *
     * @returns the parsed affine value
     */
    private parseMulDiv(): Affine {
        let left = this.parseUnary();
        for (;;) {
            const token = this.peek();
            const implicit =
                token !== undefined &&
                (token.kind === "num" || token.kind === "ident" || (token.kind === "op" && token.value === "("));
            if (token?.kind === "op" && (token.value === "*" || token.value === "/")) {
                this.pos++;
                const right = this.parseUnary();
                left = token.value === "*" ? mul(left, right) : div(left, right);
            } else if (implicit) {
                left = mul(left, this.parseUnary());
            } else {
                return left;
            }
        }
    }

    /**
     * Parses an operand with an arbitrary number of leading signs
     *
     * @returns the parsed affine value
     */
    private parseUnary(): Affine {
        const token = this.peek();
        if (token?.kind === "op" && token.value === "-") {
            this.pos++;
            return sub(constant(0), this.parseUnary());
        }
        if (token?.kind === "op" && token.value === "+") {
            this.pos++;
            return this.parseUnary();
        }
        return this.parsePrimary();
    }

    /**
     * Parses a number, a variable, or a parenthesized subexpression
     *
     * @returns the parsed affine value
     * @throws ExprError on an unknown variable, an unexpected token, or a missing closing parenthesis
     */
    private parsePrimary(): Affine {
        const token = this.peek();
        if (token === undefined) {
            throw new ExprError("unexpected end of expression");
        }
        if (token.kind === "num") {
            this.pos++;
            return constant(token.value);
        }
        if (token.kind === "ident") {
            this.pos++;
            if (token.value === "w") {
                return VAR_W;
            }
            if (token.value === "h") {
                return VAR_H;
            }
            if (token.value === "r") {
                return VAR_R;
            }
            throw new ExprError(`unknown variable "${token.value}" (only w, h and r are allowed)`);
        }
        if (token.kind === "op" && token.value === "(") {
            this.pos++;
            const inner = this.parseAddSub();
            const closing = this.peek();
            if (closing?.kind !== "op" || closing.value !== ")") {
                throw new ExprError("missing closing parenthesis");
            }
            this.pos++;
            return inner;
        }
        throw new ExprError(`unexpected token "${token.value}"`);
    }
}

/**
 * Parses an affine expression string such as `w - h/2` or `0.5h + r`
 *
 * @param src the expression to parse
 * @returns the parsed affine value
 * @throws ExprError if the expression is empty, malformed, or not affine
 */
export function parseAffine(src: string): Affine {
    const trimmed = src.trim();
    if (trimmed.length === 0) {
        throw new ExprError("empty expression");
    }
    return new Parser(tokenize(trimmed)).parse();
}

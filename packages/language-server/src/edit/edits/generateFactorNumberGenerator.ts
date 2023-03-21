import { FieldEntry, IdentifierExpression, InvocationExpression, NumberLiteralExpression } from "@hylimo/core";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { FactorMultiplicativeNumberGenerator } from "../generators/factorMultiplicativeNumberGenerator";
import { FactorReplacementNumberGenerator } from "../generators/factorReplacementNumberGenerator";

/**
 * Generates a new EditGeneratorEntry based on the provided FieldEntry to modify.
 * If the entry is a literal number, modifies it.
 * If it is an multiplicative expression (expression * or / literal number) modifies the operator and the literal.
 * Otherwise adds an multiplicative expression to the end
 *
 * @param entry the FieldEntry to modify
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
export function generateFactorNumberGenerator(entry: FieldEntry, meta: any): EditGeneratorEntry {
    const source = entry.source;
    if (source == undefined) {
        throw new Error("entry and its source must not be undefined");
    }
    const position = source.position;
    if (source instanceof NumberLiteralExpression) {
        return {
            start: position.startOffset,
            end: position.endOffset,
            generator: FactorReplacementNumberGenerator.create(source.value),
            meta
        };
    }
    if (source instanceof InvocationExpression) {
        const entry = generateFactorMultiplicativeNumberGeneratorIfPossible(source, meta);
        if (entry != undefined) {
            return entry;
        }
    }
    return {
        start: position.endOffset,
        end: position.endOffset,
        generator: FactorMultiplicativeNumberGenerator.create(1),
        meta
    };
}

/**
 * Tries to interpret the expression as operator expression with * or / as operator and a number literal on the right side.
 * If possible, generates a FactorMultiplicativeNumberGenerator. Otherwise, returns undefined
 *
 * @param expression the possible operator expression
 * @param meta metadata to add to the entry
 * @returns the generated EditGeneratorEntry or undefined if impossible
 */
function generateFactorMultiplicativeNumberGeneratorIfPossible(
    expression: InvocationExpression,
    meta: any
): EditGeneratorEntry | undefined {
    const target = expression.target;
    if (!(target instanceof IdentifierExpression && expression.argumentExpressions.length === 2)) {
        return undefined;
    }
    let fraction: boolean;
    if (target.identifier === "/") {
        fraction = true;
    } else if (target.identifier === "*") {
        fraction = false;
    } else {
        return undefined;
    }
    const rightSide = expression.argumentExpressions[1].value;
    if (!(rightSide instanceof NumberLiteralExpression)) {
        return undefined;
    }
    if (!target.position || !rightSide.position) {
        return undefined;
    }
    const leftSideEndOffset = expression.argumentExpressions[0].value.position?.endOffset ?? Number.POSITIVE_INFINITY;
    if (target.position.startOffset < leftSideEndOffset) {
        return undefined;
    }
    return {
        start: leftSideEndOffset,
        end: expression.position.endOffset,
        generator: FactorMultiplicativeNumberGenerator.create(fraction ? 1 / rightSide.value : rightSide.value),
        meta
    };
}

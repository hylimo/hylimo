import { FieldEntry, IdentifierExpression, InvocationExpression, NumberLiteralExpression } from "@hylimo/core";
import { EditGeneratorEntry } from "../editGeneratorEntry";
import { DeltaAdditiveNumberGenerator } from "../generators/deltaAdditiveNumberGenerator";
import { DeltaReplacementNumberGenerator } from "../generators/deltaReplacementNumberGenerator";

/**
 * Generates a new EditGeneratorEntry based on the provided FieldEntry to modify.
 * If the entry is a literal number, modifies it.
 * If it is an additive expression (expression +/- literal number) modifies the operator and the literal.
 * Otherwise adds an additive expression to the end
 *
 * @param entry the FieldEntry to modify
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
export function generateDeltaNumberGenerator(entry: FieldEntry, meta: any): EditGeneratorEntry {
    const source = entry.source;
    const position = source?.position;
    if (source == undefined) {
        throw new Error("entry and its source must not be undefined");
    }
    if (source instanceof NumberLiteralExpression) {
        return {
            start: position!.startOffset,
            end: position!.endOffset + 1,
            generator: new DeltaReplacementNumberGenerator(source.value),
            meta
        };
    }
    if (source instanceof InvocationExpression) {
        const entry = generateDeltaAdditiveNumberGeneratorIfPossible(source, meta);
        if (entry != undefined) {
            return entry;
        }
    }
    return {
        start: position!.endOffset + 1,
        end: position!.endOffset + 1,
        generator: new DeltaAdditiveNumberGenerator(0),
        meta
    };
}

/**
 * Tries to interpret the expression as operator expression with +/- as operator and a number literal on the right side.
 * If possible, generates a DeltaAdditiveNumberGenerator. Otherwise, returns undefined
 *
 * @param expression the possible operator expression
 * @param meta metadata to add to the entry
 * @returns the generated EditGeneratorEntry or undefined if impossible
 */
function generateDeltaAdditiveNumberGeneratorIfPossible(
    expression: InvocationExpression,
    meta: any
): EditGeneratorEntry | undefined {
    const target = expression.target;
    if (!(target instanceof IdentifierExpression && expression.argumentExpressions.length === 2)) {
        return undefined;
    }
    let sign: number;
    if (target.identifier === "-") {
        sign = -1;
    } else if (target.identifier === "+") {
        sign = 1;
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
    if (target.position!.startOffset < leftSideEndOffset) {
        return undefined;
    }
    return {
        start: leftSideEndOffset + 1,
        end: expression.position!.endOffset + 1,
        generator: new DeltaAdditiveNumberGenerator(rightSide.value * sign),
        meta
    };
}

import type { FullObject, BaseObject, ParenthesisExpressionMetadata, ListEntry, Range } from "@hylimo/core";
import {
    assertObject,
    SemanticFieldNames,
    isNull,
    assertString,
    isString,
    assertNumber,
    isWrapperObject,
    Expression,
    assertWrapperObject,
    FunctionExpression,
    AbstractInvocationExpression
} from "@hylimo/core";
import type {
    TemplateEntry,
    EditSpecificationEntry,
    ReplaceEditSpecificationEntry,
    AddEditSpecificationEntry,
    AddArgEditSpecificationEntry
} from "@hylimo/diagram-common";
import type { LayoutElement } from "../layoutElement.js";

/**
 * Converts the element to a EditSpecification
 *
 * @param expressions expression with associated key
 * @returns the generated EditSpecification
 */
export function applyEdits(layoutElement: LayoutElement): void {
    const element = layoutElement.element;
    const edits = element.getLocalFieldOrUndefined("edits")!.value;
    assertObject(edits);
    for (const [key, { value }] of edits.fields.entries()) {
        if (key != SemanticFieldNames.PROTO && !isNull(value)) {
            assertObject(value);
            const type = assertString(value.getLocalFieldOrUndefined("type")!.value, "type");
            const template = value.getLocalFieldOrUndefined("template")!.value;
            const parsedTemplate: TemplateEntry[] = parseTemplate(template);
            const target = value.getLocalFieldOrUndefined("target")!.value;
            layoutElement.edits[key] = generateEditSpecificationEntry(target, type, parsedTemplate, value);
        }
    }
}

/**
 * Parses a template used in an edit
 *
 * @param template the template to parse
 * @returns the parsed template
 */
function parseTemplate(template: BaseObject): TemplateEntry[] {
    if (isString(template)) {
        return [template.value];
    }  else if (isWrapperObject(template) && template.wrapped instanceof Expression) {
        return [{ range: template.wrapped.range }];
    }
    assertObject(template);
    const parsedTemplate: TemplateEntry[] = [];
    const length = assertNumber(template.getLocalFieldOrUndefined("length")!.value);
    for (let i = 0; i < length; i++) {
        const entry = template.getLocalFieldOrUndefined(i)!.value;
        if (isString(entry)) {
            parsedTemplate.push(entry.value);
        } else if (isWrapperObject(entry) && entry.wrapped instanceof Expression) {
            const expression = entry.wrapped as Expression;
            parsedTemplate.push({ range: expression.range });
        } else {
            throw new Error("Invalid template entry");
        }
    }
    return parsedTemplate;
}

/**
 * Generates an EditSpecificationEntry based on the provided target, type and parsed template
 *
 * @param target the target which is edited
 * @param type the type of the edit
 * @param parsedTemplate the parsed template
 * @returns the generated EditSpecificationEntry
 */
function generateEditSpecificationEntry(
    target: BaseObject,
    type: string,
    parsedTemplate: TemplateEntry[],
    value: FullObject
): EditSpecificationEntry {
    assertWrapperObject(target);
    const targetExpression = target.wrapped as Expression;
    if (type === "add") {
        return generateAddEditSpecificationEntry(targetExpression, parsedTemplate);
    } else if (type == "add-arg") {
        return generateAddArgExitSpecificationEntry(value, targetExpression, parsedTemplate);
    } else if (type === "replace") {
        return {
            type,
            range: targetExpression.range,
            template: parsedTemplate
        } satisfies ReplaceEditSpecificationEntry;
    } else if (type === "append") {
        return {
            type: "replace",
            range: targetExpression.range,
            template: [{ range: targetExpression.range }, ...parsedTemplate]
        }
    } else {
        throw new Error(`Unknown type ${type}`);
    }
}

/**
 * Generates an AddEditSpecificationEntry based on the provided target expression and parsed template
 *
 * @param targetExpression the target expression
 * @param parsedTemplate the parsed template
 * @returns the generated AddEditSpecificationEntry
 */
function generateAddEditSpecificationEntry(
    targetExpression: Expression,
    parsedTemplate: TemplateEntry[]
): AddEditSpecificationEntry {
    if (!(targetExpression instanceof FunctionExpression)) {
        throw new Error("Target must be a function expression");
    }
    let rangeStart: number;
    if (targetExpression.expressions.length === 0) {
        rangeStart = targetExpression.range[0] + 1;
    } else {
        rangeStart = targetExpression.expressions[targetExpression.expressions.length - 1].range[1];
    }
    return {
        type: "add",
        range: [rangeStart, targetExpression.range[1]],
        functionRange: targetExpression.range,
        template: parsedTemplate
    };
}

/**
 * Generates an AddArgEditSpecificationEntry based on the provided value, target expression and parsed template
 *
 * @param value the original edit object
 * @param targetExpression the target expression
 * @param parsedTemplate the parsed template
 * @returns the generated AddArgEditSpecificationEntry
 */
function generateAddArgExitSpecificationEntry(
    value: FullObject,
    targetExpression: Expression,
    parsedTemplate: TemplateEntry[]
): AddArgEditSpecificationEntry {
    const key = value.getLocalFieldOrUndefined("key")?.value?.toNative();
    if (typeof key !== "string" && typeof key !== "number") {
        throw new Error("Key must be a string or number");
    }
    if (!(targetExpression instanceof AbstractInvocationExpression)) {
        throw new Error("Target must be an invocation expression");
    }
    const listEntries = targetExpression.innerArgumentExpressions;
    const [targetPos, requiredPreceeding] = calculateAddArgPos(
        key,
        listEntries,
        targetExpression.trailingArgumentExpressions.length > 0
    );
    const parenthesisRange = (targetExpression.metadata as ParenthesisExpressionMetadata).parenthesisRange;
    const range = calculateAddArgRange(targetPos, listEntries, parenthesisRange);
    return {
        type: "add-arg",
        key,
        template: parsedTemplate,
        range,
        listRange: parenthesisRange,
        isFirst: targetPos <= 0,
        isLast: targetPos >= listEntries.length,
        requiredPreceeding
    };
}

/**
 * Calculates the range which should be replaced when inserting an argument
 *
 * @param targetPos the position where the argument should be inserted
 * @param listEntries the inner argument expressions
 * @param parenthesisRange the range of the whole parenthesis
 * @returns the range which should be replaced
 */
function calculateAddArgRange(targetPos: number, listEntries: ListEntry[], parenthesisRange: Range): Range {
    if (targetPos <= 0) {
        if (listEntries.length === 0) {
            return parenthesisRange;
        } else {
            return [parenthesisRange[0], listEntries[0].value.range[0]];
        }
    } else if (targetPos >= listEntries.length) {
        return [listEntries.at(-1)!.value.range[1], parenthesisRange[1]];
    } else {
        return [listEntries[targetPos - 1].value.range[1], listEntries[targetPos].value.range[0]];
    }
}

/**
 * Calculates the position where an argument should be added.
 * Semantics: Index where the argument should be inserted (e.g. 0 for the first)
 *
 * @param key the key of the argument
 * @param listEntries the inner argument expressions
 * @param hasTrailingArg true if the call expression has a trailing argument
 * @returns the position where the argument should be added, and the amount of required before-inserted arguments
 */
function calculateAddArgPos(
    key: string | number,
    listEntries: ListEntry[],
    hasTrailingArg: boolean
): [number, number | undefined] {
    if (typeof key === "string") {
        return [listEntries.length, undefined];
    }
    let foundIndexArgs = 0;
    let targetPos = 0;
    for (const entry of listEntries) {
        if (entry.name == undefined) {
            foundIndexArgs++;
        }
        if (foundIndexArgs >= key + 1) {
            break;
        }
        targetPos++;
    }
    if (key + 1 > foundIndexArgs && hasTrailingArg) {
        throw new Error("Cannot add argument after or in between trailing function expressions");
    }
    if (Number.isInteger(key) && key >= 0) {
        if (foundIndexArgs >= key + 1) {
            throw new Error("Cannot add argument at index " + key + " as it is already occupied");
        }
        return [targetPos, key - foundIndexArgs];
    } else {
        return [targetPos, undefined];
    }
}

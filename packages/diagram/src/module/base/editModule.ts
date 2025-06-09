import type { BaseObject, Expression, LabeledValue, InterpreterContext, StringObject } from "@hylimo/core";
import {
    AbstractInvocationExpression,
    assertString,
    assign,
    DefaultModuleNames,
    IdentifierExpression,
    InterpreterModule,
    jsFun,
    NumberLiteralExpression,
    FunctionExpression,
    RuntimeError,
    MissingArgumentSource,
    OperatorExpression,
    or,
    stringType,
    numberType,
    nameToExpression
} from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";

/**
 * Generates an edit
 *
 * @param target the target to edit
 * @param template the template to edit the target with
 * @param type the type of the edit
 * @param context the interpreter context
 * @returns the generated edit
 */
function generateEdit(
    target: Expression<any>,
    template: LabeledValue,
    type: "replace" | "add" | "add-arg" | "append",
    context: InterpreterContext
): BaseObject {
    const edit = context.newObject();
    edit.setSelfLocalField("type", { value: context.newString(type), source: undefined }, context);
    edit.setSelfLocalField("target", { value: target.toWrapperObject(context), source: undefined }, context);
    edit.setSelfLocalField("template", { value: template.value, source: undefined }, context);
    return edit;
}

/**
 * Generates a replace or add argument edit
 *
 * @param target the target to replace or add to
 * @param template the template to replace or add
 * @param context the interpreter context
 * @returns the generated replace or add argument edit
 */
function generateReplaceOrAddArgEdit(
    target: Expression<any> | MissingArgumentSource,
    template: LabeledValue,
    context: InterpreterContext
): BaseObject {
    if (target instanceof MissingArgumentSource) {
        return generateAddArgEdit(
            target.expression,
            template,
            {
                value: typeof target.key === "number" ? context.newNumber(target.key) : context.newString(target.key),
                source: undefined
            },
            context
        );
    } else {
        return generateEdit(target, template, "replace", context);
    }
}

/**
 * Generates an replace edit
 *
 * @param target the target to replace
 * @param template the template to replace the target with
 * @param context the interpreter context
 * @returns the generated replace edit
 */
function generateReplaceEdit(
    target: Expression<any> | MissingArgumentSource,
    template: BaseObject[],
    context: InterpreterContext
): BaseObject {
    const templateObject = context.newObject();
    templateObject.setSelfLocalField(
        "length",
        { value: context.newNumber(template.length), source: undefined },
        context
    );
    template.forEach((field, index) => {
        templateObject.setSelfLocalField(index, { value: field, source: undefined }, context);
    });
    return generateReplaceOrAddArgEdit(target, { value: templateObject, source: undefined }, context);
}

/**
 * Generates an add arg edit
 *
 * @param target the target invocation expression where the argument should be added
 * @param template the template to add as argument
 * @param key the key of the argument
 * @param context the interpreter context
 */
function generateAddArgEdit(
    target: AbstractInvocationExpression,
    template: LabeledValue,
    key: LabeledValue,
    context: InterpreterContext
): BaseObject {
    const keyValue = key.value.toNative();
    if (typeof keyValue === "number" && target.trailingArgumentExpressions.length > 0) {
        const indexExpressionCount = target.innerArgumentExpressions.filter((entry) => entry.name == undefined).length;
        if (keyValue + 1 > indexExpressionCount) {
            // the edit is impossible because it would be inserted after / in between trailing function arguments
            return context.null;
        }
    }
    const edit = generateEdit(target, template, "add-arg", context);
    edit.setSelfLocalField("key", key, context);
    return edit;
}

/**
 * Creates a jsonata string literal based on the given value
 *
 * @param value the value to create the jsonata string literal for
 * @returns the jsonata string literal
 */
export function jsonataStringLiteral(value: string): string {
    return `"${value.replaceAll(/\\/g, "\\\\").replaceAll(/"/g, '\\"')}"`;
}

/**
 * Edit module providing edit generation function
 */
export const editModule = InterpreterModule.create(
    DiagramModuleNames.EDIT,
    [...Object.values(DefaultModuleNames)],
    [],
    [
        assign(
            "createReplaceEdit",
            jsFun(
                (args, context) => {
                    const target = args.getSelfField(0, context).source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const template = args.getSelfField(1, context);
                    return generateReplaceOrAddArgEdit(target, template, context);
                },
                {
                    docs: "Creates a replace edit",
                    params: [
                        [0, "the target to replace"],
                        [1, "the template to replace the target with"]
                    ],
                    returns: "the created edit or null if the target is not editable"
                }
            )
        ),
        assign(
            "createAddEdit",
            jsFun(
                (args, context) => {
                    const target = args.getSelfField(0, context).source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    if (!(target instanceof FunctionExpression)) {
                        throw new RuntimeError("Target must be a function expression");
                    }
                    const template = args.getSelfField(1, context);
                    return generateEdit(target, template, "add", context);
                },
                {
                    docs: "Creates an add edit",
                    params: [
                        [0, "the target to add to"],
                        [1, "the template to add"]
                    ],
                    returns: "the created edit or null if the target is not editable"
                }
            )
        ),
        assign(
            "createAddArgEdit",
            jsFun(
                (args, context) => {
                    const target = args.getSelfField(0, context).source;
                    if (!(target instanceof AbstractInvocationExpression) || !target.metadata.isEditable) {
                        return context.null;
                    }
                    const template = args.getSelfField(2, context);
                    const key = args.getSelfField(1, context);
                    return generateAddArgEdit(target, template, key, context);
                },
                {
                    docs: "Creates an add argument edit",
                    params: [
                        [0, "the target invocation expression where the argument should be added"],
                        [1, "the key of the argument"],
                        [2, "the template to add as argument"]
                    ],
                    returns: "the created edit or null if the target is not editable"
                }
            )
        ),
        assign(
            "createAdditiveEdit",
            jsFun(
                (args, context) => {
                    const value = args.getSelfField(0, context);
                    const target = value.source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const deltaExp = (args.getSelfFieldValue(1, context) as StringObject).value;
                    if (target instanceof NumberLiteralExpression) {
                        const expression = `$string(${target.value} + ${deltaExp})`;
                        return generateEdit(
                            target,
                            { value: context.newString(expression), source: undefined },
                            "replace",
                            context
                        );
                    }
                    if (target instanceof MissingArgumentSource) {
                        const expression = `$string(${deltaExp})`;
                        return generateReplaceOrAddArgEdit(
                            target,
                            { value: context.newString(expression), source: undefined },
                            context
                        );
                    }

                    if (target instanceof OperatorExpression) {
                        const operator = target.operator;
                        if (
                            operator instanceof IdentifierExpression &&
                            (operator.identifier === "+" || operator.identifier === "-") &&
                            target.right instanceof NumberLiteralExpression
                        ) {
                            const rightHandValue = target.right.value;
                            const replacedValue = operator.identifier === "+" ? rightHandValue : -rightHandValue;
                            const sum = `${replacedValue} + ${deltaExp}`;
                            const operatorAndSum = `($res := ${sum}; $res >= 0 ? " + " & $res : " - " & -$res)`;
                            const operatorAndSumExp = context.newString(operatorAndSum);
                            return generateReplaceEdit(
                                target,
                                [target.left.toWrapperObject(context), operatorAndSumExp],
                                context
                            );
                        }
                    }
                    const operatorAndSum = `( $delta := ${deltaExp}; $delta >= 0 ? " + " & $delta : " - " & -$delta )`;
                    const operatorAndSumExp = context.newString(operatorAndSum);
                    return generateReplaceEdit(target, [target.toWrapperObject(context), operatorAndSumExp], context);
                },
                {
                    docs: "Creates an additive edit",
                    params: [
                        [0, "the target to replace"],
                        [1, "the expression for the delta to add"]
                    ],
                    returns: "the created edit or null if the target is not editable"
                }
            )
        ),
        assign(
            "createAppendScopeEdit",
            jsFun(
                (args, context) => {
                    const value = args.getSelfField(0, context);
                    const target = value.source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const scope = args.getSelfField(1, context).value;
                    const expression = args.getSelfField(2, context).value;
                    return generateEdit(
                        target as Expression<any>,
                        {
                            value: context.newString(
                                `' ${assertString(scope)} {\n    ' & $replace(${assertString(expression)}, '\n', '\n    ') & '\n}'`
                            ),
                            source: undefined
                        },
                        "append",
                        context
                    );
                },
                {
                    docs: "Creates an append scope edit",
                    params: [
                        [0, "the target to replace / append to"],
                        [1, "the name of the scope"],
                        [2, "the expression to append"]
                    ],
                    returns: "the created edit or null if the target is not editable"
                }
            )
        ),
        assign(
            "nameToExpression",
            jsFun(
                (args, context) => {
                    const name = args.getSelfFieldValue(0, context).toNative();
                    const expression = nameToExpression(name);
                    return context.newString(expression);
                },
                {
                    docs: "Converts a name to an expression",
                    params: [[0, "the name of the identifier to convert", or(stringType, numberType)]],
                    returns: "the expression"
                }
            )
        ),
        assign(
            "nameToJsonataStringLiteral",
            jsFun(
                (args, context) => {
                    const name = args.getSelfFieldValue(0, context).toNative();
                    const expression = nameToExpression(name);
                    const escapedExpression = jsonataStringLiteral(expression);
                    return context.newString(escapedExpression);
                },
                {
                    docs: "Converts a name to a jsonata expression",
                    params: [[0, "the name of the identifier to convert", or(stringType, numberType)]],
                    returns: "the jsonata expression"
                }
            )
        )
    ]
);

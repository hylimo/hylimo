import {
    assertString,
    assign,
    BaseObject,
    DefaultModuleNames,
    Expression,
    FieldEntry,
    IdentifierExpression,
    InterpreterContext,
    InterpreterModule,
    InvocationExpression,
    jsFun,
    NumberLiteralExpression,
    StringObject
} from "@hylimo/core";

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
    template: FieldEntry,
    type: "replace" | "add",
    context: InterpreterContext
): BaseObject {
    const edit = context.newObject();
    edit.setLocalField("type", { value: context.newString(type) }, context);
    edit.setLocalField("target", { value: target.toWrapperObject(context) }, context);
    edit.setLocalField("template", { value: template.value }, context);
    return edit;
}

/**
 * Geneates an replace edit
 *
 * @param target the target to replace
 * @param template the template to replace the target with
 * @param context the interpreter context
 * @returns the generated replace edit
 */
function generateReplaceEdit(target: Expression<any>, template: BaseObject[], context: InterpreterContext): BaseObject {
    const templateObject = context.newObject();
    templateObject.setLocalField("length", { value: context.newNumber(template.length) }, context);
    template.forEach((field, index) => {
        templateObject.setLocalField(index, { value: field }, context);
    });
    return generateEdit(target, { value: templateObject }, "replace", context);
}

/**
 * Edit module providing edit generation function
 */
export const editModule = InterpreterModule.create(
    "edit",
    [...Object.values(DefaultModuleNames)],
    [],
    [
        assign(
            "createReplaceEdit",
            jsFun(
                (args, context) => {
                    const target = args.getFieldEntry(0, context).source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const template = args.getFieldEntry(1, context);
                    return generateEdit(target, template, "replace", context);
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
                    const target = args.getFieldEntry(0, context).source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const template = args.getFieldEntry(1, context);
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
            "createAdditiveEdit",
            jsFun(
                (args, context) => {
                    const value = args.getFieldEntry(0, context);
                    const target = value.source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const deltaExp = (args.getField(1, context) as StringObject).value;
                    if (target instanceof NumberLiteralExpression) {
                        const expression = `$string(${target.value} + ${deltaExp})`;
                        return generateEdit(target, { value: context.newString(expression) }, "replace", context);
                    }

                    if (target instanceof InvocationExpression) {
                        const operator = target.target;
                        if (
                            operator instanceof IdentifierExpression &&
                            (operator.identifier === "+" || operator.identifier === "-") &&
                            target.argumentExpressions.length === 2 &&
                            target.argumentExpressions[1].value instanceof NumberLiteralExpression
                        ) {
                            const rightHandValue = target.argumentExpressions[1].value.value;
                            const replacedValue = operator.identifier === "+" ? rightHandValue : -rightHandValue;
                            const sum = `${replacedValue} + ${deltaExp}`;
                            const operatorAndSum = `($res := ${sum}; $res >= 0 ? " + " & $res : " - " & -$res)`;
                            const operatorAndSumExp = context.newString(operatorAndSum);
                            return generateReplaceEdit(
                                target,
                                [target.argumentExpressions[0].value.toWrapperObject(context), operatorAndSumExp],
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
                    const value = args.getFieldEntry(0, context);
                    const target = value.source;
                    if (!target?.metadata?.isEditable) {
                        return context.null;
                    }
                    const scope = args.getFieldEntry(1, context).value;
                    const expression = args.getFieldEntry(2, context).value;
                    return generateReplaceEdit(
                        target,
                        [
                            target.toWrapperObject(context),
                            context.newString(
                                `' ${assertString(scope)} {\n    ' & $replace(${assertString(expression)}, '\n', '\n    ') & '\n}'`
                            )
                        ],
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
        )
    ]
);

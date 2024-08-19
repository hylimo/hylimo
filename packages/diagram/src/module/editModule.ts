import {
    assign,
    BaseObject,
    DefaultModuleNames,
    Expression,
    IdentifierExpression,
    InterpreterContext,
    InterpreterModule,
    InvocationExpression,
    jsFun,
    NumberLiteralExpression,
    StringObject
} from "@hylimo/core";

function generateExpressionObject(expression: string, context: InterpreterContext): BaseObject {
    const res = context.newObject();
    res.setLocalField("exp", { value: context.newString(expression) }, context);
    return res;
}

function generateReplaceEdit(target: Expression<any>, template: BaseObject[], context: InterpreterContext): BaseObject {
    const edit = context.newObject();
    edit.setLocalField("type", { value: context.newString("replace") }, context);
    edit.setLocalField("target", { value: target.toWrapperObject(context) }, context);
    const templateObject = context.newObject();
    templateObject.setLocalField("length", { value: context.newNumber(template.length) }, context);
    template.forEach((field, index) => {
        templateObject.setLocalField(index, { value: field }, context);
    });
    edit.setLocalField("template", { value: templateObject }, context);
    return edit;
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
                    const template = args.getField(1, context).invoke([], context);
                    return generateReplaceEdit(target, [template.value], context);
                },
                {
                    docs: "Creates a replace edit",
                    params: [
                        [0, "the target to replace"],
                        [1, "generator function for the template to replace the target with"]
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
                        return generateReplaceEdit(target, [generateExpressionObject(deltaExp, context)], context);
                    }

                    if (target instanceof InvocationExpression) {
                        const operator = target.target;
                        if (
                            operator instanceof IdentifierExpression &&
                            (operator.identifier === "+" || operator.identifier === "-") &&
                            target.argumentExpressions.length === 2 &&
                            target.argumentExpressions[1] instanceof NumberLiteralExpression
                        ) {
                            const rightHandValue = target.argumentExpressions[1].value;
                            const replacedValue = operator.identifier === "+" ? rightHandValue : -rightHandValue;
                            const sum = `{ "+": [${replacedValue}, ${deltaExp}] }`;
                            const operatorAndSum = `{ "if": [{ ">=": [${sum}, 0] }, { "cat": [" + ", ${sum}] }, { "cat": [" - ", { "-": ${sum} }] }] }`;
                            const operatorAndSumExp = generateExpressionObject(operatorAndSum, context);
                            return generateReplaceEdit(
                                target,
                                [target.argumentExpressions[0].value.toWrapperObject(context), operatorAndSumExp],
                                context
                            );
                        }
                    }
                    const operatorAndSum = `{ "if": [{ ">=": [${deltaExp}, 0] }, { "cat": [" + ", ${deltaExp}] }, { "cat": [" - ", { "-": ${deltaExp}}] }] }`;
                    const operatorAndSumExp = generateExpressionObject(operatorAndSum, context);
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
        )
    ]
);

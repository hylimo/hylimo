import {
    assign,
    ExecutableConstExpression,
    ExecutableNumberLiteralExpression,
    Expression,
    fun,
    FunctionObject,
    functionType,
    InterpreterModule,
    jsFun,
    parse
} from "@hylimo/core";
import { convertStringOrIdentifier } from "./propertiesAndMethods.js";

/**
 * Module providing the entries content handler
 * Requires the sections content handler
 */
export const entriesModule = InterpreterModule.create(
    "uml/classifier/entries",
    [],
    [],
    [
        assign(
            "_literalsScopeGenerator",
            fun([
                ...parse(
                    `
                        (scope) = args
                    `
                ),
                jsFun(
                    (args, context) => {
                        const scopeFunction = args.getLocalFieldOrUndefined(0)!.value;
                        if (!(scopeFunction instanceof FunctionObject)) {
                            throw new Error("scope is not a function");
                        }
                        const expressions = scopeFunction.definition.expressions.map(
                            (expression) => expression.expression
                        );
                        const scope = context.getField("scope");
                        const enumLiterals = convertEnumLiterals(expressions);

                        if (enumLiterals.length > 0) {
                            scope.invoke(
                                [
                                    ...enumLiterals.map((entry) => ({
                                        value: new ExecutableConstExpression({
                                            value: context.newString(entry)
                                        })
                                    })),
                                    {
                                        name: "section",
                                        value: new ExecutableNumberLiteralExpression(undefined, 2)
                                    }
                                ],
                                context
                            );
                        }

                        return context.null;
                    },
                    {
                        docs: `
                            Function to take a function in which enum literals can be declared declaratively.
                            The content of the function is not executed, but analyzed on the AST level.
                            Enum literals can be provided both as identifiers and as strings.
                            Example: \`ENUM_ENTRY\`
                        `,
                        params: [[0, "the function whose expressions will be used as enum literals", functionType]],
                        returns: "null"
                    }
                )
            ])
        ),
        ...parse(
            `
                scope.internal.entriesContentHandler = [
                    {
                        args.scope.entries = _literalsScopeGenerator(result.section)
                    },
                    { }
                ]
            `
        )
    ]
);

/**
 * Converts the given expressions to enum literals
 *
 * @param expressions the expressions to convert
 * @returns the enum literals
 */
function convertEnumLiterals(expressions: Expression[]): string[] {
    const literals: string[] = [];
    for (const expression of expressions) {
        literals.push(convertStringOrIdentifier(expression));
    }
    return literals;
}
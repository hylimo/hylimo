import type { Expression } from "@hylimo/core";
import { assign, ExecutableConstExpression, fun, FunctionObject, functionType, jsFun, num } from "@hylimo/core";
import { convertStringOrIdentifier } from "./propertiesAndMethods.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the entries content handler
 * Requires the sections content handler
 */
export const entriesModule = ContentModule.create(
    "uml/classifier/entries",
    [],
    [],
    [
        assign(
            "_literalsScopeGenerator",
            fun([
                `
                    (scope) = args
                `,
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
                                        value: num(2)
                                    }
                                ],
                                context,
                                undefined,
                                undefined
                            );
                        }

                        return context.null;
                    },
                    {
                        docs: `
                            Takes a function as parameter that declares enum literals through its expressions.
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
        `
            scope.internal.entriesContentHandler = [
                {
                    args.callScope.entries = _literalsScopeGenerator(args.callScope.section)
                },
                { }
            ]
        `
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

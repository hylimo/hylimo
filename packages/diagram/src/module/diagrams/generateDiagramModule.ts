import {
    assign,
    ExecutableExpression,
    fun,
    functionType,
    id,
    InterpreterModule,
    object,
    optional,
    SemanticFieldNames,
    Type
} from "@hylimo/core";
import { contents } from "./content/contents.js";
import { SCOPE } from "../base/dslModule.js";
import { ContentModule } from "./content/contentModule.js";

/**
 * Creates the executable expressions for a diagram module
 *
 * @param diagramName the name of the diagram function
 * @param docs the documentation for the diagram function
 * @param requiredContents the contents for the diagram
 * @param allContents all available contents, defaults to {@link contents}
 * @returns the executable expressions for the diagram module
 */
export function createDiagramModule(
    diagramName: string,
    docs: string,
    requiredContents: ContentModule[],
    allContents: ContentModule[] = contents
): ExecutableExpression[] {
    const modules = InterpreterModule.computeModules(requiredContents, allContents);
    const configProperties = modules.flatMap((module) => module.config);
    const configParams = configProperties.map(
        ([name, description, type]) => [name, description, optional(type)] as const
    );
    return [
        assign(
            diagramName,
            fun(
                [
                    id("generateDiagram").call(
                        fun([
                            assign(SCOPE, id(SemanticFieldNames.IT)),
                            ...modules.flatMap((module) => module.expressions),
                            createWithConfigFunction(configParams)
                        ]),
                        id(SemanticFieldNames.ARGS),
                        object(configProperties.map(([name, , , defaultValue]) => ({ name, value: defaultValue })))
                    )
                ],
                {
                    docs: docs,
                    params: [[0, "the callback to execute", functionType], ...configParams],
                    returns: "The created diagram"
                }
            )
        )
    ];
}
/**
 * Creates and registers a withConfig function which allows to temporarily change the configuration
 *
 * @param configParams the parameters for the configuration
 * @returns the expression registering the withConfig function in the scope
 */
function createWithConfigFunction(configParams: (readonly [string, string, Type])[]): ExecutableExpression {
    return id(SCOPE).assignField(
        "withConfig",
        fun(
            `
                this.oldConfig = scope.internal.config
                this.newConfig = args
                args.proto = this.oldConfig
                scope.internal.config = newConfig
                it()
                scope.internal.config = oldConfig
            `,
            {
                docs: "Executes a callback with a temporarily changed configuration.",
                params: [
                    [0, "the callback to execute with the temporarily changed configuration", functionType],
                    ...configParams
                ],
                returns: "null"
            }
        )
    );
}

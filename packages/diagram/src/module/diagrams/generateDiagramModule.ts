import {
    assign,
    ExecutableExpression,
    fun,
    functionType,
    id,
    InterpreterModule,
    object,
    optional,
    SemanticFieldNames
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
    return [
        assign(
            diagramName,
            fun(
                [
                    id("generateDiagram").call(
                        fun([
                            assign(SCOPE, id(SemanticFieldNames.IT)),
                            ...modules.flatMap((module) => module.expressions)
                        ]),
                        id(SemanticFieldNames.ARGS),
                        object(configProperties.map(([name, , , defaultValue]) => ({ name, value: defaultValue })))
                    )
                ],
                {
                    docs: docs,
                    params: [
                        [0, "the callback to execute", functionType],
                        ...configProperties.map(
                            ([name, description, type]) => [name, description, optional(type)] as const
                        )
                    ],
                    returns: "The created diagram"
                }
            )
        )
    ];
}

import { assign, ExecutableExpression, fun, id, InterpreterModule, SemanticFieldNames } from "@hylimo/core";
import { contents } from "./content/contents.js";
import { SCOPE } from "../base/dslModule.js";

/**
 * Creates the executable expressions for a diagram module
 *
 * @param diagramName the name of the diagram function
 * @param requiredContents the contents for the diagram
 * @param allContents all available contents, defaults to {@link contents}
 * @returns the executable expressions for the diagram module
 */
export function createDiagramModule(
    diagramName: string,
    requiredContents: InterpreterModule[],
    allContents: InterpreterModule[] = contents
): ExecutableExpression[] {
    const modules = InterpreterModule.computeModules(requiredContents, allContents);
    return [
        assign(
            diagramName,
            id("generateDiagramEnvironment").call(
                fun([assign(SCOPE, id(SemanticFieldNames.IT)), ...modules.flatMap((module) => module.expressions)])
            )
        )
    ];
}

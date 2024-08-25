import { InterpreterModule, assign, id } from "@hylimo/core";

/**
 * Module for base diagrams
 */
export const baseDiagramModule = InterpreterModule.create(
    "base-diagram",
    ["diagram", "dsl"],
    [],
    [assign("diagram", id("generateDiagramEnvironment").call())]
);

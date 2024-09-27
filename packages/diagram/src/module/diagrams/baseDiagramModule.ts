import { InterpreterModule } from "@hylimo/core";
import { createDiagramModule } from "./generateDiagramModule.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { elementModule } from "./content/common/element.js";

/**
 * Module for base diagrams
 */
export const baseDiagramModule = InterpreterModule.create(
    "base-diagram",
    ["diagram", "dsl"],
    [],
    createDiagramModule("diagram", [defaultStylesModule, elementModule])
);

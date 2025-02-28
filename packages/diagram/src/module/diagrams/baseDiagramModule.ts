import { InterpreterModule } from "@hylimo/core";
import { createDiagramModule } from "./generateDiagramModule.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { elementModule } from "./content/common/element.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";

/**
 * Module for base diagrams
 */
export const baseDiagramModule = InterpreterModule.create(
    DiagramModuleNames.BASE_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("diagram", "Creates a diagram", [defaultStylesModule, elementModule])
);

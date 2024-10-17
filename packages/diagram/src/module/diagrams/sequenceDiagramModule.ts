import { InterpreterModule } from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { associationsModule } from "./content/uml/associations.js";
import { sequenceDiagramInstanceModule } from "./content/uml/sequence/sequenceDiagramInstance.js";
import { marginSetting } from "./content/uml/sequence/marginSetting.js";

/**
 * Module for UML sequence diagrams.
 */
export const sequenceDiagramModule = InterpreterModule.create(
    DiagramModuleNames.SEQUENCE_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("sequenceDiagram", [
        elementModule,
        defaultStylesModule,
        marginSetting,
        sequenceDiagramInstanceModule,
        /*
        eventModule
        lifelineModule,
        frameModule, */
        associationsModule,
        readingDirectionModule
    ])
);

import { InterpreterModule } from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { associationsModule } from "./content/uml/associations.js";
import { sequenceDiagramInstanceModule } from "./content/uml/sequence/sequenceDiagramInstance.js";
import { defaultValues } from "./content/uml/sequence/defaultValues.js";
import { sequenceDiagramActorModule } from "./content/uml/sequence/sequenceDiagramActor.js";
import { eventModule } from "./content/uml/sequence/event.js";
import { lifelineModule } from "./content/uml/sequence/lifeline.js";
import { sequenceDiagramAssociationsModule } from "./content/uml/sequence/sequenceDiagramAssociations.js";

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
        defaultValues,
        sequenceDiagramInstanceModule,
        sequenceDiagramActorModule,
        eventModule,
        lifelineModule,
        // frameModule,
        sequenceDiagramAssociationsModule,
        readingDirectionModule
    ])
);

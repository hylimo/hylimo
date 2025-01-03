import { InterpreterModule } from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { sequenceDiagramInstanceModule } from "./content/uml/sequence/sequenceDiagramInstance.js";
import { defaultValues } from "./content/uml/sequence/defaultValues.js";
import { sequenceDiagramActorModule } from "./content/uml/sequence/sequenceDiagramActor.js";
import { eventModule } from "./content/uml/sequence/event.js";
import { activityIndicatorModule } from "./content/uml/sequence/activityIndicator.js";
import { sequenceDiagramAssociationsModule } from "./content/uml/sequence/sequenceDiagramAssociations.js";
import { participantModule } from "./content/uml/sequence/participant.js";
import { sequenceDiagramFrameModule } from "./content/uml/sequence/frame.js";
import { lostFoundMessageModule } from "./content/uml/sequence/lostFoundMessage.js";
import { commentModule } from "./content/uml/comment.js";

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
        commentModule,
        sequenceDiagramInstanceModule,
        sequenceDiagramActorModule,
        eventModule,
        activityIndicatorModule,
        sequenceDiagramFrameModule,
        participantModule,
        sequenceDiagramAssociationsModule,
        lostFoundMessageModule,
        readingDirectionModule
    ])
);

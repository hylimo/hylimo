import { InterpreterModule } from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { defaultValues } from "./content/uml/sequence/defaultValues.js";
import { eventModule } from "./content/uml/sequence/event.js";
import { activityIndicatorModule } from "./content/uml/sequence/activityIndicator.js";
import { sequenceDiagramAssociationsModule } from "./content/uml/sequence/sequenceDiagramAssociations.js";
import { sequenceDiagramFrameModule } from "./content/uml/sequence/frame.js";
import { lostFoundMessageModule } from "./content/uml/sequence/lostFoundMessage.js";
import { commentModule } from "./content/uml/comment.js";
import { sequenceDiagramCreateConnectionOperatorModule } from "./content/uml/sequence/sequenceDiagramCreateConnectionOperator.js";
import { nonNavigableAssociationsModule } from "./content/uml/nonNavigableAssociations.js";
import { associationsModule } from "./content/uml/associations.js";
import { importedParticipantsModule } from "./content/uml/sequence/importedParticipants.js";
import { registerClassifierModule } from "./content/uml/sequence/registerClassifier.js";
import { participantModule } from "./content/uml/sequence/participant.js";

/**
 * Module for UML sequence diagrams.
 */
export const sequenceDiagramModule = InterpreterModule.create(
    DiagramModuleNames.SEQUENCE_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("sequenceDiagram", "Creates a UML sequence diagram", [
        defaultStylesModule,
        registerClassifierModule,
        sequenceDiagramCreateConnectionOperatorModule,
        associationsModule,
        sequenceDiagramAssociationsModule,
        nonNavigableAssociationsModule,
        elementModule,
        defaultValues,
        commentModule,
        eventModule,
        activityIndicatorModule,
        sequenceDiagramFrameModule,
        importedParticipantsModule,
        lostFoundMessageModule,
        participantModule,
        readingDirectionModule
    ])
);

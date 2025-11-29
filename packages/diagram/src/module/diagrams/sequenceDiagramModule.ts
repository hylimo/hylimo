import { InterpreterModule } from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { defaultValuesModule } from "./content/uml/sequence/defaultValues.js";
import { sequenceDiagramStateModule } from "./content/uml/sequence/sequenceDiagramState.js";
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
import { timeControlModule } from "./content/uml/sequence/timeControl.js";

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
        defaultValuesModule,
        sequenceDiagramStateModule,
        commentModule,
        activityIndicatorModule,
        sequenceDiagramFrameModule,
        importedParticipantsModule,
        lostFoundMessageModule,
        participantModule,
        readingDirectionModule,
        timeControlModule
    ])
);

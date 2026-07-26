import { InterpreterModule } from "@hylimo/core";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { associationsModule } from "./content/uml/associations.js";
import { commentModule } from "./content/uml/comment.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { actionModule } from "./content/uml/activity/action.js";
import { objectsModule } from "./content/uml/activity/objects.js";
import { decisionAndMergeModule } from "./content/uml/activity/decisionAndMerge.js";
import { forkAndJoinModule } from "./content/uml/activity/forkAndJoin.js";
import { initialAndFinalModule } from "./content/uml/activity/initialAndFinal.js";
import { signalsModule } from "./content/uml/activity/signals.js";
import { connectorModule } from "./content/uml/activity/connector.js";

/**
 * Module for activity diagrams
 */
export const activityDiagramModule = InterpreterModule.create(
    DiagramModuleNames.ACTIVITY_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("activityDiagram", "Creates a UML activity diagram", [
        defaultStylesModule,
        associationsModule,
        elementModule,
        actionModule,
        objectsModule,
        decisionAndMergeModule,
        forkAndJoinModule,
        initialAndFinalModule,
        signalsModule,
        connectorModule,
        commentModule,
        readingDirectionModule
    ])
);

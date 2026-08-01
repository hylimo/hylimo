import { InterpreterModule } from "@hylimo/core";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { associationsModule } from "./content/uml/associations.js";
import { classModule } from "./content/uml/class.js";
import { interfaceModule } from "./content/uml/interface.js";
import { enumModule } from "./content/uml/enum.js";
import { packageModule } from "./content/uml/package.js";
import { commentModule } from "./content/uml/comment.js";
import { nonNavigableAssociationsModule } from "./content/uml/nonNavigableAssociations.js";
import { compositionAndAggregationModule } from "./content/uml/compositionAndAggregation.js";
import { extendsAndImplementsModule } from "./content/uml/extendsAndImplements.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { componentModule } from "./content/uml/component.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { classDiagramToolboxEditsModule } from "./content/uml/classDiagramToolboxEdits.js";
import { componentDiagramToolboxEditsModule } from "./content/uml/componentDiagramToolboxEdits.js";
import { instanceModule } from "./content/uml/instance.js";
import { actorModule } from "./content/uml/actor.js";
import { actionModule } from "./content/uml/activity/action.js";
import { objectsModule } from "./content/uml/activity/objects.js";
import { decisionAndMergeModule } from "./content/uml/activity/decisionAndMerge.js";
import { forkAndJoinModule } from "./content/uml/activity/forkAndJoin.js";
import { initialAndFinalModule } from "./content/uml/activity/initialAndFinal.js";
import { signalsModule } from "./content/uml/activity/signals.js";
import { connectorModule } from "./content/uml/activity/connector.js";
import { nodeModule } from "./content/uml/deployment/node.js";
import { artifactModule } from "./content/uml/deployment/artifact.js";
import { deploymentSpecificationModule } from "./content/uml/deployment/deploymentSpecification.js";
import { deploymentDiagramToolboxEditsModule } from "./content/uml/deploymentDiagramToolboxEdits.js";
import { useCaseModule } from "./content/uml/usecase/useCase.js";
import { subjectModule } from "./content/uml/usecase/subject.js";
import { systemActorModule } from "./content/uml/usecase/systemActor.js";
import { useCaseDiagramToolboxEditsModule } from "./content/uml/useCaseDiagramToolboxEdits.js";

/**
 * Module for (arbitrary) UML diagrams
 */
export const umlDiagramModule = InterpreterModule.create(
    DiagramModuleNames.UML_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("umlDiagram", "Creates a general UML diagram", [
        defaultStylesModule,
        associationsModule,
        nonNavigableAssociationsModule,
        compositionAndAggregationModule,
        extendsAndImplementsModule,
        actionModule,
        actorModule,
        artifactModule,
        classDiagramToolboxEditsModule,
        classModule,
        commentModule,
        componentDiagramToolboxEditsModule,
        componentModule,
        connectorModule,
        decisionAndMergeModule,
        deploymentDiagramToolboxEditsModule,
        deploymentSpecificationModule,
        elementModule,
        enumModule,
        forkAndJoinModule,
        initialAndFinalModule,
        instanceModule,
        interfaceModule,
        nodeModule,
        objectsModule,
        packageModule,
        readingDirectionModule,
        signalsModule,
        subjectModule,
        systemActorModule,
        useCaseDiagramToolboxEditsModule,
        useCaseModule
    ])
);

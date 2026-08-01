import { defaultMarkersModule } from "./common/defaultMarkers.js";
import { defaultShapesModule } from "./common/defaultShapes.js";
import { defaultStylesModule } from "./common/defaultStyles.js";
import { elementModule } from "./common/element.js";
import { associationsModule } from "./uml/associations.js";
import { classifierModule } from "./uml/classifier/classifier.js";
import { defaultTitleModule } from "./uml/classifier/defaultTitle.js";
import { entriesModule } from "./uml/classifier/entries.js";
import { portsModule } from "./uml/classifier/ports.js";
import { propertiesAndMethodsModule } from "./uml/classifier/propertiesAndMethods.js";
import { providesAndRequiresModule } from "./uml/classifier/providesAndRequires.js";
import { sectionsModule } from "./uml/classifier/sections.js";
import { classModule } from "./uml/class.js";
import { commentModule } from "./uml/comment.js";
import { componentModule } from "./uml/component.js";
import { compositionAndAggregationModule } from "./uml/compositionAndAggregation.js";
import { enumModule } from "./uml/enum.js";
import { extendsAndImplementsModule } from "./uml/extendsAndImplements.js";
import { interfaceModule } from "./uml/interface.js";
import { nonNavigableAssociationsModule } from "./uml/nonNavigableAssociations.js";
import { packageModule } from "./uml/package.js";
import { readingDirectionModule } from "./uml/readingDirection.js";
import { contentModule } from "./uml/classifier/content.js";
import { componentTitleModule } from "./uml/classifier/componentTitle.js";
import { instanceModule } from "./uml/instance.js";
import { actorModule } from "./uml/actor.js";
import { activityIndicatorModule } from "./uml/sequence/activityIndicator.js";
import { sequenceDiagramAssociationsModule } from "./uml/sequence/sequenceDiagramAssociations.js";
import { createParticipantMoule } from "./uml/sequence/createParticipant.js";
import { lostFoundMessageModule } from "./uml/sequence/lostFoundMessage.js";
import { valuesModule } from "./uml/classifier/values.js";
import { sequenceDiagramCreateConnectionOperatorModule } from "./uml/sequence/sequenceDiagramCreateConnectionOperator.js";
import type { ContentModule } from "./contentModule.js";
import { importedParticipantsModule } from "./uml/sequence/importedParticipants.js";
import { registerClassifierModule } from "./uml/sequence/registerClassifier.js";
import { participantModule } from "./uml/sequence/participant.js";
import { keywordsModule } from "./uml/keywords.js";
import { sequenceDiagramStateModule } from "./uml/sequence/sequenceDiagramState.js";
import { timeControlModule } from "./uml/sequence/timeControl.js";
import { actionModule } from "./uml/activity/action.js";
import { activityNodeModule } from "./uml/activity/activityNode.js";
import { connectorModule } from "./uml/activity/connector.js";
import { decisionAndMergeModule } from "./uml/activity/decisionAndMerge.js";
import { forkAndJoinModule } from "./uml/activity/forkAndJoin.js";
import { initialAndFinalModule } from "./uml/activity/initialAndFinal.js";
import { objectsModule } from "./uml/activity/objects.js";
import { pinsModule } from "./uml/activity/pins.js";
import { signalsModule } from "./uml/activity/signals.js";
import { artifactTitleModule } from "./uml/classifier/artifactTitle.js";
import { artifactModule } from "./uml/deployment/artifact.js";
import { deploymentSpecificationModule } from "./uml/deployment/deploymentSpecification.js";
import { nodeModule } from "./uml/deployment/node.js";
import { deploymentDiagramToolboxEditsModule } from "./uml/deploymentDiagramToolboxEdits.js";
import { extensionPointsModule } from "./uml/usecase/extensionPoints.js";
import { subjectModule } from "./uml/usecase/subject.js";
import { systemActorModule } from "./uml/usecase/systemActor.js";
import { useCaseModule } from "./uml/usecase/useCase.js";
import { useCaseDiagramToolboxEditsModule } from "./uml/useCaseDiagramToolboxEdits.js";

/**
 * All content modules
 */
export const contents: ContentModule[] = [
    actionModule,
    activityIndicatorModule,
    activityNodeModule,
    actorModule,
    artifactModule,
    artifactTitleModule,
    associationsModule,
    createParticipantMoule,
    classModule,
    classifierModule,
    commentModule,
    componentModule,
    componentTitleModule,
    compositionAndAggregationModule,
    connectorModule,
    contentModule,
    decisionAndMergeModule,
    defaultMarkersModule,
    defaultShapesModule,
    defaultStylesModule,
    defaultTitleModule,
    deploymentDiagramToolboxEditsModule,
    deploymentSpecificationModule,
    elementModule,
    entriesModule,
    enumModule,
    extendsAndImplementsModule,
    extensionPointsModule,
    forkAndJoinModule,
    importedParticipantsModule,
    initialAndFinalModule,
    instanceModule,
    interfaceModule,
    keywordsModule,
    lostFoundMessageModule,
    nodeModule,
    nonNavigableAssociationsModule,
    objectsModule,
    packageModule,
    participantModule,
    pinsModule,
    portsModule,
    propertiesAndMethodsModule,
    providesAndRequiresModule,
    readingDirectionModule,
    registerClassifierModule,
    sectionsModule,
    sequenceDiagramAssociationsModule,
    sequenceDiagramCreateConnectionOperatorModule,
    sequenceDiagramStateModule,
    signalsModule,
    subjectModule,
    systemActorModule,
    timeControlModule,
    useCaseDiagramToolboxEditsModule,
    useCaseModule,
    valuesModule
];

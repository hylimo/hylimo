import { InterpreterModule } from "@hylimo/core";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { associationsModule } from "./content/uml/associations.js";
import { packageModule } from "./content/uml/package.js";
import { commentModule } from "./content/uml/comment.js";
import { nonNavigableAssociationsModule } from "./content/uml/nonNavigableAssociations.js";
import { compositionAndAggregationModule } from "./content/uml/compositionAndAggregation.js";
import { extendsAndImplementsModule } from "./content/uml/extendsAndImplements.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { componentModule } from "./content/uml/component.js";
import { instanceModule } from "./content/uml/instance.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { nodeModule } from "./content/uml/deployment/node.js";
import { artifactModule } from "./content/uml/deployment/artifact.js";
import { deploymentSpecificationModule } from "./content/uml/deployment/deploymentSpecification.js";
import { deploymentDiagramToolboxEditsModule } from "./content/uml/deploymentDiagramToolboxEdits.js";

/**
 * Module for deployment diagrams
 */
export const deploymentDiagramModule = InterpreterModule.create(
    DiagramModuleNames.DEPLOYMENT_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("deploymentDiagram", "Creates a UML deployment diagram", [
        defaultStylesModule,
        associationsModule,
        nonNavigableAssociationsModule,
        compositionAndAggregationModule,
        extendsAndImplementsModule,
        elementModule,
        nodeModule,
        artifactModule,
        deploymentSpecificationModule,
        componentModule,
        instanceModule,
        packageModule,
        commentModule,
        readingDirectionModule,
        deploymentDiagramToolboxEditsModule
    ])
);

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
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { componentDiagramToolboxEditsModule } from "./content/uml/componentDiagramToolboxEdits.js";

/**
 * Module for component diagrams
 */
export const componentDiagramModule = InterpreterModule.create(
    DiagramModuleNames.COMPONENT_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule("componentDiagram", [
        defaultStylesModule,
        associationsModule,
        nonNavigableAssociationsModule,
        compositionAndAggregationModule,
        extendsAndImplementsModule,
        elementModule,
        componentModule,
        packageModule,
        commentModule,
        readingDirectionModule,
        componentDiagramToolboxEditsModule
    ])
);

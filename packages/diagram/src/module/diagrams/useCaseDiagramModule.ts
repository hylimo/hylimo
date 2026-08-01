import { InterpreterModule, str } from "@hylimo/core";
import { createDiagramModule } from "./generateDiagramModule.js";
import { elementModule } from "./content/common/element.js";
import { defaultStylesModule } from "./content/common/defaultStyles.js";
import { associationsModule } from "./content/uml/associations.js";
import { nonNavigableAssociationsModule } from "./content/uml/nonNavigableAssociations.js";
import { extendsAndImplementsModule } from "./content/uml/extendsAndImplements.js";
import { packageModule } from "./content/uml/package.js";
import { commentModule } from "./content/uml/comment.js";
import { readingDirectionModule } from "./content/uml/readingDirection.js";
import { actorModule } from "./content/uml/actor.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { useCaseModule } from "./content/uml/usecase/useCase.js";
import { subjectModule } from "./content/uml/usecase/subject.js";
import { systemActorModule } from "./content/uml/usecase/systemActor.js";
import { useCaseDiagramToolboxEditsModule } from "./content/uml/useCaseDiagramToolboxEdits.js";

/**
 * Module for use case diagrams
 *
 * The one thing this diagram type does not share with the others is how a connection is routed:
 * an association between an actor and a use case is drawn as a straight line, never as the
 * axis-aligned route the remaining diagram types default to, so `defaultLineType` is defaulted to
 * `line` here. It remains an ordinary config property, so a diagram may still set it back.
 */
export const useCaseDiagramModule = InterpreterModule.create(
    DiagramModuleNames.USE_CASE_DIAGRAM,
    [DiagramModuleNames.DIAGRAM, DiagramModuleNames.DSL],
    [],
    createDiagramModule(
        "useCaseDiagram",
        "Creates a UML use case diagram",
        [
            defaultStylesModule,
            associationsModule,
            nonNavigableAssociationsModule,
            extendsAndImplementsModule,
            elementModule,
            useCaseModule,
            subjectModule,
            actorModule,
            systemActorModule,
            packageModule,
            commentModule,
            readingDirectionModule,
            useCaseDiagramToolboxEditsModule
        ],
        { configDefaults: { defaultLineType: str("line") } }
    )
);

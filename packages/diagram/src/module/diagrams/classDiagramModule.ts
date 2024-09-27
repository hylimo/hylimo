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

/**
 * Module for class diagrams
 */
export const classDiagramModule = InterpreterModule.create(
    "class-diagram",
    ["diagram", "dsl"],
    [],
    createDiagramModule("classDiagram", [
        elementModule,
        defaultStylesModule,
        classModule,
        interfaceModule,
        enumModule,
        packageModule,
        commentModule,
        associationsModule,
        nonNavigableAssociationsModule,
        compositionAndAggregationModule,
        extendsAndImplementsModule,
        readingDirectionModule
    ])
);

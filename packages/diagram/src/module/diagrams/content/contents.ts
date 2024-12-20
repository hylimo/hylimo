import { InterpreterModule } from "@hylimo/core";
import { defaultMarkersModule } from "./common/defaultMarkers.js";
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

/**
 * All content modules
 */
export const contents: InterpreterModule[] = [
    defaultMarkersModule,
    defaultStylesModule,
    elementModule,
    associationsModule,
    classifierModule,
    componentTitleModule,
    contentModule,
    defaultTitleModule,
    entriesModule,
    portsModule,
    propertiesAndMethodsModule,
    providesAndRequiresModule,
    sectionsModule,
    classModule,
    commentModule,
    componentModule,
    compositionAndAggregationModule,
    enumModule,
    extendsAndImplementsModule,
    interfaceModule,
    nonNavigableAssociationsModule,
    packageModule,
    readingDirectionModule
];

import { diagramModule } from "./base/diagramModule.js";
import { dslModule } from "./base/dslModule.js";
import { editModule } from "./base/editModule.js";
import { baseDiagramModule } from "./diagrams/baseDiagramModule.js";
import { classDiagramModule } from "./diagrams/classDiagramModule.js";
import { componentDiagramModule } from "./diagrams/componentDiagramModule.js";
import { sequenceDiagramModule } from "./diagrams/sequenceDiagramModule.js";
import { umlDiagramModule } from "./diagrams/umlDiagramModule.js";

/**
 * Default diagram modules, including
 * - base diagram: diagram
 * - UML class diagram: classDiagram
 * - UML component diagram: componentDiagram
 * - (arbitrary) UML diagram: umlDiagram
 */
export const defaultDiagramModules = [
    diagramModule,
    dslModule,
    editModule,
    baseDiagramModule,
    classDiagramModule,
    componentDiagramModule,
    sequenceDiagramModule,
    umlDiagramModule
];

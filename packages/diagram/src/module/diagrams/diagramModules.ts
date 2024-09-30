import { diagramModule } from "../base/diagramModule.js";
import { dslModule } from "../base/dslModule.js";
import { editModule } from "../base/editModule.js";
import { baseDiagramModule } from "./baseDiagramModule.js";
import { classDiagramModule } from "./classDiagramModule.js";
import { componentDiagramModule } from "./componentDiagramModule.js";
import { umlDiagramModule } from "./umlDiagramModule.js";

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
    umlDiagramModule
];

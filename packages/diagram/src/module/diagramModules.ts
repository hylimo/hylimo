import type { InterpreterModule } from "@hylimo/core";
import { DiagramModule } from "./base/diagramModule.js";
import { dslModule } from "./base/dslModule.js";
import { editModule } from "./base/editModule.js";
import { activityDiagramModule } from "./diagrams/activityDiagramModule.js";
import { baseDiagramModule } from "./diagrams/baseDiagramModule.js";
import { classDiagramModule } from "./diagrams/classDiagramModule.js";
import { componentDiagramModule } from "./diagrams/componentDiagramModule.js";
import { deploymentDiagramModule } from "./diagrams/deploymentDiagramModule.js";
import { sequenceDiagramModule } from "./diagrams/sequenceDiagramModule.js";
import { umlDiagramModule } from "./diagrams/umlDiagramModule.js";
import type { LayoutEngine } from "../layout/engine/layoutEngine.js";

/**
 * Provides / creates the base diagram modules, including
 * - diagram
 * - dsl
 * - edit
 *
 * @param layoutEngine the layout engine to use for the diagram module
 * @returns the base diagram modules
 */
export function createBaseDiagramModules(layoutEngine: LayoutEngine): InterpreterModule[] {
    return [new DiagramModule(layoutEngine), dslModule, editModule];
}

/**
 * Default diagram modules, including
 * - base diagram: diagram
 * - UML class diagram: classDiagram
 * - UML component diagram: componentDiagram
 * - UML activity diagram: activityDiagram
 * - UML deployment diagram: deploymentDiagram
 * - (arbitrary) UML diagram: umlDiagram
 */
export const defaultDiagramModules = [
    baseDiagramModule,
    classDiagramModule,
    componentDiagramModule,
    sequenceDiagramModule,
    activityDiagramModule,
    deploymentDiagramModule,
    umlDiagramModule
];

import { createToolboxEditExpression } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing toolbox edits specific for UML deployment diagrams
 */
export const deploymentDiagramToolboxEditsModule = ContentModule.create(
    "uml/deploymentDiagramToolboxEdits",
    [],
    [],
    [
        createToolboxEditExpression(
            "Node/Device with deployed artifact",
            `
                device("Example") {
                    executionEnvironment("Example environment") {
                        artifact("example.jar")
                    }
                }
            `
        ),
        createToolboxEditExpression(
            "Node/Node with deployed component",
            `
                node("Example") {
                    component("Examplecomponent")
                }
            `
        )
    ]
);

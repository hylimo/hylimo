import { createToolboxEditExpression } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing toolbox edits specific for UML class diagrams
 */
export const classDiagramToolboxEditsModule = ContentModule.create(
    "uml/classDiagramToolboxEdits",
    [],
    [],
    [
        createToolboxEditExpression(
            "Package/Package with class",
            `
                package("Example") {
                    class("ExampleClass")
                }
            `
        )
    ]
);

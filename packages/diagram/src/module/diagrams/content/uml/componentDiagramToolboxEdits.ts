import { InterpreterModule } from "@hylimo/core";
import { createToolboxEdit } from "../../../base/dslModule.js";

/**
 * Module providing toolbox edits specific for UML component diagrams
 */
export const componentDiagramToolboxEditsModule = InterpreterModule.create(
    "uml/componentDiagramToolboxEdits",
    [],
    [],
    [
        createToolboxEdit(
            "Package/Package with component",
            `
                package("Example") {
                    component("Examplecomponent")
                }
            `
        )
    ]
);

import { createToolboxEdit } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing toolbox edits specific for UML component diagrams
 */
export const componentDiagramToolboxEditsModule = ContentModule.create(
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

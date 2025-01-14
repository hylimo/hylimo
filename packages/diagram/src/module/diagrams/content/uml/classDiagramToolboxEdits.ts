import { InterpreterModule } from "@hylimo/core";
import { createToolboxEdit } from "../../../base/dslModule.js";

/**
 * Module providing toolbox edits specific for UML class diagrams
 */
export const classDiagramToolboxEditsModule = InterpreterModule.create(
    "uml/classDiagramToolboxEdits",
    [],
    [],
    [
        createToolboxEdit(
            "Package/Package with class",
            `
                package("Example") {
                    class("ExampleClass")
                }
            `
        )
    ]
);

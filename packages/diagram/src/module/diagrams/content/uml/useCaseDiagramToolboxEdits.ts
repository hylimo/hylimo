import { createToolboxEditExpression } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing toolbox edits specific for UML use case diagrams
 */
export const useCaseDiagramToolboxEditsModule = ContentModule.create(
    "uml/useCaseDiagramToolboxEdits",
    [],
    [],
    [
        createToolboxEditExpression(
            "Subject/Subject with use cases",
            `
                subject("Example") {
                    useCase("Example use case")

                    useCase("Another use case") layout {
                        pos = apos(0, 150)
                    }
                }
            `
        )
    ]
);

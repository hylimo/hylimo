import { ContentModule } from "../../contentModule.js";

/**
 * Module importing participants from other modules
 */
export const importedParticipantsModule = ContentModule.create(
    "uml/sequence/importedParticipants",
    ["uml/component", "uml/instance", "uml/actor", "uml/sequence/participant"],
    [],
    [
        `
            scope.styles {
                cls("instance-element") {
                    minWidth = 50
                }

                cls("component-element") {
                    minWidth = 50
                }
            }
        `
    ]
);

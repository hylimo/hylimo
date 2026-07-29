import { bool, booleanType } from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";

/**
 * Path to the artifact icon: a sheet of paper with a folded upper right corner
 */
const artifactIconPath = "M 0 0 L 12 0 L 20 8 L 20 25 L 0 25 Z M 12 0 L 12 8 L 20 8";

/**
 * Module providing the artifact title content handler.
 *
 * UML gives an artifact two interchangeable notations, the «artifact» keyword and the icon in the
 * upper right corner, and permits both at once. Only the icon is handled here, the keyword is an
 * ordinary keyword contributed by the artifact element itself.
 */
export const artifactTitleModule = ContentModule.create(
    "uml/classifier/artifactTitle",
    ["uml/classifier/defaultTitle"],
    [],
    `
        scope.internal.artifactTitleContentHandler = [
            { },
            {
                providedArgs = args.args
                args.contents += if(scope.internal.config.showArtifactIcon) {
                    container(
                        contents = list(
                            scope.internal.defaultTitle(providedArgs.title, providedArgs.keywords, providedArgs.abstract),
                            path(path = "${artifactIconPath}", class = list("artifact-icon"))
                        ),
                        class = list("artifact-title-container")
                    )
                } {
                    scope.internal.defaultTitle(providedArgs.title, providedArgs.keywords, providedArgs.abstract)
                }
            }
        ]

        scope.styles {
            cls("artifact-title-container") {
                vars {
                    artifactIconSize = 20
                }
                cls("title-container") {
                    marginLeft = var("artifactIconSize")
                    marginRight = var("artifactIconSize")
                }
                cls("artifact-icon") {
                    width = var("artifactIconSize")
                    hAlign = "right"
                    stretch = "uniform"
                    strokeWidth = 1
                }
            }
        }
    `,
    [["showArtifactIcon", "Whether to show the artifact symbol", booleanType, bool(true)]]
);

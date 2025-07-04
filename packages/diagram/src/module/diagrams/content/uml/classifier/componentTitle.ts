import { ContentModule } from "../../contentModule.js";

/**
 * Path to the component icon
 */
const componentIconPath =
    "M 4 0 L 20 0 L 20 20 L 4 20 L 4 16 L 0 16 L 0 12 L 4 12 L 4 8 L 0 8 L 0 4 L 4 4 Z M 4 4 L 8 4 L 8 8 L 4 8 M 4 12 L 8 12 L 8 16 L 4 16";

/**
 * Module providing the component title content handler
 */
export const componentTitleModule = ContentModule.create(
    "uml/classifier/componentTitle",
    ["uml/classifier/defaultTitle"],
    [],
    `
        scope.internal.componentTitleContentHandler = [
            { },
            {
                args.contents += container(
                    contents = list(
                        scope.internal.defaultTitle(args.args.title, args.args.keywords, args.args.abstract),
                        path(path = "${componentIconPath}", class = list("component-icon"))
                    ),
                    class = list("component-title-container")
                )
            }  
        ]

        scope.styles {
            cls("component-title-container") {
                vars {
                    componentIconSize = 25
                }
                cls("title-container") {
                    marginLeft = var("componentIconSize")
                    marginRight = var("componentIconSize")
                }
                cls("component-icon") {
                    width = var("componentIconSize")
                    hAlign = "right"
                    stretch = "uniform"
                    strokeWidth = 1
                }
            }
        }
    `
);

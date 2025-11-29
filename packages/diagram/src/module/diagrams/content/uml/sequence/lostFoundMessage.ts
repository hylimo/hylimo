import { fun, id, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Lost and found message are synonyms, so should use the same function.<br>
 * However, we cannot assign it within the expressions to not pollute the global namespace.
 *
 * @param type the type of message to use as class name for the generated element
 * @return the syncscript function string for the given message type
 */
function message(type: string): string {
    return `
        diameter = scope.internal.config.externalMessageDiameter
        dot = canvasElement(
            contents = list(ellipse(class = list("${type}-message"))),
            width = diameter,
            height = diameter,
            class = list("${type}-message-element")
        )

        // We need to change the properties of the canvasElement directly and return it as a connection requires a point or element as parameter
        dot.distance = args.distance
        dot.externalMessageType = "${type}"
        scope.internal.registerCanvasElement(dot, args, args.self)
        dot
    `;
}

/**
 * Module providing the UML 'lostMessage' and 'foundMessage' functions
 * - they are bottom aligned
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const lostFoundMessageModule = ContentModule.create(
    "uml/sequence/lostFound",
    ["uml/sequence/defaultValues"],
    [],
    [
        `
            scope.styles {
                cls("found-message") {
                    fill = var("primary")
                    stroke = unset
                }
                cls("lost-message") {
                    fill = var("primary")
                    stroke = unset
                }
                cls("found-message-element") {
                    vAlign = "center"
                    hAlign = "center"
                }
                cls("lost-message-element") {
                    vAlign = "center"
                    hAlign = "center"
                }
            }
        `,
        id(SCOPE).assignField(
            "lostMessage",
            fun(message("lost"), {
                docs: "Creates a lost message. A lost message is one you sent to an external participant not included within the diagram",
                params: [
                    [
                        "distance",
                        "the optional distance of the message on the x axis. Defaults to 'externalMessageMargin'",
                        optional(numberType)
                    ]
                ],
                snippet: `($1) -- $2`,
                returns: "The created lost message to be used with a message operator"
            })
        ),
        id(SCOPE).assignField(
            "foundMessage",
            fun(message("found"), {
                docs: "Creates a found message. A found message is one you received from an external participant not included within the diagram",
                params: [
                    [
                        "distance",
                        "the optional distance of the message on the x axis. Defaults to 'externalMessageMargin'",
                        optional(numberType)
                    ]
                ],
                snippet: `($1)`,
                returns: "The created found message to be used with a message operator"
            })
        )
    ]
);

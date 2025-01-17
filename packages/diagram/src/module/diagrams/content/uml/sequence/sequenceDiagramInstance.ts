import { fun, functionType, id, InterpreterModule, optional, or, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { instanceToolboxEdits } from "../instance.js";

/**
 * Module providing the UML 'instance' function for sequence diagrams - they differ from normal instances in that
 * - they are bottom aligned
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const sequenceDiagramInstanceModule = InterpreterModule.create(
    "uml/sequence/instance",
    ["uml/sequence/defaultValues", "uml/instance", "uml/sequence/participant"],
    [],
    [
        id(SCOPE).assignField(
            "instance",
            fun(
                `
                    (name, class, callback) = args
                    title = name
                    if(class != null) {
                        if(class.proto == "".proto) {
                            title = name + ":" + class
                        } {
                            if(callback != null) {
                                error("Both the class name and body of instance '\${name}' are set to functions which is not allowed. Either provide a class name string as second argument, or pass at most two arguments")
                            }
                            callback = class // shift $1 -> $2 when necessary, both the class name and the callback function are optional
                        }
                    }
                    this.instance = scope.internal.createInstance(name, callback, title = title, keywords = args.keywords, args = args)
                    scope.internal.createSequenceDiagramParticipant(name, this.instance, below = args.below)
                `,
                {
                    docs: "Creates an instance. An instance is like a class, except it can optionally have an instance name",
                    params: [
                        [
                            0,
                            "the optional name of the instance. If the next argument is missing, this argument will be treated as the class name",
                            stringType
                        ],
                        [1, "the class name of this instance", optional(or(stringType, functionType))],
                        [2, "the callback function of this instance", optional(functionType)],
                        [
                            "below",
                            "the optional participant below which the instance should be placed. If set, this instance will have the same x coordinate as the given value and the y coordinate of the current event",
                            optional(participantType)
                        ]
                    ],
                    snippet: `("$1"$2)`,
                    returns: "The created instance"
                }
            )
        ),
        `
            scope.styles {
                cls("instance-element") {
                    minWidth = 50
                }
            }
        `,
        ...instanceToolboxEdits(false)
    ]
);

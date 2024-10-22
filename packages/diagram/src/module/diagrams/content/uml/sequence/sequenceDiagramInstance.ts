import { fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Module providing the UML 'instance' function for sequence diagrams - they differ from normal instances in that
 * - they are bottom aligned
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const sequenceDiagramInstanceModule = InterpreterModule.create(
    "uml/sequenceDiagramInstance",
    ["uml/sequence/defaultValues", "uml/instance", "uml/associations"],
    [],
    [
        id(SCOPE).assignField(
            "instance",
            fun(
                `
                    (name, class, callback) = args
                    title = name
                    if(class != null) {
                        title = name + ":" + class
                    }
                    
                    this.instance = scope.internal.createInstance(name, callback, title = title, keywords = args.keywords, args = args)
                    
                    this.instance.pos = if(scope.internal.lastSequenceDiagramElement != null) {
                        scope.rpos(scope.internal.lastSequenceDiagramElement, scope.instanceDistance, 0)
                    } {
                        scope.apos(0, 0) // so that we don't get NPEs for the event layouting
                    }
                    this.instance.name = name
                    
                    //  Create the line of this instance now so that it will always be rendered behind everything else
                    this.bottomcenter = scope.lpos(this.instance, 0.25)
                    this.instance.line = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.margin))
                    this.instance.events = list() // Needed for the autolayouting of events

                    
                    scope.internal.sequenceDiagramElements += this.instance
                    scope.internal.lastSequenceDiagramElement = this.instance
                `,
                {
                    docs: "Creates an instance. An instance is like a class, except it can optionally have an instance name",
                    params: [
                        [
                            0,
                            "the optional name of the instance. If the next argument is missing, this argument will be treated as the class name",
                            stringType
                        ],
                        [1, "the class name of this instance", optional(stringType)],
                        [2, "the callback function of this instance", optional(functionType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1")`,
                    returns: "The created instance"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    cls("instance-element") {
                        vAlign = "bottom"
                        minWidth = 50
                    }
                }
            `
        )
    ]
);
import { fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Module providing the UML 'instance' function for sequence diagrams - they differ from normal instances in that
 * - they are bottom aligned
 * - they store the line pointing down
 */
export const sequenceDiagramInstanceModule = InterpreterModule.create(
    "uml/sequenceDiagramInstance",
    ["uml/instance"],
    ["uml/sequence/margin", "uml/associations"],
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
                    
                    this.instance = _instance(name, callback, title = title, keywords = args.keywords, args = args)
         //           println(this.instance)
                    this.bottomcenter = scope.lpos(this.instance, 0.25)
       //             println(this.bottomcenter)
                    this.instance.line = bottomcenter .. scope.rpos(bottomcenter, 0, scope.margin)
         //           println(this.instance.line)
                `,
                {
                    docs: "Creates an instance.",
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
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    cls("instance-element") {
                        vAlign = "bottom"
                    }
                }
            `
        )
    ]
);

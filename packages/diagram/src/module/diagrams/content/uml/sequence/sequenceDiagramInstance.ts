import {
    booleanType,
    fun,
    functionType,
    id,
    InterpreterModule,
    listType,
    optional,
    parse,
    stringType
} from "@hylimo/core";
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
        ...parse(`
          // TODO: Define exactly how the stickman should be rendered - we probably want to render an SVG, selfregister the users name, and put the full title below the SVG, either as an rpos, or inside the SVG itself
          _stickman = scope.internal
        `),
        id(SCOPE).assignField(
            "instance",
            fun(
                `
                    (name, class, callback) = args
                    title = name
                    if(class != null) {
                        title = name + ":" + class
                    }
                    
                    if(args.user != null && x) {
                      this.instance = _stickman(name, title = title, args = args)
                    } {
                      this.instance = _instance(name, callback, title = title, keywords = args.keywords, args = args)
                    }
         //           println(this.instance)
                    this.bottomcenter = scope.lpos(this.instance, 0.25)
       //             println(this.bottomcenter)
                    this.instance.line = bottomcenter .. scope.rpos(bottomcenter, 0, scope.margin)
         //           println(this.instance.line)
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
                        [
                            "user",
                            "whether this instance is a human. If true, the default appearance is changed from a box to a stickman",
                            optional(booleanType)
                        ],
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
                    }
                }
            `
        )
    ]
);

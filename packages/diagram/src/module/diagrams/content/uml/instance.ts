import type { ParseableExpressions } from "@hylimo/core";
import { fun, functionType, id, listType, optional, or, stringType } from "@hylimo/core";
import { createToolboxEdit, SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing the UML 'instance' function for object/sequence diagrams
 */
export const instanceModule = ContentModule.create(
    "uml/instance",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/values",
        "uml/classifier/content"
    ],
    [],
    [
        `
            scope.internal.createInstance = scope.internal.createClassifier(
                "instance",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.valuesContentHandler,
                    scope.internal.contentContentHandler
                )
            )
        `,
        id(SCOPE).assignField(
            "instance",
            fun(
                `
                    (name, class, callback) = args
                    title = name
                    if(class != null) {
                        if(isString(class)) {
                            title = name + ":" + class
                        } {
                            if(callback != null) {
                                error("Both the class name and body of instance '\${name}' are set to functions which is not allowed. Either provide a class name string as second argument, or pass at most two arguments")
                            }
                            callback = class
                        }
                    }
                    scope.internal.createInstance(name, callback, title = title, keywords = args.keywords, args = args)
                `,
                {
                    docs: "Creates an instance.",
                    params: [
                        [0, "the name of the instance", stringType],
                        [1, "the optional class name of this instance", optional(or(stringType, functionType))],
                        [2, "the callback function of this instance", optional(functionType)],
                        ["keywords", "the keywords of the instance", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created instance"
                }
            )
        ),
        ...instanceToolboxEdits(true)
    ]
);

/**
 * Creates toolbox edits for the instance function
 *
 * @param enableDragging Whether dragging is enabled
 * @returns The toolbox edits
 */
export function instanceToolboxEdits(enableDragging: boolean): ParseableExpressions {
    return [
        createToolboxEdit("Instance/Instance", 'instance("Example")', enableDragging),
        createToolboxEdit("Instance/Instance with name", 'instance("example", "Example")', enableDragging),
        createToolboxEdit(
            "Instance/Instance with values",
            `
                instance("example", "Example") {
                    values {
                        hello = "World"
                        number = 42
                    }
                }
            `,
            enableDragging
        )
    ];
}

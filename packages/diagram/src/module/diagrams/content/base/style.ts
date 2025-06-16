import { fun, id } from "@hylimo/core";
import { ContentModule } from "../contentModule.js";
import { SCOPE } from "../../../base/dslModule.js";
import { allStyleAttributes } from "../../../base/diagramModule.js";

/**
 * Module providing style DSL constructs
 */
export const styleModule = ContentModule.create(
    "base/style",
    [],
    [],
    [
        id(SCOPE).assignField(
            "styles",
            fun(
                `
                    (first, second) = args
                    if(second != null) {
                        className = "canvas-content-" + scope.internal.classCounter
                        scope.internal.classCounter = scope.internal.classCounter + 1
                        if (first.class == null) {
                            first.class = list(className)
                        } {
                            first.class += className
                        }
                        resultingStyle = styles(
                            second,
                            [
                                selectorType = "class",
                                selectorValue = className,
                                styles = list(),
                                class = first.class,
                                variables = [],
                                ${allStyleAttributes.map((attr) => `${attr.name} = null`).join(",")}
                            ],
                            true
                        )
                        scope.internal.styles.styles.add(resultingStyle)
                        first
                    } {
                        resultStyles = styles(first, [styles = list()])
                        scope.internal.styles.styles.addAll(resultStyles.styles)
                    }
                `,
                {
                    docs: "Style function which can either be used globally with one parameter or applied as operator to some (graphical) element",
                    params: [
                        [0, "either the element or the callback which contains the style definition"],
                        [1, "if an element was provided for 0, the callback"]
                    ],
                    returns: "The provided object if or null if none was provided"
                }
            )
        )
    ]
);

import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing default styles
 */
export const defaultStylesModule = InterpreterModule.create(
    "common/defaultStyles",
    [],
    [],
    [
        ...parse(
            `
                scope.styles {
                    vars {
                        primary = config.primaryColor
                        background = config.backgroundColor
                        strokeWidth = 2
                        subcanvasMargin = 40
                    }
                    type("span") {
                        fill = var("primary")
                        fontSize = 16
                    }
                    type("canvasConnection") {
                        stroke = var("primary")
                        strokeWidth = var("strokeWidth")
                    }
                    type("rect") {
                        stroke = var("primary")
                        strokeWidth = var("strokeWidth")
                    }
                    type("ellipse") {
                        stroke = var("primary")
                        strokeWidth = var("strokeWidth")
                    }
                    type("path") {
                        stroke = var("primary")
                        strokeWidth = var("strokeWidth")
                    }
                    cls("label-element") {
                        hAlign = "center"
                    }
                    cls("dashed-connection") {
                        strokeDash = 10
                    }
                }
            `
        )
    ]
);

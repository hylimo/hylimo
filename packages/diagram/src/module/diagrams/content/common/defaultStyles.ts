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
                        primary = if((config ?? object()).theme == "dark") {
                            "#ffffff"
                        } {
                            "#000000"
                        }
                        strokeWidth = 2
                    }
                    type("span") {
                        fill = var("primary")
                        fontSize = 16
                    }
                    type("canvasConnection") {
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
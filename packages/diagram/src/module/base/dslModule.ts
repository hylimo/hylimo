import type { ExecutableExpression } from "@hylimo/core";
import { assign, fun, functionType, id, InterpreterModule, objectType, optional, str } from "@hylimo/core";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import dedent from "dedent";
import { LayoutEngine } from "../../layout/engine/layoutEngine.js";

/**
 * Identifier for the scope variable
 */
export const SCOPE = "scope";

/**
 * An jsonata expression which assigns the prediction class to an element if the prediction is true
 */
export const PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION = `(prediction ? ' styles { class += "${LayoutEngine.PREDICTION_CLASS}" }' : '')`;

/**
 * Creates a toolbox edit based on the provided createElementCode.
 * Depending on the `enableDragging` parameter, it will add a layout function to the edit.
 *
 * @param createElementCode the code which creates the element, expected to return a CanvasElement, i.e. `class("Example")`. Dedented, NOT escaped
 * @param enableDragging whether the element should be draggable
 * @returns the text for the toolbox edit
 */
export function createToolboxEdit(createElementCode: string, enableDragging: boolean = true): string {
    let modifiedEdit = `'\n${dedent(createElementCode)}'`;
    if (enableDragging) {
        modifiedEdit += "& ' layout {\n    pos = apos(' & x & ', ' & y & ')\n}'";
    }
    modifiedEdit += `& ${PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION}`;
    return modifiedEdit;
}

/**
 * Creates a toolbox edit which is registered in `scope.internal.canvasAddEdits`
 *
 * @param edit the name of the edit, implicitly prefixed with `toolbox/`. To be added correctly to the toolbox, follow the format `Group/Name`, so i.e. `Class/Class with nested class`.
 * @param createElementCode the code which creates the element, expected to return a CanvasElement, i.e. `class("Example")`. Dedented, NOT escaped
 * @param enableDragging whether the element should be draggable
 * @returns the executable expression which creates the toolbox edit
 */
export function createToolboxEditExpression(
    edit: string,
    createElementCode: string,
    enableDragging: boolean = true
): ExecutableExpression {
    const modifiedEdit = createToolboxEdit(createElementCode, enableDragging);
    return id(SCOPE).field("internal").field("canvasAddEdits").assignField(`toolbox/${edit}`, str(modifiedEdit));
}

/**
 * Module which provides common DSL functionality
 */
export const dslModule = InterpreterModule.create(
    DiagramModuleNames.DSL,
    [],
    [DiagramModuleNames.DIAGRAM],
    [
        assign(
            "generateDiagram",
            fun(
                `
                    (scopeEnhancer, config, defaultConfig) = args
                    config.proto = defaultConfig
                    this.callback = config[0]
                    this.scope = [
                        fonts = list(defaultFonts.roboto, defaultFonts.openSans, defaultFonts.sourceCodePro),
                        contents = list(),
                        internal = [
                            classCounter = 0,
                            styles = [styles = list()],
                            canvasAddEdits = [],
                            config = config,
                            callback = callback
                        ]
                    ]

                    scopeEnhancer(scope)
                    callback.callWithScope(scope)
                    this.canvasEdits = []
                    scope.internal.canvasAddEdits.forEach {
                        (value, key) = args
                        if(key != "proto") {
                            canvasEdits[key] = createAddEdit(callback, value)
                        } 
                    }
                    scope.internal.registerCanvasContentEditExpressions()
                    diagramCanvas = canvas(contents = scope.contents, edits = canvasEdits)
                    createDiagram(diagramCanvas, scope.internal.styles, scope.fonts)
                `,
                {
                    docs: `
                        Creates a diagram.
                        Takes a scope enhancer, and the diagram config (including the callback).
                        First, a custom scope is created, which is enhanced with the scope enhancer.
                        Then the callback is called with this custom scope.
                        By default, in the custom scope exist
                            - styles: function to add more styles, can be called multiple times
                                      can also be used as operator after an element
                            - layout: function which takes a CanvasElement and applies pos, width and height to it
                            - contents: list of elements used as contents of the canvas
                            - pos: takes two positional parameters and creates a new absolutePoint
                            - fonts: list of fonts
                        Returns the created diagram
                    `,
                    params: [
                        [
                            0,
                            "the scope enhancer, a function which takes the scope and can modify it, optional",
                            optional(functionType)
                        ],
                        [1, "the configuration for the diagram, including the callback", objectType()],
                        [2, "the default configuration for the diagram", objectType()]
                    ],
                    returns: "The created diagram"
                }
            )
        )
    ]
);

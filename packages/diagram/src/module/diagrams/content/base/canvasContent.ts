import { CanvasConnection, CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { ContentModule } from "../contentModule.js";
import { fun, id } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing canvas content helper functions
 */
export const canvasContentModule = ContentModule.create(
    "base/canvasContent",
    [],
    [],
    [
        `
            scope.internal.canvasScopeCounter = 0

            scope.internal.createCanvasScope = {
                (parentCanvasScope) = args
                scope.internal.canvasScopeCounter = scope.internal.canvasScopeCounter + 1
                [
                    contents = list(),
                    parentCanvasScope = parentCanvasScope,
                    canvasScopeId = scope.internal.canvasScopeCounter,
                    canvasScopeDepth = parentCanvasScope.canvasScopeDepth + 1
                ]
            }

            scope.internal.canvasScopeAncestor = {
                (canvasScope, steps) = args
                this.current = canvasScope
                this.i = 0
                while { i < steps } {
                    current = current.parentCanvasScope
                    i = i + 1
                }
                current
            }

            scope.internal.resolveCanvasScope = {
                (currentScope, targets) = args
                this.result = currentScope
                targets.forEach {
                    this.other = it.canvasScope
                    this.depth = Math.min(result.canvasScopeDepth, other.canvasScopeDepth)
                    this.a = scope.internal.canvasScopeAncestor(result, result.canvasScopeDepth - depth)
                    this.b = scope.internal.canvasScopeAncestor(other, other.canvasScopeDepth - depth)
                    while { a.canvasScopeId != b.canvasScopeId } {
                        a = a.parentCanvasScope
                        b = b.parentCanvasScope
                    }
                    result = a
                }
                result
            }
        `,
        id(SCOPE)
            .field("internal")
            .assignField(
                "registerCanvasContent",
                fun(
                    `
                        (content, source, canvasScope) = args
                        canvasScope.contents += content
                        content.canvasScope = canvasScope
                        content.source = reflect(source)
                        content
                    `
                )
            ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "registerCanvasElement",
                fun(
                    `
                        (element, source, canvasScope) = args
                        scope.internal.registerCanvasContent(element, source, canvasScope)
    
                        this.moveEdit = createAppendScopeEdit(source, "layout", "'pos = apos(' & dx & ', ' & dy & ')'")
                        element.edits["${DefaultEditTypes.MOVE_X}"] = this.moveEdit
                        element.edits["${DefaultEditTypes.MOVE_Y}"] = this.moveEdit
                        element.edits["${DefaultEditTypes.ROTATE}"] = createAppendScopeEdit(source, "layout", "'rotation = ' & rotation")
                        this.resizeEdit = createAppendScopeEdit(
                            source,
                            "layout",
                            "( $w := $exists(width) ? 'width = ' & width : []; $h := $exists(height) ? 'height = ' & height : []; $join($append($w, $h), '\\n') )"
                        )
                        element.edits["${DefaultEditTypes.RESIZE_WIDTH}"] = this.resizeEdit
                        element.edits["${DefaultEditTypes.RESIZE_HEIGHT}"] = this.resizeEdit
                        element
                    `
                )
            ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "registerInDiagramScope",
                fun(
                    `
                        (name, value) = args
                        isNew = scope[name] == null
                        if(isNew) {
                            scope[name] = value
                        }
                        isNew
                    `,
                    {
                        docs: "Registers a value in the diagram scope if it is not already present",
                        params: [
                            [0, "the key under which the value should be registered"],
                            [1, "the value to register"]
                        ],
                        returns: "true if the value was newly registered, false if it was already present"
                    }
                )
            ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "registerCanvasContentEditExpressions",
                fun(
                    `
                        scope.forEach {
                            (value, key) = args
                            if ((value != null) && ((value.type == "${CanvasElement.TYPE}") || (value.type == "${CanvasConnection.TYPE}"))) {
                                value.editExpression = nameToExpression(key)
                            }
                        }
                    `,
                    {
                        docs: "Iterates over scope and assigns the edit expressions to all found canvas elements",
                        params: [],
                        returns: "null"
                    }
                )
            )
    ]
);

import { CanvasConnection, CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { ContentModule } from "../contentModule.js";
import type { BaseObject, InterpreterContext } from "@hylimo/core";
import { fun, id, isNull, jsFun } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Reads a numeric field of a canvas scope.
 * The field is resolved through the proto chain, so a block scope nested in a canvas scope
 * (e.g. the scope of a layout block) reads the values of the canvas scope it belongs to.
 *
 * @param canvasScope the canvas scope to read from
 * @param key the name of the field
 * @param context the interpreter context
 * @returns the value of the field
 */
function readNumber(canvasScope: BaseObject, key: string, context: InterpreterContext): number {
    return canvasScope.getFieldValue(key, context).toNative() as number;
}

/**
 * Walks the given number of steps up the canvas scope chain
 *
 * @param canvasScope the canvas scope to start at
 * @param steps the number of steps to walk up
 * @param context the interpreter context
 * @returns the reached ancestor canvas scope
 */
function canvasScopeAncestor(canvasScope: BaseObject, steps: number, context: InterpreterContext): BaseObject {
    let current = canvasScope;
    for (let i = 0; i < steps; i++) {
        current = current.getFieldValue("parentCanvasScope", context);
    }
    return current;
}

/**
 * Finds the nearest common ancestor-or-self of two canvas scopes.
 * Scopes are compared by their canvasScopeId rather than by identity, as a block scope nested
 * in a canvas scope stands in for that canvas scope.
 *
 * @param first the first canvas scope
 * @param second the second canvas scope
 * @param context the interpreter context
 * @returns the nearest common canvas scope
 */
function commonCanvasScope(first: BaseObject, second: BaseObject, context: InterpreterContext): BaseObject {
    const firstDepth = readNumber(first, "canvasScopeDepth", context);
    const secondDepth = readNumber(second, "canvasScopeDepth", context);
    const depth = Math.min(firstDepth, secondDepth);
    let a = canvasScopeAncestor(first, firstDepth - depth, context);
    let b = canvasScopeAncestor(second, secondDepth - depth, context);
    while (readNumber(a, "canvasScopeId", context) !== readNumber(b, "canvasScopeId", context)) {
        a = a.getFieldValue("parentCanvasScope", context);
        b = b.getFieldValue("parentCanvasScope", context);
    }
    return a;
}

/**
 * Module providing canvas content helper functions
 */
export const canvasContentModule = ContentModule.create(
    "base/canvasContent",
    [],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "createCanvasScope",
                jsFun(
                    (args, context) => {
                        const parentCanvasScope = args.getFieldValue(0, context);
                        const target = args.getFieldValue(1, context);
                        const canvasScope = isNull(target) ? context.newObject() : target;
                        const internal = context.getField(SCOPE).getFieldValue("internal", context);
                        const canvasScopeId = readNumber(internal, "canvasScopeCounter", context) + 1;
                        internal.setLocalField(
                            "canvasScopeCounter",
                            { value: context.newNumber(canvasScopeId), source: undefined },
                            context
                        );
                        const contents = context.getField("list").invoke([], context, undefined, undefined);
                        canvasScope.setLocalField("contents", contents, context);
                        canvasScope.setLocalField(
                            "parentCanvasScope",
                            { value: parentCanvasScope, source: undefined },
                            context
                        );
                        canvasScope.setLocalField(
                            "canvasScopeId",
                            { value: context.newNumber(canvasScopeId), source: undefined },
                            context
                        );
                        canvasScope.setLocalField(
                            "canvasScopeDepth",
                            {
                                value: context.newNumber(
                                    readNumber(parentCanvasScope, "canvasScopeDepth", context) + 1
                                ),
                                source: undefined
                            },
                            context
                        );
                        return canvasScope;
                    },
                    {
                        docs: `
                            Creates a canvas scope: the scope whose contents end up in a nested canvas.
                            Every scope that collects the contents of a nested canvas must be created with this,
                            so that points and connections can be placed in the nearest canvas which can hold them.
                        `,
                        params: [
                            [0, "the canvas scope the nested canvas is part of"],
                            [1, "optional existing scope to turn into a canvas scope, otherwise a new one is created"]
                        ],
                        returns: "The canvas scope"
                    }
                )
            ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "resolveCanvasScope",
                jsFun(
                    (args, context) => {
                        let result = args.getFieldValue(0, context);
                        const targets = args.getFieldValue(1, context);
                        const length = readNumber(targets, "length", context);
                        for (let i = 0; i < length; i++) {
                            const target = targets.getFieldValue(i, context);
                            result = commonCanvasScope(result, target.getFieldValue("canvasScope", context), context);
                        }
                        return result;
                    },
                    {
                        docs: `
                            Finds the nearest canvas scope which can hold content referencing all targets:
                            the nearest common ancestor-or-self of the current canvas scope and the canvas scopes of the targets.
                        `,
                        params: [
                            [0, "the canvas scope the content is written in"],
                            [1, "list of the referenced canvas contents"]
                        ],
                        returns: "The canvas scope to register the content in"
                    }
                )
            ),
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

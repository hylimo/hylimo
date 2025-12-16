import { assign, fun, functionType, id, jsFun, finiteNumberType, optional, validateObject } from "@hylimo/core";
import { ContentModule } from "../contentModule.js";
import { canvasPointType, elementType } from "../../../base/types.js";
import { SCOPE } from "../../../base/dslModule.js";
import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Types for all layout scope properties
 */
const layoutScopeProperties = [
    {
        name: "width",
        type: optional(finiteNumberType)
    },
    {
        name: "height",
        type: optional(finiteNumberType)
    },
    {
        name: "pos",
        type: optional(canvasPointType)
    },
    {
        name: "rotation",
        type: optional(finiteNumberType)
    }
];

/**
 * Module providing the layout operator to apply to canvas elements
 */
export const layoutModule = ContentModule.create(
    "base/layout",
    [],
    [],
    [
        assign(
            "_validateLayoutScope",
            jsFun((args, context) => {
                const value = args.getFieldValue(0, context);
                validateObject(value, context, layoutScopeProperties);
                return context.null;
            })
        ),
        id(SCOPE).assignField(
            "layout",
            fun(
                `
                    (self, callback) = args
                    result = [pos = null, width = null, height = null, rotation = null]
                    callback.callWithScope(result)
                    _validateLayoutScope(result, args)
                    if(result.pos != null) {
                        self.pos = result.pos
                    } {
                        this.moveEdit = createAddEdit(callback, "'pos = apos(' & dx & ', ' & dy & ')'")
                        self.edits["${DefaultEditTypes.MOVE_X}"] = this.moveEdit
                        self.edits["${DefaultEditTypes.MOVE_Y}"] = this.moveEdit
                    }
                    if(result.width != null) {
                        self.width = result.width
                    } {
                        self.edits["${DefaultEditTypes.RESIZE_WIDTH}"] = createAddEdit(callback, "'width = ' & width")
                    }
                    if(result.height != null) {
                        self.height = result.height
                    } {
                        self.edits["${DefaultEditTypes.RESIZE_HEIGHT}"] = createAddEdit(callback, "'height = ' & height")
                    }
                    if(result.rotation != null) {
                        self.rotation = result.rotation
                    } {
                        self.edits["${DefaultEditTypes.ROTATE}"] = createAddEdit(callback, "'rotation = ' & rotation")
                    }
                    self
                `,
                {
                    docs: "Layout operator which can be applied to a CanvasElement",
                    params: [
                        [
                            0,
                            "the CanvasElement or CanvasConnection to apply the layout to",
                            elementType(CanvasElement.TYPE)
                        ],
                        [1, "callback which provides the layout definition", functionType]
                    ],
                    returns: "The provided element"
                }
            )
        )
    ]
);

import { finiteNumberType, fun, id, object, objectType, optional, or, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { LinePointLayoutConfig } from "../../../../../layout/elements/canvas/linePointLayoutConfig.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Type for the optional name label position
 * The first value is the x offset, the second the y offset,
 * both relative to the pin.
 */
const nameLabelPosType = optional(
    objectType(
        new Map([
            [0, optional(finiteNumberType)],
            [1, optional(finiteNumberType)]
        ])
    )
);

/**
 * Module providing the content handler which adds pins to an activity node.
 * In contrast to a port, a pin is placed completely outside of the outline of the node.
 */
export const pinsModule = ContentModule.create(
    "uml/activity/pins",
    ["common/defaultShapes"],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "pinsContentHandler",
                object([
                    {
                        value: fun([
                            `
                                this.callScope = args.callScope
                                this.canvasScope = args.canvasScope
                                this.element = args.element
                            `,
                            id("callScope").assignField(
                                "pin",
                                fun(
                                    `
                                        (pos, name) = args
                                        if(isString(pos)) {
                                            name = pos
                                            pos = null
                                        }
                                        this.pinArgs = args
                                        pinElement = canvasElement(
                                            class = list("pin-element"),
                                            contents = list(
                                                shape(shape = scope.defaultShapes.rect, class = list("pin"))
                                            ),
                                            pos = canvasScope.lpos(element, pos)
                                        )
                                        pinElement.pos.class = list("pin-pos")
                                        scope.internal.registerCanvasElement(pinElement, pinArgs, canvasScope)

                                        if(name != null) {
                                            if(isString(name)) {
                                                scope.internal.registerInDiagramScope(name, pinElement)
                                                name = list(span(text = name))
                                            }

                                            this.side = "center"
                                            this.numericPos = pos ?? 0
                                            if(isNumber(numericPos)) {
                                                if((numericPos > 0.375) && (numericPos < 0.625)) {
                                                    side = "left"
                                                } {
                                                    if((numericPos < 0.125) || (numericPos > 0.875)) {
                                                        side = "right"
                                                    }
                                                }
                                            }

                                            labelBasePos = canvasScope.lpos(element, pos)
                                            labelBasePos.class = list("pin-label-base-pos", "pin-label-base-pos-" + side)
                                            (xLabelOffset, yLabelOffset) = pinArgs.namePos ?? [null, null]
                                            nameLabelPos = canvasScope.rpos(labelBasePos, xLabelOffset, yLabelOffset)
                                            nameLabel = canvasElement(
                                                contents = list(text(contents = name, class = list("label"))),
                                                class = list("label-element", "pin-label-element", "pin-label-element-" + side),
                                                pos = nameLabelPos
                                            )
                                            scope.internal.registerCanvasContent(nameLabel, pinArgs, canvasScope)
                                        }

                                        pinElement
                                    `,
                                    {
                                        docs: "Creates a pin on the outline of the activity node",
                                        params: [
                                            [
                                                0,
                                                "Optional relative position on the outline, or the name if no position is given",
                                                optional(or(LinePointLayoutConfig.POS_TYPE, stringType))
                                            ],
                                            [
                                                1,
                                                "Optional name of the pin, rendered as a label next to it",
                                                optional(stringOrSpanListType)
                                            ],
                                            ["namePos", "X and Y offset for the name label", nameLabelPosType]
                                        ],
                                        snippet: `($1)`,
                                        returns: "The created pin element"
                                    }
                                )
                            ),
                            `
                                args.element.pin = callScope.pin
                            `
                        ])
                    },
                    {
                        value: fun(
                            `
                                this.nodeArgs = args.args
                                this.optionalCallback = nodeArgs.args[1]
                                this.element = args.element
                                if(optionalCallback == null) {
                                    element.edits["toolbox/Pin/Add pin"] = createAppendScopeEdit(
                                        nodeArgs.args,
                                        null,
                                        "'pin()'"
                                    )
                                } {
                                    element.edits["toolbox/Pin/Add pin"] = createAddEdit(
                                        optionalCallback,
                                        "'pin()'"
                                    )
                                }
                            `
                        )
                    }
                ])
            ),
        `
            scope.styles {
                vars {
                    pinSize = 20
                    pinLabelDistance = 8
                }
                cls("pin-element") {
                    vAlign = "center"
                    hAlign = "center"
                    width = var("pinSize")
                    height = var("pinSize")

                    cls("pin") {
                        fill = var("background")
                    }
                }
                cls("pin-pos") {
                    // the outline of a node is the outer edge of its stroke, so half a pin puts the
                    // pin's own outer edge exactly there - leaving both strokes side by side, a
                    // stroke width apart. Pulling in by one more stroke width lands the pin's inner
                    // border on the node's stroke centerline, where the two merge into a single line
                    distance = var("pinSize") / 2 - var("strokeWidth")
                }
                cls("pin-label-base-pos") {
                    distance = var("pinSize") - var("strokeWidth") + var("pinLabelDistance") + var("fontSize") * 0.65
                }
                cls("pin-label-base-pos-left") {
                    distance = var("pinSize") - var("strokeWidth") + var("pinLabelDistance")
                }
                cls("pin-label-base-pos-right") {
                    distance = var("pinSize") - var("strokeWidth") + var("pinLabelDistance")
                }
                cls("pin-label-element") {
                    vAlign = "center"
                }
                cls("pin-label-element-left") {
                    hAlign = "right"
                }
                cls("pin-label-element-right") {
                    hAlign = "left"
                }
            }
        `
    ]
);

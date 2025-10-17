import { fun, id, num, numberType, object, objectType, optional, or, stringType } from "@hylimo/core";
import { LinePointLayoutConfig } from "../../../../../layout/elements/canvas/linePointLayoutConfig.js";
import { SCOPE } from "../../../../base/dslModule.js";
import { canvasContentType } from "../../../../base/types.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Type for the optional name label position
 * The first value is the x offset, the second the y offset,
 * both relative to the connection end.
 */
const nameLabelPosType = optional(
    objectType(
        new Map([
            [0, optional(numberType)],
            [1, optional(numberType)]
        ])
    )
);

/**
 * Module providing helper function to create provided and required interfaces for a classifier
 */
export const providesAndRequiresModule = ContentModule.create(
    "uml/classifier/providesAndRequires",
    ["common/defaultMarkers"],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "providesRequiresContentHandler",
                object([
                    {
                        value: fun([
                            `
                                this.callScope = args.callScope
                                this.canvasScope = args.canvasScope
                                this.element = args.element
                                callScope.ports = list()
                            `,
                            id("callScope").assignField(
                                "provides",
                                fun(
                                    `
                                        (name, pos, target) = args
                                        if(!(isString(name))) {
                                            target = pos
                                            pos = name
                                            name = null
                                        }
                                        this.interfaceArgs = args
                                        if(target == null) {
                                            target = canvasScope.lpos(element, pos, interfaceArgs.dist)
                                            if(interfaceArgs.dist == null) {
                                                target._distance = scope.internal.config.providesDistance
                                            }
                                        } {
                                            target = canvasScope.rpos(target)
                                        }
                                        interfaceConnection = scope.internal.createConnection(
                                            canvasScope.lpos(element, pos),
                                            target,
                                            list("provided-interface-connection"),
                                            interfaceArgs,
                                            canvasScope,
                                            endMarkerFactory = {
                                                marker(
                                                    contents = list(
                                                        ellipse(class = list("provided-interface"))
                                                    ),
                                                    lineStart = 0,
                                                    refX = 0.5,
                                                    refY = 0.5
                                                )
                                            }
                                        )
                                        interfaceConnection.contents[0]._verticalPos = 1
                                        if(name != null) {
                                            scope.internal.registerInDiagramScope(name, interfaceConnection)
                                            (xLabelOffset, yLabelOffset) = interfaceArgs.namePos ?? [null, null]
                                            nameLabelPos = canvasScope.rpos(interfaceConnection, xLabelOffset, yLabelOffset)
                                            nameLabelPos.class = list("provided-interface-label-pos")
                                            nameLabel = canvasElement(
                                                contents = list(text(contents = list(span(text = name)), class = list("label"))),
                                                class = list("label-element"),
                                                pos = nameLabelPos
                                            )
                                            scope.internal.registerCanvasContent(nameLabel, interfaceArgs, canvasScope)
                                        }
                                        interfaceConnection
                                    `,
                                    {
                                        docs: "Creates a provided interface relative to the classifier",
                                        params: [
                                            [
                                                0,
                                                "Name of the provided interface (optional, can be omitted)",
                                                optional(or(stringType, LinePointLayoutConfig.POS_TYPE))
                                            ],
                                            [
                                                1,
                                                "Relative position on the outline",
                                                optional(or(LinePointLayoutConfig.POS_TYPE, canvasContentType))
                                            ],
                                            [
                                                2,
                                                "Target element for the provided interface",
                                                optional(canvasContentType)
                                            ],
                                            [
                                                "dist",
                                                "Distance of the provided interface to the classifier",
                                                optional(numberType)
                                            ],
                                            ["namePos", "X and Y offset for the name label", nameLabelPosType]
                                        ],
                                        returns: "The created provided interface"
                                    }
                                )
                            ),
                            id("callScope").assignField(
                                "requires",
                                fun(
                                    `
                                        (name, pos, target) = args
                                        if(!(isString(name))) {
                                            target = pos
                                            pos = name
                                            name = null
                                        }
                                        this.interfaceArgs = args
                                        if(target == null) {
                                            target = canvasScope.lpos(element, pos, interfaceArgs.dist)
                                            if(interfaceArgs.dist == null) {
                                                target._distance = scope.internal.config.requiresDistance
                                            }
                                        } {
                                            target = canvasScope.rpos(target)
                                        }
                                        interfaceConnection = scope.internal.createConnection(
                                            canvasScope.lpos(element, pos),
                                            target,
                                            list("required-interface-connection"),
                                            interfaceArgs,
                                            canvasScope,
                                            endMarkerFactory = {
                                                marker(
                                                    contents = list(
                                                        path(
                                                            path = "M 0 1 A 1 1 0 0 1 0 -1", 
                                                            class = list("required-interface")
                                                        )
                                                    ),
                                                    lineStart = 0
                                                )
                                            }
                                        )
                                        interfaceConnection.contents[0]._verticalPos = 1
                                        if(name != null) {
                                            scope.internal.registerInDiagramScope(name, interfaceConnection)
                                            (xLabelOffset, yLabelOffset) = interfaceArgs.namePos ?? [null, null]
                                            nameLabelPos = canvasScope.rpos(interfaceConnection, xLabelOffset, yLabelOffset)
                                            nameLabelPos.class = list("required-interface-label-pos")
                                            nameLabel = canvasElement(
                                                contents = list(text(contents = list(span(text = name)), class = list("label"))),
                                                class = list("label-element"),
                                                pos = nameLabelPos
                                            )
                                            scope.internal.registerCanvasContent(nameLabel, interfaceArgs, canvasScope)
                                        }
                                        interfaceConnection
                                    `,
                                    {
                                        docs: "Creates a required interface relative to the classifier",
                                        params: [
                                            [
                                                0,
                                                "Name of the required interface (optional, can be omitted)",
                                                optional(or(stringType, LinePointLayoutConfig.POS_TYPE))
                                            ],
                                            [
                                                1,
                                                "Relative position on the outline",
                                                optional(or(LinePointLayoutConfig.POS_TYPE, canvasContentType))
                                            ],
                                            [2, "Target element for the interface", optional(canvasContentType)],
                                            [
                                                "dist",
                                                "Distance of the required interface to the classifier",
                                                optional(numberType)
                                            ],
                                            ["namePos", "X and Y offset for the name label", nameLabelPosType]
                                        ],
                                        returns: "The created required interface"
                                    }
                                )
                            ),
                            `
                                args.element.provides = callScope.provides
                                args.element.requires = callScope.requires
                            `
                        ])
                    },
                    {
                        value: fun(
                            `
                                this.classifierArgs = args.args
                                this.optionalCallback = classifierArgs[1]
                                this.element = args.element
                                if(optionalCallback == null) {
                                    element.edits["toolbox/Interface/Add required interface"] = createAppendScopeEdit(
                                        classifierArgs.args,
                                        null,
                                        "'requires()'"
                                    )
                                    element.edits["toolbox/Interface/Add provided interface"] = createAppendScopeEdit(
                                        classifierArgs.args,
                                        null,
                                        "'provides()'"
                                    )
                                } {
                                    element.edits["toolbox/Interface/Add required interface"] = createAddEdit(
                                        optionalCallback,
                                        "'requires()'"
                                    )
                                    element.edits["toolbox/Interface/Add provided interface"] = createAddEdit(
                                        optionalCallback,
                                        "'provides()'"
                                    )
                                }
                            `
                        )
                    }
                ])
            ),
        `
            scope.dependsOn = {
                (start, end) = args
                canvasScope = args.self
                scope.internal.createConnection(
                    canvasScope.rpos(start),
                    canvasScope.rpos(end),
                    list("dashed-connection", "depends-on-connection"),
                    args,
                    canvasScope,
                    endMarkerFactory = scope.defaultMarkers.arrow
                )
            }

            scope.styles {
                vars {
                    requiredInterfaceSize = 45
                    providedInterfaceSize = 30
                }
                cls("provided-interface") {
                    width = var("providedInterfaceSize")
                    height = var("providedInterfaceSize")
                }
                cls("required-interface") {
                    width = var("requiredInterfaceSize")
                    height = var("requiredInterfaceSize")
                    stretch = "uniform"
                }
                cls("depends-on-connection") {
                    type("marker") {
                        type("path") {
                            marginRight = var("providedInterfaceSize")
                            hAlign = "right"
                        }
                        width = var("providedInterfaceSize")
                        lineStart = 0
                        refX = 0.5
                        refY = 0.5
                    }
                }
                cls("provided-interface-label-pos") {
                    offsetY = var("providedInterfaceSize") / 2
                }
                cls("required-interface-label-pos") {
                    offsetY = var("requiredInterfaceSize") / 2
                }
            }
        `
    ],
    [
        ["providesDistance", "Default distance of provided interfaces to the classifier outline", numberType, num(100)],
        ["requiresDistance", "Default distance of required interfaces to the classifier outline", numberType, num(100)]
    ]
);

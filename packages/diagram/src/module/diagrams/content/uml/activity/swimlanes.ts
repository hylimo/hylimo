import { fun, functionType, id, literal, optional, or, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing swimlanes, the activity partitions an activity diagram is divided into.
 *
 * A lane is a nested canvas, and the lane canvases join one canvas group, which is what gives them a shared flow
 * axis: a position means the same place in every lane, and a lane with less content still spans the whole diagram.
 * Lanes stack on the previous lane's outline, so a lane sizes to its content without any of the circularity a
 * shared coordinate system would otherwise introduce.
 *
 * Lanes do not nest. A partition divided into sub-partitions needs its sub-lanes to fill it exactly, and their own
 * headers spend flow space the lanes around the parent do not, so they always fall short of it by that much. That
 * needs a lane's size to be readable at layout time, which canvas groups do not provide.
 *
 * The separators between lanes are canvas connections rather than lane borders, which avoids drawing every interior
 * line twice. They are not registered in the diagram scope and carry no edits; a lane exposes the one after it as
 * `separator`, which is what a node straddling the border anchors to.
 */
export const swimlanesModule = ContentModule.create(
    "uml/activity/swimlanes",
    ["common/defaultShapes", "base/enum"],
    [],
    [
        `
            this.laneOrientations = [
                columns = [
                    syncAxis = [y = true],
                    stackAt = scope.Position.TopRight,
                    separatorStart = scope.Position.TopRight,
                    separatorEnd = scope.Position.BottomRight,
                    laneLayout = "vbox",
                    headerDirection = "horizontal",
                    dividerPath = "M 0 0 H 1",
                    dividerHAlign = null,
                    dividerVAlign = "bottom"
                ],
                rows = [
                    syncAxis = [x = true],
                    stackAt = scope.Position.BottomLeft,
                    separatorStart = scope.Position.BottomLeft,
                    separatorEnd = scope.Position.BottomRight,
                    laneLayout = "hbox",
                    headerDirection = "counterclockwise",
                    dividerPath = "M 0 0 V 1",
                    dividerHAlign = "right",
                    dividerVAlign = null
                ]
            ]

            this.createLaneFunction = {
                (canvasScope, orientation, groupCanvas) = args
                this.previousLane = null

                {
                    (name, laneCallback) = args
                    this.laneArgs = args
                    this.laneContentScope = scope.internal.createCanvasScope(canvasScope)
                    laneContentScope.lane = {
                        scope.error("Lanes cannot be nested")
                    }

                    this.laneCanvas = canvas(
                        contents = laneContentScope.contents,
                        class = list("lane-canvas"),
                        syncWith = [
                            canvas = groupCanvas,
                            x = orientation.syncAxis.x,
                            y = orientation.syncAxis.y
                        ]
                    )
                    this.headerDivider = path(
                        path = orientation.dividerPath,
                        class = list("lane-header-divider")
                    )
                    headerDivider.hAlign = orientation.dividerHAlign
                    headerDivider.vAlign = orientation.dividerVAlign
                    this.header = container(
                        contents = list(
                            container(
                                contents = list(
                                    text(
                                        contents = if(isString(name)) { list(span(text = name)) } { name },
                                        class = list("lane-header-text"),
                                        direction = orientation.headerDirection
                                    )
                                ),
                                class = list("lane-header-label")
                            ),
                            headerDivider
                        ),
                        class = list("lane-header")
                    )

                    this.laneElement = canvasElement(
                        contents = list(
                            container(
                                contents = list(header, laneCanvas),
                                class = list("lane-body"),
                                layout = orientation.laneLayout
                            )
                        ),
                        class = list("lane-element")
                    )

                    if(previousLane != null) {
                        laneElement.pos = canvasScope.lpos(previousLane, orientation.stackAt)
                    }
                    scope.internal.registerCanvasContent(laneElement, laneArgs, canvasScope)
                    if(isString(name)) {
                        scope.internal.registerInDiagramScope(name, laneElement)
                    }

                    if(previousLane != null) {
                        previousLane.separator = scope.internal.createConnection(
                            canvasScope.lpos(previousLane, orientation.separatorStart),
                            canvasScope.lpos(previousLane, orientation.separatorEnd),
                            list("lane-separator"),
                            null,
                            canvasScope,
                            lineType = "line"
                        )
                    }
                    previousLane = laneElement

                    if(laneCallback != null) {
                        laneCallback.callWithScope(laneContentScope)
                    }

                    laneElement
                }
            }
        `,
        id(SCOPE).assignField(
            "swimlanes",
            fun(
                `
                    (callback) = args
                    this.orientation = laneOrientations[args.orientation ?? scope.internal.config.swimlanesOrientation]
                    this.swimlanesScope = scope.internal.createCanvasScope(args.self)
                    this.swimlanesCanvas = canvas(
                        contents = swimlanesScope.contents,
                        class = list("swimlanes-canvas")
                    )
                    swimlanesScope.lane = createLaneFunction(swimlanesScope, orientation, swimlanesCanvas)

                    this.swimlanesElement = canvasElement(
                        contents = list(
                            shape(
                                shape = scope.defaultShapes.rect,
                                contents = list(swimlanesCanvas),
                                class = list("swimlanes-box")
                            )
                        ),
                        class = list("swimlanes-element")
                    )

                    callback.callWithScope(swimlanesScope)
                    scope.internal.registerCanvasElement(swimlanesElement, args, args.self)
                    swimlanesElement
                `,
                {
                    docs: `
                        Creates a set of swimlanes, the activity partitions an activity diagram is divided into.
                        Lanes are created inside the callback with the 'lane' function. Lanes cannot be nested.
                    `,
                    params: [
                        [0, "the function defining the lanes", functionType],
                        [
                            "orientation",
                            'whether lanes are "columns", with the flow running top to bottom, or "rows", with the flow running left to right. Defaults to the config',
                            optional(or(literal("columns"), literal("rows")))
                        ]
                    ],
                    snippet: ` {\n    lane("$1") {\n        $2\n    }\n}`,
                    returns: "The created swimlanes"
                }
            )
        ),
        `
            scope.styles {
                cls("swimlanes-element") {
                    hAlign = "left"
                    vAlign = "top"

                    cls("swimlanes-box") {
                        minWidth = 200
                        minHeight = 100
                    }
                }
                cls("lane-element") {
                    hAlign = "left"
                    vAlign = "top"

                    cls("lane-canvas") {
                        margin = var("subcanvasMargin")
                        minWidth = 80
                        minHeight = 60
                    }
                    cls("lane-header") {
                        cls("lane-header-label") {
                            margin = 6
                            hAlign = "center"
                            vAlign = "center"
                        }
                        cls("lane-header-divider") {
                            stroke = var("primary")
                        }
                    }
                    cls("lane-header-text") {
                        fontWeight = "bold"
                    }
                }
                cls("lane-separator") {
                    stroke = var("primary")
                }
            }
        `
    ],
    [
        [
            "swimlanesOrientation",
            'Whether lanes default to "rows", with the flow running left to right, or "columns", with the flow running top to bottom',
            or(literal("columns"), literal("rows")),
            str("rows")
        ]
    ]
);

import { ContentModule } from "../contentModule.js";

/**
 * Module providing the defaultMarkers object containing commonly used markers
 */
export const defaultMarkersModule = ContentModule.create(
    "common/defaultMarkers",
    [],
    [],
    `
        scope.defaultMarkers = [
            diamond = {
                marker(
                    contents = list(
                        path(
                            path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                            class = list("diamond-marker-path", "marker-path")
                        )
                    ),
                    class = list("diamond-marker", "marker")
                )
            },
            filledDiamond = {
                marker(
                    contents = list(
                        path(
                            path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                            class = list("filled-diamond-marker-path", "marker-path", "filled-marker-path")
                        )
                    ),
                    class = list("filled-diamond-marker", "marker")
                )
            },
            arrow = {
                marker(
                    contents = list(
                        path(
                            path = "M 0 0 L 10 6 L 0 12",
                            class = list("arrow-marker-path", "marker-path")
                        )
                    ),
                    class = list("arrow-marker", "marker")
                )
            },
            cross = {
                marker(
                    contents = list(
                        path(
                            path = "M 0 0 L 1 1 M 1 0 L 0 1",
                            class = list("cross-marker-path", "marker-path")
                        )
                    ),
                    class = list("cross-marker", "marker")
                )
            },
            triangle = {
                marker(
                    contents = list(
                        path(
                            path = "M 0 0 L 10 6 L 0 12 Z",
                            class = list("triangle-marker-path", "marker-path")
                        )
                    ),
                    class = list("triangle-marker", "marker")
                )
            },
            filledTriangle = {
                marker(
                    contents = list(
                        path(
                            path = "M 0 0 L 10 6 L 0 12 Z",
                            class = list("filled-triangle-marker-path", "marker-path", "filled-marker-path")
                        )
                    ),
                    class = list("filled-triangle-marker", "marker")
                )
            }
        ]

        scope.styles {
            type("canvasConnection") {
                cls("arrow-marker") {
                    lineStart = 1
                }
                cls("cross-marker") {
                    lineStart = 1
                }
                cls("marker-path") {
                    height = 17.5
                    width = 17.5
                }
                cls("diamond-marker-path") {
                    width = 28
                }
                cls("filled-diamond-marker-path") {
                    width = 28
                }
                cls("filled-marker-path") {
                    fill = var("primary")
                }
                cls("arrow-marker-path") {
                    strokeLineJoin = "bevel"
                }
                cls("cross-marker-path") {
                    marginRight = 5
                }
            }
        }
    `
);

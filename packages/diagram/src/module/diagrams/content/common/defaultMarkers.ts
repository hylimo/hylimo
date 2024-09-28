import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing the defaultMarkers object containing commonly used markers
 */
export const defaultMarkersModule = InterpreterModule.create(
    "common/defaultMarkers",
    [],
    [],
    [
        ...parse(
            `
                scope.defaultMarkers = object(
                    diamond = {
                        marker(
                            content = path(
                                path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                                class = list("diamond-marker-path", "marker-path")
                            ),
                            class=list("diamond-marker", "marker"),
                            lineStart = 1
                        )
                    },
                    filledDiamond = {
                        marker(
                            content = path(
                                path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                                class = list("filled-diamond-marker-path", "marker-path", "filled-marker-path")
                            ),
                            class=list("filled-diamond-marker", "marker"),
                            lineStart = 1
                        )
                    },
                    arrow = {
                        marker(
                            content = path(
                                path = "M 0 0 L 10 6 L 0 12",
                                class = list("arrow-marker-path", "marker-path")
                            ),
                            class=list("arrow-marker", "marker"),
                            lineStart = 0
                        )
                    },
                    cross = {
                        marker(
                            content = path(
                                path = "M 0 0 L 12 12 M 12 0 L 0 12",
                                class = list("cross-marker-path", "marker-path")
                            ),
                            class=list("cross-marker", "marker"),
                            lineStart = 0
                        )
                    },
                    triangle = {
                        marker(
                            content = path(
                                path = "M 0 0 L 10 6 L 0 12 Z",
                                class = list("triangle-marker-path", "marker-path")
                            ),
                            class=list("triangle-marker", "marker"),
                            lineStart = 1
                        )
                    }
                )

                scope.styles {
                    cls("marker") {
                        height = 17.5
                        width = 17.5
                    }
                    cls("diamond-marker") {
                        width = 28
                    }
                    cls("filled-diamond-marker") {
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
            `
        )
    ]
);

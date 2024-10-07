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
                            class=list("diamond-marker", "marker")
                        )
                    },
                    filledDiamond = {
                        marker(
                            content = path(
                                path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                                class = list("filled-diamond-marker-path", "marker-path", "filled-marker-path")
                            ),
                            class=list("filled-diamond-marker", "marker")
                        )
                    },
                    arrow = {
                        marker(
                            content = path(
                                path = "M 0 0 L 10 6 L 0 12",
                                class = list("arrow-marker-path", "marker-path")
                            ),
                            class=list("arrow-marker", "marker")
                        )
                    },
                    cross = {
                        marker(
                            content = path(
                                path = "M 0 0 L 1 1 M 1 0 L 0 1",
                                class = list("cross-marker-path", "marker-path")
                            ),
                            class=list("cross-marker", "marker")
                        )
                    },
                    triangle = {
                        marker(
                            content = path(
                                path = "M 0 0 L 10 6 L 0 12 Z",
                                class = list("triangle-marker-path", "marker-path")
                            ),
                            class=list("triangle-marker", "marker")
                        )
                    }
                )

                scope.styles {
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
            `
        )
    ]
);

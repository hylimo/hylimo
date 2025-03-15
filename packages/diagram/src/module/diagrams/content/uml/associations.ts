import { ContentModule } from "../contentModule.js";

/**
 * Module providing association operators
 */
export const associationsModule = ContentModule.create(
    "uml/associations",
    ["common/defaultMarkers"],
    [],
    `
        this.create = scope.internal.createConnectionOperator
        scope.-- = create("--")
        scope.--> = create(
            "-->",
            endMarkerFactory = scope.defaultMarkers.arrow
        )
        scope.<-- = create(
            "<--",
            startMarkerFactory = scope.defaultMarkers.arrow
        )
        scope.<--> = create(
            "<-->",
            startMarkerFactory = scope.defaultMarkers.arrow,
            endMarkerFactory = scope.defaultMarkers.arrow
        )
        scope[".."] = create(
            "..",
            class = list("dashed-connection")
        )
        scope["..>"] = create(
            "..>",
            endMarkerFactory = scope.defaultMarkers.arrow,
            class = list("dashed-connection")
        )
        scope["<.."] = create(
            "<..",
            startMarkerFactory = scope.defaultMarkers.arrow,
            class = list("dashed-connection")
        )
        scope["<..>"] = create(
            "<..>",
            startMarkerFactory = scope.defaultMarkers.arrow,
            endMarkerFactory = scope.defaultMarkers.arrow,
            class = list("dashed-connection")
        )
    `
);

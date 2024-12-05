import { InterpreterModule } from "@hylimo/core";

/**
 * Module providing association operators
 */
export const associationsModule = InterpreterModule.create(
    "uml/associations",
    ["common/defaultMarkers"],
    [],
    `
        this.create = scope.internal.createConnectionOperator
        scope.-- = create()
        scope.--> = create(
            endMarkerFactory = scope.defaultMarkers.arrow
        )
        scope.<-- = create(
            startMarkerFactory = scope.defaultMarkers.arrow
        )
        scope.<--> = create(
            startMarkerFactory = scope.defaultMarkers.arrow,
            endMarkerFactory = scope.defaultMarkers.arrow
        )
        scope.set("..", create(
            class = list("dashed-connection")
        ))
        scope.set("..>", create(
            endMarkerFactory = scope.defaultMarkers.arrow,
            class = list("dashed-connection")
        ))
        scope.set("<..", create(
            startMarkerFactory = scope.defaultMarkers.arrow,
            class = list("dashed-connection")
        ))
        scope.set("<..>", create(
            startMarkerFactory = scope.defaultMarkers.arrow,
            endMarkerFactory = scope.defaultMarkers.arrow,
            class = list("dashed-connection")
        ))
    `
);

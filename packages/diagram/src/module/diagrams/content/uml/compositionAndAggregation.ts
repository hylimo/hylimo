import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing composition and aggregation connections operators
 */
export const compositionAndAggregationModule = InterpreterModule.create(
    "uml/compositionAndAggregation",
    ["common/defaultMarkers"],
    [],
    [
        ...parse(
            `
                this.create = scope.internal.createConnectionOperator
                scope.<>-- = create(
                    startMarkerFactory = scope.defaultMarkers.diamond
                )
                scope.--<> = create(
                    endMarkerFactory = scope.defaultMarkers.diamond
                )
                scope.<>--> = create(
                    startMarkerFactory = scope.defaultMarkers.diamond,
                    endMarkerFactory = scope.defaultMarkers.arrow
                )
                scope.<--<> = create(
                    startMarkerFactory = scope.defaultMarkers.arrow,
                    endMarkerFactory = scope.defaultMarkers.diamond
                )
                scope.*-- = create(
                    startMarkerFactory = scope.defaultMarkers.filledDiamond
                )
                scope.--* = create(
                    endMarkerFactory = scope.defaultMarkers.filledDiamond
                )
                scope.*--> = create(
                    startMarkerFactory = scope.defaultMarkers.filledDiamond,
                    endMarkerFactory = scope.defaultMarkers.arrow
                )
                scope.<--* = create(
                    startMarkerFactory = scope.defaultMarkers.arrow,
                    endMarkerFactory = scope.defaultMarkers.filledDiamond
                )
            `
        )
    ]
);

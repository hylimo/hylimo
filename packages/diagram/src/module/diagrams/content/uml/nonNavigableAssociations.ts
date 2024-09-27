import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing associations without navigation operators
 */
export const nonNavigableAssociationsModule = InterpreterModule.create(
    "uml/nonNavigableConnections",
    ["common/defaultMarkers"],
    [],
    [
        ...parse(
            `
                this.create = scope.internal.createConnectionOperator
                scope.!-- = create(
                    startMarkerFactory = scope.defaultMarkers.cross
                )
                scope.--! = create(
                    endMarkerFactory = scope.defaultMarkers.cross
                )
                scope.!--! = create(
                    startMarkerFactory = scope.defaultMarkers.cross,
                    endMarkerFactory = scope.defaultMarkers.cross
                )
                scope.!--> = create(
                    startMarkerFactory = scope.defaultMarkers.cross,
                    endMarkerFactory = scope.defaultMarkers.arrow
                )
                scope.<--! = create(
                    startMarkerFactory = scope.defaultMarkers.arrow,
                    endMarkerFactory = scope.defaultMarkers.cross
                )
            `
        )
    ]
);
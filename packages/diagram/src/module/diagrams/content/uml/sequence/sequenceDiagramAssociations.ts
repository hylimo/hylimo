import { InterpreterModule } from "@hylimo/core";

/**
 * Module providing additional associations for sequence diagrams.<br>
 * - sync: -->>, <<--
 * - sync return: ..>>, <<..
 * - destruction: !.., ..!, !..!
 */
export const sequenceDiagramAssociationsModule = InterpreterModule.create(
    "uml/sequence/associations",
    ["common/defaultMarkers", "uml/sequence/createConnectionOperator"],
    [],
    [
        `
            this.create = scope.internal.createConnectionOperator

            // synchronous message
            scope.-->> = create(
                "-->>",
                endMarkerFactory = scope.defaultMarkers.filledTriangle
            )
            scope.<<-- = create(
                "<<--",
                startMarkerFactory = scope.defaultMarkers.filledTriangle,
            )

            // synchronous return message
            scope["..>>"] = create(
                "..>>",
                endMarkerFactory = scope.defaultMarkers.filledTriangle,
                class = list("dashed-connection")
            )
            scope["<<.."] = create(
                "<<..",
                startMarkerFactory = scope.defaultMarkers.filledTriangle,
                class = list("dashed-connection")
            )

            // destruction message
            scope["!.."] = create(
                "!..",
                startMarkerFactory = scope.defaultMarkers.cross,
                class = list("dashed-connection")
            )
            scope["..!"] = create(
                "..!",
                endMarkerFactory = scope.defaultMarkers.cross,
                class = list("dashed-connection")
            )
            scope["!..!"] = create(
                "!..!",
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.cross,
                class = list("dashed-connection")
            )
        `
    ]
);

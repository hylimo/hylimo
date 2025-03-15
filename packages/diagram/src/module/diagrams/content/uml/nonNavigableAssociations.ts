import { ContentModule } from "../contentModule.js";

/**
 * Module providing associations without navigation operators
 */
export const nonNavigableAssociationsModule = ContentModule.create(
    "uml/nonNavigableConnections",
    ["common/defaultMarkers"],
    [],
    `
        this.create = scope.internal.createConnectionOperator
        scope.!-- = create(
            "!--",
            startMarkerFactory = scope.defaultMarkers.cross
        )
        scope.--! = create(
            "--!",
            endMarkerFactory = scope.defaultMarkers.cross
        )
        scope.!--! = create(
            "!--!",
            startMarkerFactory = scope.defaultMarkers.cross,
            endMarkerFactory = scope.defaultMarkers.cross
        )
        scope.!--> = create(
            "!-->",
            startMarkerFactory = scope.defaultMarkers.cross,
            endMarkerFactory = scope.defaultMarkers.arrow
        )
        scope.<--! = create(
            "<--!",
            startMarkerFactory = scope.defaultMarkers.arrow,
            endMarkerFactory = scope.defaultMarkers.cross
        )
    `
);

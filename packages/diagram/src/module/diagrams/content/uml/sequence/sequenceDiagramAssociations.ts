import { InterpreterModule } from "@hylimo/core";

/**
 * Module providing association operators for sequence diagrams.<br>
 * They differ from normal associations in the following aspects:<br>
 * - they replace the target prior to drawing the line: For sequence diagrams, we only want to draw until the start/end of the corresponding activity indicator instead of its center which is the value the user supplies by giving the event
 * - when the event references the same instance, we must select the `right` instead of the `left` end as target to, (we do not want to change our x-coordinate)
 * - they support additional arrows (sync  (-->>), async (-->), reply (..>, ..>>))
 * - it must handle lost and found messages as we only know where to put it the moment the arrow is created
 */
export const sequenceDiagramAssociationsModule = InterpreterModule.create(
    "uml/sequence/associations",
    ["common/defaultMarkers"],
    [],
    [
        `
            this.create = {
                // Clone of scope.internal.createConnectionOperator that changes the start and end positions
                // Additionally, it positions lost and found messages where they belong

                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                class = args.class

                {
                    (startEvent, endEvent) = args

                    // If necessary, unwrap to the left/ right side of the most recent activity indicator - calculated through the given left/right functions
                    start = if(startEvent.right != null && (startEvent.right.proto == {}.proto)) {
                        startEvent.right()
                    } {
                        startEvent
                    } 

                    // For the end point, there's a specialty: If both events point at the same participant (self message, so same x coordinate), don't use the left point but the right one instead so that x is indeed the same
                    // Unfortunately, we can only validate this using name equivalency right now, so good luck in case of a name conflict
                    end = if(endEvent.left != null && (endEvent.left.proto == {}.proto)) {
                        if(endEvent.participantName == startEvent.participantName && ((endEvent.right != null) && (endEvent.right.proto == {}.proto))) {
                            endEvent.right()
                        } {
                            endEvent.left()
                        }
                    }{
                        endEvent
                    } 

                    // For lostMessage()/foundMessage(), we only calculate their position now, relative to the opposite side
                    if((startEvent.externalMessageType != null) && (endEvent.externalMessageType != null)) {
                        scope.error("Both left and right side of the relation calculate their position on the counterpart. Thus, no position can be calculated for \${startEvent.externalMessageType} message on the left and \${endEvent.externalMessageType} on the right")
                    } 
                    if((startEvent.externalMessageType != null) && (startEvent.distance != null)) {
                        startEvent.pos = scope.rpos(end, startEvent.distance * -1 /* Go left */, 0)
                    }
                    if((endEvent.externalMessageType != null) && (endEvent.distance != null)) {
                        endEvent.pos = scope.rpos(start, endEvent.distance, 0)
                    }

                    // Finally, the edge cases have been dealt with, do the normal thing
                    scope.internal.createConnection(
                        start,
                        end,
                        class,
                        args,
                        args.self,
                        startMarkerFactory = startMarkerFactory,
                        endMarkerFactory = endMarkerFactory
                    )
                }
            }
            scope.-- = create()

            // asynchronous message
            scope.--> = create(
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<-- = create(
                startMarkerFactory = scope.defaultMarkers.arrow
            )

            // synchronous message
            scope.-->> = create(
                endMarkerFactory = scope.defaultMarkers.filledTriangle
            )
            scope.<<-- = create(
                startMarkerFactory = scope.defaultMarkers.filledTriangle,
            )

            // asynchronous return message
            scope["..>"] = create(
                endMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            )
            scope["<.."] = create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            )

            // synchronous return message
            scope["..>>"] = create(
                endMarkerFactory = scope.defaultMarkers.filledTriangle,
                class = list("dashed-connection")
            )
            scope["<<.."] = create(
                startMarkerFactory = scope.defaultMarkers.filledTriangle,
                class = list("dashed-connection")
            )

            // destruction message
            scope["!--"] = create(
                startMarkerFactory = scope.defaultMarkers.cross
            )
            scope["--!"] = create(
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope["!--!"] = create(
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope["!.."] = create(
                startMarkerFactory = scope.defaultMarkers.cross,
                class = list("dashed-connection")
            )
            scope["..!"] = create(
                endMarkerFactory = scope.defaultMarkers.cross,
                class = list("dashed-connection")
            )
            scope["!..!"] = create(
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.cross,
                class = list("dashed-connection")
            )
        `
    ]
);

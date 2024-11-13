import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing association operators for sequence diagrams.<br>
 * They differ from normal associations in the following aspects:<br>
 * - they replace the target prior to drawing the line: For sequence diagrams, we only want to draw until the start/end of the corresponding activity indicator instead of its center which is the value the user supplies by giving the event
 * - when the event references the same instance, we must select the `right` instead of the `left` end as target to, (we do not want to change our x-coordinate)
 * - they support additional arrows (sync  (-->>), async (-->), reply (..>, ..>>))
 */
export const sequenceDiagramAssociationsModule = InterpreterModule.create(
    "uml/sequence/associations",
    ["common/defaultMarkers"],
    [],
    [
        ...parse(
            `
                this.create = {
                  // Clone of scope.internal.createConnectionOperator that changes the start and end positions
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
                          if(endEvent.participantName == startEvent.participantName && (endEvent.right != null && endEvent.right.proto == {}.proto)) {
                              endEvent.right()
                          } {
                              endEvent.left()
                          }
                      }{
                          endEvent
                      } 
                      
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
        )
    ]
);

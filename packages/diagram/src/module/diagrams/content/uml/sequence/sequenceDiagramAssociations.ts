import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing association operators for sequence diagrams.<br>
 * They differ from normal associations in that they replace the target prior to drawing the line:<br>
 * For sequence diagrams, we only want to draw until the start/end of the corresponding lifeline instead of its center,
 * which is the value the user supplies by giving the event
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
                      
                      start = if(startEvent.right == null) {
                          startEvent
                      } {
                          startEvent.right
                      } 
                      end = if(endEvent.left == null) {
                          endEvent
                      }{
                          endEvent.left
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

import { InterpreterModule } from "@hylimo/core";

/**
 * Module overwriting the default scope.internal.createConnectionOperator to support sequence diagram specific associations.<br>
 * They differ from normal associations in the following aspects:<br>
 * - they replace the target prior to drawing the line: For sequence diagrams, we only want to draw until the start/end of the corresponding activity indicator instead of its center which is the value the user supplies by giving the event
 * - they shift the connection around if necessary for the reason stated above: Otherwise, it can happen that a left component starts on the left instead of the intended right side
 * - when the event references the same instance, we must select the `right` instead of the `left` end as target to, (we do not want to change our x-coordinate)
 * - it must handle lost and found messages as we only know where to put it the moment the arrow is created
 */
export const sequenceDiagramCreateConnectionOperatorModule = InterpreterModule.create(
    "uml/sequence/createConnectionOperator",
    [],
    [],
    [
        `
            scope.internal.createConnectionOperator = {
                // Clone of scope.internal.createConnectionOperator that changes the start and end positions
                // Additionally, it positions lost and found messages where they belong

                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                class = args.class
                (operator) = args
                if(operator != null) {
                    scope.internal.createConnectionEdit(operator)
                }

                {
                    (a, b) = args
                    
                    // When we have 'instance(b); instance(a); a --> b', swap the connection to 'b --> a' internally as otherwise the line will start on the wrong side of the activity indicator (left for b, right for a), which looks unpleasant
                    // This case occurs the moment the user moves 'instruction(a);' from the original code 'instruction(a); instruction(b); a --> b' one line down, so can happen frequently
                    if((a.x != null) && (b.x != null) && (b.x < a.x)) { // <- must be '<', '<=' would be incorrect
                        c = b
                        b = a
                        a = c
                    }

                    // If necessary, unwrap to the left/ right side of the most recent activity indicator - calculated through the given left/right functions
                    start = if(a.right != null && (a.right.proto == {}.proto)) {
                        a.right()
                    } {
                        a
                    } 

                    // For the end point, there's a specialty: If both events point at the same participant (self message, so same x coordinate), don't use the left point but the right one instead so that x is indeed the same
                    // Additionally, in this case, we don't want to draw a straight line but an axis aligned one by default
                    lineType = "line"
                    end = if(b.left != null && (b.left.proto == {}.proto)) {
                        if((b.x == a.x) && (b.right != null) && (b.right.proto == {}.proto)) {
                            lineType = "axisAligned"
                            b.right()
                        } {
                            b.left()
                        }
                    } {
                        b
                    } 

                    // For lostMessage()/foundMessage(), we only calculate their position now, relative to the opposite side
                    if((a.externalMessageType != null) && (b.externalMessageType != null)) {
                        scope.error("Both left and right side of the relation calculate their position based on the counterpart. Thus, no position can be calculated for \${a.externalMessageType} message on the left and \${b.externalMessageType} on the right")
                    } 
                    if((a.externalMessageType != null) && (a.distance != null)) {
                        a.pos = scope.rpos(end, a.distance * -1 /* Go left */, 0)
                    }
                    if((b.externalMessageType != null) && (b.distance != null)) {
                        b.pos = scope.rpos(start, b.distance, 0)
                    }

                    // Finally, the edge cases have been dealt with, do the normal thing
                    scope.internal.createConnection(
                        start,
                        end,
                        class,
                        args,
                        args.self,
                        startMarkerFactory = startMarkerFactory,
                        endMarkerFactory = endMarkerFactory,
                        lineType = lineType
                    )
                }
            }
        `
    ]
);

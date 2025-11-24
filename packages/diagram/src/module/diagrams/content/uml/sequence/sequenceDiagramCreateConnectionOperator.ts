import { ContentModule } from "../../contentModule.js";

/**
 * Module overwriting the default scope.internal.createConnectionOperator to support sequence diagram specific associations.<br>
 * They differ from normal associations in the following aspects:<br>
 * - they replace the target prior to drawing the line: For sequence diagrams, we only want to draw until the start/end of the corresponding activity indicator instead of its center which is the value the user supplies
 * - they shift the connection around if necessary for the reason stated above: Otherwise, it can happen that a left component starts on the left instead of the intended right side
 * - when the position references the same instance, we must select the `right` instead of the `left` end as target to, (we do not want to change our x-coordinate)
 * - it must handle lost and found messages as we only know where to put it the moment the arrow is created
 */
export const sequenceDiagramCreateConnectionOperatorModule = ContentModule.create(
    "uml/sequence/createConnectionOperator",
    [],
    [],
    [
        `
            scope.internal.createConnectionOperator = {
                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                class = args.class
                (operator) = args
                if(operator != null) {
                    scope.internal.createConnectionEdit(operator)
                }

                {
                    (a, b) = args
                    
                    // When we have 'instance(b); instance(a); a --> b', swap the connection to 'b <-- a' internally as otherwise the line will start on the wrong side of the activity indicator (left for b, right for a), which looks unpleasant
                    // This case occurs the moment the user moves 'instruction(a);' from the original code 'instruction(a); instruction(b); a --> b' one line down, so can happen frequently
                    invertMessageDirection = (a.x != null) && (b.x != null) && (b.x < a.x) // <- must be '<', '<=' would be incorrect

                    // Check if both a and b are participants (not virtual participants)
                    // In this case, we need to update the position using connectionDistance
                    aIsParticipant = a.participantType == "participant"
                    bIsParticipant = b.participantType == "participant"
                    if (a.participantType != null) {
                        scope.internal.registerFrameInclusion(a, 0, 0)
                    }
                    if (b.participantType != null) {
                        scope.internal.registerFrameInclusion(b, 0, 0)
                    }
                    
                    if(aIsParticipant || bIsParticipant) {
                        position = scope.internal.calculatePosition(priority = 3)
                        scope.internal.updateSequenceDiagramPosition(position)
                    }

                    // If necessary, unwrap to the left/ right side of the most recent activity indicator - calculated through the given left/right functions
                    start = if(!(invertMessageDirection) && (a.participantType != null)) {
                        a.right()
                    } {
                        if(invertMessageDirection && (a.participantType != null)) {
                            a.left()
                        } {
                            a
                        }
                    } 

                    // For the end point, there's a specialty: If both events point at the same participant (self message, so same x coordinate), don't use the left point but the right one instead so that x is indeed the same
                    // Additionally, in this case, we don't want to draw a straight line but an axis aligned one by default
                    lineType = "line"
                    end = if((b.x == a.x) && (b.participantType != null)) {
                        lineType = "axisAligned"
                        b.right()
                    } {
                        if(!(invertMessageDirection) && (b.participantType != null)) {
                            b.left()
                        } {
                            if(invertMessageDirection && (b.participantType != null)) {
                                b.right()
                            } {
                                b
                            }
                        }
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

                    if(aIsParticipant || bIsParticipant) {
                        scope.internal.registerTargetPosition(scope.internal.config.connectionMargin, 2)
                        scope.internal.registerTargetPosition(scope.internal.config.strokeMargin, 1)
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

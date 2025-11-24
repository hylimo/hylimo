import { ContentModule } from "../../contentModule.js";

/**
 * Initializes the state management for sequence diagrams.
 */
export const sequenceDiagramStateModule = ContentModule.create(
    "uml/sequence/diagramState",
    ["uml/sequence/defaultValues"],
    [],
    `
        scope.internal.sequenceDiagramParticipants = list()
        scope.internal.lastSequenceDiagramParticipant = null
        scope.internal.currentSequenceDiagramPosition = 0
        scope.internal.activeFrames = list()
        scope.internal.targetPositions = list(null, null, null)
        
        scope.internal.registerFrameInclusion = {
            (participant, left, right) = args
            scope.internal.activeFrames.forEach {
                it.registerIncluded(participant, left, right)
            }
        }
        
        scope.internal.updateSequenceDiagramPosition = {
            (newPosition) = args
            previousPosition = scope.internal.currentSequenceDiagramPosition
            deltaY = newPosition - previousPosition
            scope.internal.currentSequenceDiagramPosition = newPosition
            
            scope.internal.sequenceDiagramParticipants.forEach {
                participant = it
                
                endpos = scope.rpos(participant.referencePos, 0, newPosition + (3 * scope.internal.config.lifelineExtensionMargin))
                participant.lifeline.contents.get(participant.lifeline.contents.length - 1).end = endpos
                
                participant.activeActivityIndicators.forEach {
                    it.height = it.height + deltaY
                }
            }
        }
        
        scope.internal.registerTargetPosition = {
            (position, priority) = args
            scope.internal.targetPositions.set(priority, position + scope.internal.currentSequenceDiagramPosition)
        }
        
        scope.internal.calculatePosition = {
            at = args.at
            after = args.after
            priority = args.priority
            
            calculatedPosition = if(at != null) {
                scope.internal.targetPositions = list(null, null, null)
                at
            } {
                maxTargetPosition = null
                maxPriority = if(priority != null) { priority } { scope.internal.targetPositions.length }
                i = 0
                while { i < maxPriority } {
                    targetPos = scope.internal.targetPositions.get(i)
                    if((targetPos != null) && ((maxTargetPosition == null) || (targetPos > maxTargetPosition))) {
                        maxTargetPosition = targetPos
                    }
                    i = i + 1
                }

                if(after != null) {
                    scope.internal.targetPositions = list(null, null, null)
                }

                (maxTargetPosition ?? scope.internal.currentSequenceDiagramPosition) + (after ?? 0)
            }
            
            calculatedPosition
        }
    `
);

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
        scope.internal.lifelineTargetPos = null

        this.currentLifelinePosition = 0

        this.updateLifelineTargetPos = {
            (newPos) = args
            if(scope.internal.lifelineTargetPos != null) {
                if(currentLifelinePosition < newPos) {
                    scope.internal.lifelineTargetPos.offsetY = newPos
                    currentLifelinePosition = newPos
                }
            }
        }
        
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
            updateLifelineTargetPos(newPosition)
        }
        
        scope.internal.registerTargetPosition = {
            (position, priority) = args
            this.newTarget = position + scope.internal.currentSequenceDiagramPosition
            scope.internal.targetPositions.set(priority, newTarget)
            updateLifelineTargetPos(newTarget)
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

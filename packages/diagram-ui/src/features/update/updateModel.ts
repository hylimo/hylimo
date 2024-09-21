import { inject, injectable } from "inversify";
import {
    Animation,
    CommandExecutionContext,
    CommandReturn,
    CompoundAnimation,
    forEachMatch,
    IActionDispatcher,
    isSelectable,
    MatchResult,
    SModelElementImpl,
    SModelRootImpl,
    TYPES,
    UpdateModelCommand as BaseUpdateModelCommand,
    ViewportRootElementImpl
} from "sprotty";
import { SRoot } from "../../model/sRoot.js";
import {
    ElmentLinearInterpolationAnimation,
    LinearInterpolationAnimation
} from "../animation/linearInterpolationAnimation.js";
import { computeCommonAnimatableFields, isLinearAnimatable } from "../animation/model.js";
import { createFitToScreenAction } from "../viewport/fitToScreenAction.js";
import { FluentIterable } from "sprotty/lib/utils/iterable.js";

/**
 * Custom UpdateModelCommand which handles linear interpolation animations
 */
@injectable()
export class UpdateModelCommand extends BaseUpdateModelCommand {
    @inject(TYPES.IActionDispatcher) private dispatcher!: IActionDispatcher;

    protected override computeAnimation(
        newRoot: SModelRootImpl,
        matchResult: MatchResult,
        context: CommandExecutionContext
    ): SModelRootImpl | Animation {
        const remainingMatchResult: MatchResult = {};
        const elementAnimations: ElmentLinearInterpolationAnimation[] = [];
        forEachMatch(matchResult, (id, match) => {
            if (match.left !== undefined && match.right !== undefined) {
                const animation = this._updateElement(
                    match.left as SModelElementImpl,
                    match.right as SModelElementImpl
                );
                if (animation !== undefined) {
                    elementAnimations.push(animation);
                }
            } else {
                remainingMatchResult[id] = match;
            }
        });
        const animations: Animation[] = [];
        if (elementAnimations.length > 0) {
            animations.push(new LinearInterpolationAnimation(newRoot, elementAnimations, context));
        }
        const fadeAnimation = super.computeAnimation(newRoot, remainingMatchResult, context);
        if (fadeAnimation instanceof Animation) {
            animations.push(fadeAnimation);
        }
        if (animations.length > 1) {
            return new CompoundAnimation(newRoot, context, animations);
        } else if (animations.length === 1) {
            return animations[0];
        } else {
            return newRoot;
        }
    }

    /**
     * Updates an element, computes linear interpolation animations if possible
     *
     * @param left the old element
     * @param right the new element
     * @returns an ElementLinearInterpolationAnimation or undefined
     */
    private _updateElement(
        left: SModelElementImpl,
        right: SModelElementImpl
    ): ElmentLinearInterpolationAnimation | undefined {
        if (isSelectable(left) && isSelectable(right)) {
            right.selected = left.selected;
        }
        if (left instanceof SModelRootImpl && right instanceof SModelRootImpl) {
            right.canvasBounds = left.canvasBounds;
        }
        if (left instanceof ViewportRootElementImpl && right instanceof ViewportRootElementImpl) {
            right.scroll = left.scroll;
            right.zoom = left.zoom;
        }
        if (isLinearAnimatable(left) && isLinearAnimatable(right)) {
            const commonFields = computeCommonAnimatableFields(left, right);
            if (commonFields.length > 0) {
                const interpolations = new Map<string, [number, number]>();
                for (const field of commonFields) {
                    const leftValue = (left as any)[field] as number;
                    const rightValue = (right as any)[field] as number;
                    if (leftValue != rightValue) {
                        interpolations.set(field, [leftValue, rightValue]);
                    }
                }
                return {
                    element: right,
                    interpolations
                };
            }
        }
        return undefined;
    }

    protected override performUpdate(
        oldRoot: SModelRootImpl,
        newRoot: SModelRootImpl,
        context: CommandExecutionContext
    ): CommandReturn {
        (newRoot as SRoot).changeRevision = (oldRoot as SRoot).changeRevision + 1;
        (newRoot as SRoot).sequenceNumber = (oldRoot as SRoot).sequenceNumber;
        layoutViewportIfNecessary(oldRoot.index.all(), newRoot.index.all(), this.dispatcher);
        return super.performUpdate(oldRoot, newRoot, context);
    }
}

/**
 * Fits the viewport to the new diagram size if too many changes occurred (i.e. the user pasted half a diagram into the editor).
 *
 * @param newElements the index storing all new model elements
 * @param old the index storing all current model elements
 * @param dispatcher the dispatcher to dispatch the 'fit to screen' action
 */
function layoutViewportIfNecessary(
    old: FluentIterable<SModelElementImpl>,
    newElements: FluentIterable<SModelElementImpl>,
    dispatcher: IActionDispatcher
) {
    const updatedElements = new Set(newElements.map((update) => update.id));

    // When we have so few updates, it isn't worth relayouting the viewport. We only want to lay it out if there are enough changes
    if (updatedElements.size < 10) {
        return;
    }

    const oldElements = new Set(old.map((element) => element.id));
    const difference = calculateDifference(oldElements, updatedElements);
    if (difference >= 0.5) {
        dispatcher.dispatch(createFitToScreenAction());
    }
}

/**
 * Calculates the difference ratio in the current diagram.<br>
 * The result is limited to the intervall [0, 1] where 0 means completely equal and 1 means completely different.
 *
 * @param oldElements the elements that were previously in this model
 * @param updatedElements the elements that were updated
 */
function calculateDifference(oldElements: Set<string>, updatedElements: Set<string>): number {
    const distance = calculateLevenshteinDistance(oldElements, updatedElements);
    const totalElements = new Set([...oldElements, ...updatedElements]);
    return distance / totalElements.size;
}

/**
 * Calculates the Levenshtein distance on two sets of strings instead of two strings.<br>
 * The typical rules apply: each deletion and insertion is counted as one additional distance, and replacement/movement can be ignored in our usecase
 *
 * @param oldElements the set of previously present model element IDs
 * @param newElements the set of updated model element IDs
 */
function calculateLevenshteinDistance(oldElements: Set<string>, newElements: Set<string>): number {
    let distance = 0;
    for (const newlyAdded of newElements) {
        if (!oldElements.has(newlyAdded)) {
            distance++;
        }
    }

    for (const deleted of oldElements) {
        if (!newElements.has(deleted)) {
            distance++;
        }
    }

    return distance;
}

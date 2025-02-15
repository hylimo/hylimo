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
    UpdateModelCommand as BaseUpdateModelCommand,
    ViewportRootElementImpl,
    ModelIndexImpl
} from "sprotty";
import { SRoot } from "../../model/sRoot.js";
import {
    ElmentLinearInterpolationAnimation,
    LinearInterpolationAnimation
} from "../animation/linearInterpolationAnimation.js";
import { computeCommonAnimatableFields, isLinearAnimatable } from "../animation/model.js";
import { createFitToScreenAction } from "../viewport/fitToScreenAction.js";
import { TYPES } from "../types.js";
import { TransactionStateProvider } from "../transaction/transactionStateProvider.js";

/**
 * Custom UpdateModelCommand which handles linear interpolation animations
 */
@injectable()
export class UpdateModelCommand extends BaseUpdateModelCommand {
    /**
     * The action dispatcher to dispatch
     */
    @inject(TYPES.IActionDispatcher) private readonly dispatcher!: IActionDispatcher;

    /**
     * The transaction state provider
     */
    @inject(TYPES.TransactionStateProvider) private readonly transactionStateProvider!: TransactionStateProvider;

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
        const { distance } = calculateLevenshteinDistance(this.oldRoot.index, newRoot.index);
        if (distance > 0 || animations.length === 0) {
            return newRoot;
        } else if (animations.length > 1) {
            return new CompoundAnimation(newRoot, context, animations);
        } else {
            return animations[0];
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
        if (left instanceof SRoot && right instanceof SRoot) {
            right.lineProviderHoverDataProvider = left.lineProviderHoverDataProvider;
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
        if (!this.transactionStateProvider.isInTransaction) {
            layoutViewportIfNecessary(oldRoot.index, newRoot.index, this.dispatcher);
        }
        return super.performUpdate(oldRoot, newRoot, context);
    }
}

/**
 * Fits the viewport to the new diagram size if too many changes occurred (i.e. the user pasted half a diagram into the editor).
 *
 * @param newElements the index storing all new model elements
 * @param oldElements the index storing all current model elements
 * @param dispatcher the dispatcher to dispatch the 'fit to screen' action
 */
function layoutViewportIfNecessary(
    oldElements: ModelIndexImpl,
    newElements: ModelIndexImpl,
    dispatcher: IActionDispatcher
) {
    const { ratioOfDivergence } = calculateLevenshteinDistance(oldElements, newElements);
    if (ratioOfDivergence >= 0.5) {
        dispatcher.dispatch(createFitToScreenAction());
    }
}

/**
 * Calculates the Levenshtein distance and ratio of divergence on two sets of elements instead of two strings.
 *
 * The typical rules apply: each deletion and insertion is counted as one additional distance, and replacement/movement can be ignored in our usecase.
 * Elements are considered equal if their id and type are equal.
 * The divergence ratio is limited to the interval [0, 1] where 0 means completely equal and 1 means completely different.
 *
 *
 * @param newElements the index storing all new model elements
 * @param oldElements the index storing all current model elements
 * @return the number of deviations for the given inputs and ratio of divergence
 */
function calculateLevenshteinDistance(
    oldElements: ModelIndexImpl,
    newElements: ModelIndexImpl
): {
    distance: number;
    ratioOfDivergence: number;
} {
    let distance = 0;
    let distinctCount = 0;

    oldElements.all().forEach((oldElement) => {
        const newElement = newElements.getById(oldElement.id);
        if (newElement == undefined || oldElement.type !== newElement.type) {
            distance++;
        }
        distinctCount++;
    });
    newElements.all().forEach((newElement) => {
        const oldElement = oldElements.getById(newElement.id);
        if (oldElement == undefined || newElement.type !== oldElement.type) {
            distance++;
            distinctCount++;
        }
    });

    return {
        distance,
        ratioOfDivergence: distance / distinctCount
    };
}

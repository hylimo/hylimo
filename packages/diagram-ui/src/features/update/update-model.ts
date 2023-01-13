import { injectable } from "inversify";
import {
    Animation,
    CommandExecutionContext,
    CompoundAnimation,
    forEachMatch,
    isSelectable,
    MatchResult,
    SModelElement,
    SModelRoot,
    UpdateModelCommand as BaseUpdateModelCommand,
    ViewportRootElement
} from "sprotty";
import {
    ElmentLinearInterpolationAnimation,
    LinearInterpolationAnimation
} from "../animation/linearInterpolationAnimation";
import { computeCommonAnimatableFields, isLinearAnimatable } from "../animation/model";

/**
 * Custom UpdateModelCommand which handles linear interpolation animations
 */
@injectable()
export class UpdateModelCommand extends BaseUpdateModelCommand {
    protected override computeAnimation(
        newRoot: SModelRoot,
        matchResult: MatchResult,
        context: CommandExecutionContext
    ): SModelRoot | Animation {
        const remainingMatchResult: MatchResult = {};
        const elementAnimations: ElmentLinearInterpolationAnimation[] = [];
        forEachMatch(matchResult, (id, match) => {
            if (match.left !== undefined && match.right !== undefined) {
                const animation = this._updateElement(match.left as SModelElement, match.right as SModelElement);
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
    private _updateElement(left: SModelElement, right: SModelElement): ElmentLinearInterpolationAnimation | undefined {
        if (isSelectable(left) && isSelectable(right)) {
            right.selected = left.selected;
        }
        if (left instanceof SModelRoot && right instanceof SModelRoot) {
            right.canvasBounds = left.canvasBounds;
        }
        if (left instanceof ViewportRootElement && right instanceof ViewportRootElement) {
            right.scroll = left.scroll;
            right.zoom = left.zoom;
        }
        if (isLinearAnimatable(left) && isLinearAnimatable(right)) {
            const commonFields = computeCommonAnimatableFields(left, right);
            if (commonFields.length > 0) {
                const interpolations = new Map<string, [number, number]>();
                for (const field of commonFields) {
                    interpolations.set(field, [(left as any)[field] as number, (right as any)[field] as number]);
                }
                return {
                    element: right,
                    interpolations
                };
            }
        }
        return undefined;
    }
}

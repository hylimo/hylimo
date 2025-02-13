import { SetViewportAction as SprottySetViewportAction, Viewport } from "sprotty-protocol";
import {
    Animation,
    CommandExecutionContext,
    CommandReturn,
    IStoppableCommand,
    isViewport,
    SModelElementImpl,
    SModelRootImpl,
    SetViewportCommand as SprottySetViewportCommand,
    TYPES
} from "sprotty";
import { inject, injectable } from "inversify";
import { Math2D, Point } from "@hylimo/diagram-common";

/**
 * Extended SetViewportAction with additional properties to control the animation
 */
export interface SetViewportAction extends SprottySetViewportAction {
    /**
     * Additional properties to control the animation
     */
    zoomAnimation?: {
        /**
         * Overwrites the default animation duration
         */
        animationDuration: number;
        /**
         * Overwrites the default easing function
         */
        ease: (x: number) => number;
    };
}

/**
 * Extended SetViewportCommand with additional properties to control the animation
 */
@injectable()
export class SetViewportCommand extends SprottySetViewportCommand implements IStoppableCommand {
    /**
     * The key to stop the animation
     */
    stoppableCommandKey: string;
    /**
     * The animation which can be stopped
     */
    private animation?: Animation;

    /**
     * Creates a new SetViewportCommand
     *
     * @param action the action to execute
     */
    constructor(@inject(TYPES.Action) protected override readonly action: SetViewportAction) {
        super(action);
        this.stoppableCommandKey = action.zoomAnimation != undefined ? SprottySetViewportAction.KIND : "";
    }

    override execute(context: CommandExecutionContext): CommandReturn {
        if (this.action.zoomAnimation != undefined) {
            context.duration = this.action.zoomAnimation.animationDuration;
        }
        return super.execute(context);
    }

    protected override setViewport(
        element: SModelElementImpl,
        oldViewport: Viewport,
        newViewport: Viewport,
        context: CommandExecutionContext
    ): CommandReturn {
        if (this.action.zoomAnimation != undefined && isViewport(element) && newViewport.zoom != oldViewport.zoom) {
            this.animation = new ZoomViewportAnimation(
                element,
                oldViewport,
                newViewport,
                context,
                this.action.zoomAnimation.ease
            );
            return this.animation.start();
        } else {
            return super.setViewport(element, oldViewport, newViewport, context);
        }
    }

    stopExecution(): void {
        this.animation?.stop();
    }
}

/**
 * Custom ViewportAnimation used to animate a zoom transition
 * Handles the animation of scroll differently to ensure the point under the cursor remains stable.
 * Assumes that the viewport is shifted ONLY due to the zoom change.
 */
class ZoomViewportAnimation extends Animation {
    /**
     * The factor by which the zoom changes
     */
    private zoomFactor: number;
    /**
     * The offset of the viewport
     */
    private viewportOffset: Point;

    /**
     * Creates a new ZoomViewportAnimation
     *
     * @param element the viewport element
     * @param oldViewport the old viewport
     * @param newViewport the new viewport
     * @param context the command execution context
     * @param ease the easing function
     */
    constructor(
        private readonly element: SModelElementImpl & Viewport,
        private readonly oldViewport: Viewport,
        private readonly newViewport: Viewport,
        context: CommandExecutionContext,
        ease: (x: number) => number
    ) {
        super(context, ease);
        this.zoomFactor = Math.log(newViewport.zoom / oldViewport.zoom);
        this.viewportOffset = Math2D.scale(
            Math2D.sub(this.oldViewport.scroll, this.newViewport.scroll),
            1 / (1 / newViewport.zoom - 1 / oldViewport.zoom)
        );
    }

    override tween(t: number, context: CommandExecutionContext): SModelRootImpl {
        const newZoom = this.oldViewport.zoom * Math.exp(t * this.zoomFactor);
        if (newZoom != this.oldViewport.zoom) {
            this.element.scroll = Math2D.sub(
                this.oldViewport.scroll,
                Math2D.scale(this.viewportOffset, 1 / newZoom - 1 / this.oldViewport.zoom)
            );
        }

        this.element.zoom = newZoom;
        return context.root;
    }
}

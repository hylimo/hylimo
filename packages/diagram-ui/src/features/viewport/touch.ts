import { inject, injectable } from "inversify";
import { Point } from "@hylimo/diagram-common";
import { VNode } from "snabbdom";
import {
    findParentByFeature,
    getWindowScroll,
    IActionDispatcher,
    isViewport,
    IVNodePostprocessor,
    limit,
    on,
    SModelElementImpl,
    SModelRootImpl,
    TYPES,
    ViewerOptions
} from "sprotty";
import { Action, Bounds, SetViewportAction, Viewport } from "sprotty-protocol";

/**
 * A touch listener that handles panning and zooming of the viewport
 */
@injectable()
export class ViewportTouchListener implements IVNodePostprocessor {
    private lastScrollPosition?: Point;
    private lastTouchDistance?: number;
    private lastTouchMidpoint?: Point;

    @inject(TYPES.IActionDispatcher) private actionDispatcher!: IActionDispatcher;
    @inject(TYPES.ViewerOptions) protected viewerOptions!: ViewerOptions;

    /**
     * Handler for the touch start event
     *
     * @param target the target element
     * @param event the touch event
     * @returns an array of actions to be dispatched
     */
    private touchStart(target: SModelElementImpl, event: TouchEvent): Action[] {
        const viewport = findParentByFeature(target, isViewport);
        if (viewport != undefined) {
            if (event.touches.length === 1) {
                this.lastScrollPosition = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            } else if (event.touches.length === 2) {
                this.lastTouchDistance = this.calculateDistance(event.touches);
                this.lastTouchMidpoint = this.calculateMidpoint(event.touches, viewport.canvasBounds);
            }
        } else {
            this.lastScrollPosition = undefined;
        }
        return [];
    }

    /**
     * Handler for the touch move event
     * Handles both panning and zooming
     *
     * @param target the target element
     * @param event the touch event
     * @returns an array of actions to be dispatched
     */
    private touchMove(target: SModelElementImpl, event: TouchEvent): Action[] {
        const viewport = findParentByFeature(target, isViewport);
        if (viewport == undefined || event.touches.length < 1 || event.touches.length > 2) {
            return [];
        }

        let newViewport: Viewport;
        if (event.touches.length === 1) {
            if (this.lastScrollPosition == undefined) {
                return [];
            }
            newViewport = this.calculateViewportFromOneTouch(viewport, event);
        } else {
            if (this.lastTouchDistance == undefined || this.lastTouchMidpoint == undefined) {
                return [];
            }
            newViewport = this.calculateViewportFromTwoTouches(viewport, event);
        }
        return [SetViewportAction.create(viewport.id, newViewport, { animate: false })];
    }

    /**
     * Calculates the new viewport when panning with one touch
     *
     * @param viewport the current viewport
     * @param event the touch event, should have exactly one touch
     * @returns the new viewport
     */
    private calculateViewportFromOneTouch(viewport: Viewport, event: TouchEvent): Viewport {
        const touch = event.touches[0];
        const newViewport = {
            scroll: {
                x: viewport.scroll.x - (touch.clientX - this.lastScrollPosition!.x) / viewport.zoom,
                y: viewport.scroll.y - (touch.clientY - this.lastScrollPosition!.y) / viewport.zoom
            },
            zoom: viewport.zoom
        };
        this.lastScrollPosition = { x: touch.clientX, y: touch.clientY };
        return newViewport;
    }

    /**
     * Calculates the new viewport when panning and zooming with two touches
     *
     * @param viewport the current viewport
     * @param event the touch event, should have exactly two touches
     * @returns the new viewport
     */
    private calculateViewportFromTwoTouches(viewport: SModelRootImpl & Viewport, event: TouchEvent): Viewport {
        const newDistance = this.calculateDistance(event.touches);
        const newMidpoint = this.calculateMidpoint(event.touches, viewport.canvasBounds);

        const scaleChange = newDistance / this.lastTouchDistance!;
        const newZoom = limit(viewport.zoom * scaleChange, this.viewerOptions.zoomLimits);

        const dx = (newMidpoint.x - this.lastTouchMidpoint!.x) / viewport.zoom;
        const dy = (newMidpoint.y - this.lastTouchMidpoint!.y) / viewport.zoom;
        const offsetFactor = 1.0 / newZoom - 1.0 / viewport.zoom;
        const newViewport = {
            scroll: {
                x: viewport.scroll.x - dx - offsetFactor * newMidpoint.x,
                y: viewport.scroll.y - dy - offsetFactor * newMidpoint.y
            },
            zoom: newZoom
        };

        this.lastTouchDistance = newDistance;
        this.lastTouchMidpoint = newMidpoint;
        return newViewport;
    }

    /**
     * Handler for the touch end event
     *
     * @param target the target element
     * @param event the touch event
     * @returns an array of actions to be dispatched
     */
    private touchEnd(target: SModelElementImpl, event: TouchEvent): Action[] {
        if (event.touches.length === 0) {
            this.lastScrollPosition = undefined;
            this.lastTouchDistance = undefined;
            this.lastTouchMidpoint = undefined;
        } else if (event.touches.length === 1) {
            this.lastScrollPosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
        return [];
    }

    /**
     * Calculates the distance of the firsts two touches in the list
     *
     * @param touches the list of touches
     * @returns the distance between the first two touches
     */
    private calculateDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Returns the midpoint of the first two touches in the list relative to the canvas bounds
     *
     * @param touches the list of touches
     * @param canvasBounds the bounds of the canvas in page coordinates
     * @returns the midpoint of the first two touches
     */
    private calculateMidpoint(touches: TouchList, canvasBounds: Bounds): Point {
        const windowScroll = getWindowScroll();
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2 + windowScroll.x - canvasBounds.x,
            y: (touches[0].clientY + touches[1].clientY) / 2 + windowScroll.y - canvasBounds.y
        };
    }

    /**
     * Handles a touch event by delegating to the appropriate handler
     *
     * @param methodName the name of the handler method
     * @param model the model element
     * @param event the touch event
     */
    private handleEvent(methodName: "touchStart" | "touchMove" | "touchEnd", model: SModelRootImpl, event: TouchEvent) {
        const actions = this[methodName](model, event);
        if (actions.length > 0) {
            event.preventDefault();
            this.actionDispatcher.dispatchAll(actions);
        }
    }

    /**
     * Adds event listeners to the vnode
     *
     * @param vnode the vnode to decorate
     * @param element the model element
     * @returns the decorated vnode
     */
    decorate(vnode: VNode, element: SModelElementImpl): VNode {
        if (element instanceof SModelRootImpl) {
            on(vnode, "touchstart", (event) => this.handleEvent("touchStart", element, event as TouchEvent));
            on(vnode, "touchmove", (event) => this.handleEvent("touchMove", element, event as TouchEvent));
            on(vnode, "touchend", (event) => this.handleEvent("touchEnd", element, event as TouchEvent));
        }
        return vnode;
    }

    /**
     * No-op
     */
    postUpdate() {}
}

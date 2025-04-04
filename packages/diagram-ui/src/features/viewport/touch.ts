import { inject, injectable } from "inversify";
import type { IActionDispatcher, SModelElementImpl, ViewerOptions, SModelRootImpl } from "sprotty";
import { findParentByFeature, getWindowScroll, isViewport, limit } from "sprotty";
import type { Action, Bounds, Viewport, Point } from "sprotty-protocol";
import { SetViewportAction } from "sprotty-protocol";
import { TYPES } from "../types.js";
import { TouchListener } from "../contrib/touch-tool.js";

/**
 * A touch listener that handles panning and zooming of the viewport
 */
@injectable()
export class ViewportTouchListener extends TouchListener {
    /**
     * The last positon a one-finger touch event occurred at
     * (Updated on touch start and touch move)
     */
    private lastTouchPosition?: Point;
    /**
     * The last distance (in screen units) between two fingers in a two-finger touch event
     * (Updated on touch start and touch move)
     */
    private lastTouchDistance?: number;
    /**
     * The last midpoint between two fingers in a two-finger touch event
     * (Updated on touch start and touch move)
     */
    private lastTouchMidpoint?: Point;

    /**
     * The action dispatcher used to dispatch actions
     */
    @inject(TYPES.IActionDispatcher) private actionDispatcher!: IActionDispatcher;

    /**
     * The viewer options used to limit the zoom level
     */
    @inject(TYPES.ViewerOptions) protected viewerOptions!: ViewerOptions;

    override touchStart(target: SModelElementImpl, event: TouchEvent): Action[] {
        const viewport = findParentByFeature(target, isViewport);
        if (viewport != undefined) {
            if (event.touches.length === 1) {
                this.lastTouchPosition = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            } else if (event.touches.length === 2) {
                this.lastTouchDistance = this.calculateDistance(event.touches);
                this.lastTouchMidpoint = this.calculateMidpoint(event.touches, viewport.canvasBounds);
            }
        } else {
            this.lastTouchPosition = undefined;
        }
        return [];
    }

    override touchMove(target: SModelElementImpl, event: TouchEvent): Action[] {
        const viewport = findParentByFeature(target, isViewport);
        if (viewport == undefined || event.touches.length < 1 || event.touches.length > 2) {
            return [];
        }

        let newViewport: Viewport;
        if (event.touches.length === 1) {
            if (this.lastTouchPosition == undefined) {
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
                x: viewport.scroll.x - (touch.clientX - this.lastTouchPosition!.x) / viewport.zoom,
                y: viewport.scroll.y - (touch.clientY - this.lastTouchPosition!.y) / viewport.zoom
            },
            zoom: viewport.zoom
        };
        this.lastTouchPosition = { x: touch.clientX, y: touch.clientY };
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

    override touchEnd(target: SModelElementImpl, event: TouchEvent): Action[] {
        if (event.touches.length === 0) {
            this.lastTouchPosition = undefined;
            this.lastTouchDistance = undefined;
            this.lastTouchMidpoint = undefined;
        } else if (event.touches.length === 1) {
            this.lastTouchPosition = {
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
}

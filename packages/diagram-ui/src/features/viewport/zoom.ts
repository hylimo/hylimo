import {
    findParentByFeature,
    IActionDispatcher,
    isViewport,
    limit,
    SModelElementImpl,
    SModelRootImpl,
    ZoomMouseListener as SprottyZoomMouseListener
} from "sprotty";
import { inject, injectable } from "inversify";
import { Action, Viewport } from "sprotty-protocol";
import UnitBezier from "@mapbox/unitbezier";
import { Point } from "@hylimo/diagram-common";
import { SetViewportAction } from "./viewport.js";
import { TYPES } from "../types.js";

/**
 * Zoom rate for mouse wheel events.
 */
const WHEEL_ZOOM_RATE = 1 / 300;

/**
 * Default zoom rate when using the trackpad.
 */
const DEFAULT_ZOOM_RATE = 1 / 200;

/**
 * Limits how often wheel events are processed when in wheel mode, due to each update taking at least one frame
 */
const MIN_WHEEL_EVENT_TIME_DIFF = 15;

/**
 * A delay which is waited to determine if a WheelEvent is caused by a mouse wheel.
 * If this delay passes, the WheelEvent is considered to be caused by a mouse wheel as a trackpad would
 * have already fired a WheelEvent.
 */
const WHEEL_DELAY = 40;

/**
 * Animation duration for zooming with the mouse wheel.
 */
const WHEEL_ANIMATION_DURATION = 250;

/**
 * Given given (x, y), (x1, y1) control points for a bezier curve,
 * return a function that interpolates along that curve.
 *
 * @param p1x control point 1 x coordinate
 * @param p1y control point 1 y coordinate
 * @param p2x control point 2 x coordinate
 * @param p2y control point 2 y coordinate
 */
function bezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
    // weird ts error, probably due to commonjs module
    const bezier = new (UnitBezier as any)(p1x, p1y, p2x, p2y);
    return (t: number) => {
        return bezier.solve(t);
    };
}

/**
 * Mouse listener that handles zooming with the mouse wheel.
 * Adds animation support when no trackpad is used.
 * Based upon https://github.com/maplibre/maplibre-gl-js/blob/7dff5a6e79cfe64dfed38afc302fb6dc1e52eb19/src/ui/handler/scroll_zoom.ts
 */
@injectable()
export class ZoomMouseListener extends SprottyZoomMouseListener {
    /**
     * Action dispatcher to dispatch the zoom actions.
     */
    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher!: IActionDispatcher;

    /**
     * Type of the current zoom event.
     */
    private type?: "wheel" | "trackpad";
    /**
     * Timeout to determine if a WheelEvent is caused by a mouse wheel.
     * Should be canceled if the type is detected earlier.
     */
    private timeout?: ReturnType<typeof setTimeout>;

    /**
     * The time of the last wheel event.
     */
    private lastWheelEventTime: number = 0;
    /**
     * The delta to use for the next viewport update.
     */
    private delta = 0;

    /**
     * The previous easing function used for the zoom animation.
     * Used to create a new easing function that is continuous with the last one.
     */
    private previousEasing?: {
        start: number;
        targetZoom: number;
        easing: (_: number) => number;
    };

    override wheel(target: SModelElementImpl, event: WheelEvent): Action[] {
        const viewport = findParentByFeature(target, isViewport);
        if (viewport == undefined) {
            return [];
        }
        const viewportOffset = this.getViewportOffset(viewport, event);
        let value = event.deltaY;
        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            value *= 10;
        } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            value *= 100;
        }
        this.delta += value;

        this.detectWheelType(value, viewport, viewportOffset);

        event.preventDefault();
        if (this.type != undefined) {
            return this.updateViewport(viewport, viewportOffset);
        }
        return [];
    }

    /**
     * Detects the wheel type (wheel or trackpad) based on the value, and time since the last event.
     * If the type cannot be detected now, sets a timeout when the type can surely be determined.
     *
     * @param value the scaled delta value
     * @param viewport the viewport
     * @param viewportOffset the cursor position which should remain stable
     */
    private detectWheelType(value: number, viewport: SModelRootImpl & Viewport, viewportOffset: Point) {
        const now = Date.now();
        const timeDelta = now - this.lastWheelEventTime;
        this.lastWheelEventTime = now;
        if (value !== 0 && Math.abs(value) < 4 || timeDelta < 40) {
            this.type = "trackpad";
            this.clearTimeoutIfSet();
            this.previousEasing = undefined;
        } else if (timeDelta > 1.5 * WHEEL_ANIMATION_DURATION) {
            this.type = undefined;
            this.previousEasing = undefined;
            this.timeout = setTimeout(() => {
                this.type = "wheel";
                this.actionDispatcher.dispatchAll(this.updateViewport(viewport, viewportOffset));
            }, WHEEL_DELAY);
        } else if (!this.type || timeDelta > 200) {
            this.type = Math.abs(timeDelta * value) < 200 ? "trackpad" : "wheel";
            this.clearTimeoutIfSet();
        }
    }

    /**
     * Cancels the timeout if set.
     */
    private clearTimeoutIfSet() {
        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    /**
     * Updates the viewport
     *
     * @param viewport the viewport to update
     * @param viewportOffset the cursor position which should remain stable
     * @returns the actions to dispatch
     */
    private updateViewport(viewport: SModelRootImpl & Viewport, viewportOffset: Point): Action[] {
        const isWheel = this.type === "wheel";
        if (
            isWheel &&
            this.previousEasing != undefined &&
            Date.now() - this.previousEasing.start < MIN_WHEEL_EVENT_TIME_DIFF
        ) {
            return [];
        }
        const zoomRate = isWheel ? WHEEL_ZOOM_RATE : DEFAULT_ZOOM_RATE;
        const zoomFactor = Math.exp(-this.delta * zoomRate);
        const limitedZoom = limit(
            (this.previousEasing?.targetZoom ?? viewport.zoom) * zoomFactor,
            this.viewerOptions.zoomLimits
        );
        this.delta = 0;
        if (limitedZoom === viewport.zoom) {
            return [];
        }
        const action = this.generateUpdateViewportAction(limitedZoom, viewport, viewportOffset, isWheel);
        return [action];
    }

    /**
     * Generates the action to update the viewport.
     *
     * @param limitedZoom the limited zoom level
     * @param viewport the viewport to update
     * @param viewportOffset the cursor position which should remain stable
     * @param isWheel whether the action is caused by a wheel instead of a trackpad
     * @returns the action to update the viewport
     */
    private generateUpdateViewportAction(
        limitedZoom: number,
        viewport: SModelRootImpl & Viewport,
        viewportOffset: Point,
        isWheel: boolean
    ): SetViewportAction {
        const offsetFactor = 1.0 / limitedZoom - 1.0 / viewport.zoom;
        const action: SetViewportAction = {
            kind: "viewport",
            elementId: viewport.id,
            newViewport: {
                scroll: {
                    x: viewport.scroll.x - offsetFactor * viewportOffset.x,
                    y: viewport.scroll.y - offsetFactor * viewportOffset.y
                },
                zoom: limitedZoom
            },
            animate: isWheel,
            zoomAnimation: isWheel
                ? {
                      animationDuration: WHEEL_ANIMATION_DURATION,
                      ease: this.computeWheelEasing(limitedZoom)
                  }
                : null
        };
        return action;
    }

    /**
     * Computes the easing function for the zoom animation.
     * Ensures that the easing function is continuous with the last one.
     *
     * @param targetZoom the target zoom level
     * @returns the easing function
     */
    private computeWheelEasing(targetZoom: number) {
        let easing = bezier(0.25, 0.1, 0.25, 1);

        if (this.previousEasing) {
            const currentEase = this.previousEasing;
            const dt = (Date.now() - currentEase.start) / WHEEL_ANIMATION_DURATION;
            const speed = currentEase.easing(dt + 0.01) - currentEase.easing(dt);

            // Quick hack to make new bezier that is continuous with last
            const x = (0.27 / Math.sqrt(speed * speed + 0.0001)) * 0.01;
            const y = Math.sqrt(0.27 * 0.27 - x * x);

            easing = bezier(x, y, 0.25, 1);
        }

        this.previousEasing = {
            start: Date.now(),
            targetZoom,
            easing
        };
        return easing;
    }
}

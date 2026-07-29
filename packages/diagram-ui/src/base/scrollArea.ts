/**
 * The elements a scroll area consists of.
 * The expected DOM structure is
 * ```
 * root
 *   viewport
 *     content
 *   scrollbar
 *     thumb
 * ```
 */
export interface ScrollAreaElements {
    /**
     * The outermost element, used for hover detection.
     */
    root: HTMLElement;
    /**
     * The element which is actually scrolled, must hide the native scrollbar.
     */
    viewport: HTMLElement;
    /**
     * The only child of the viewport, wrapping the scrollable content.
     */
    content: HTMLElement;
    /**
     * The custom scrollbar track, positioned on top of the viewport.
     */
    scrollbar: HTMLElement;
    /**
     * The draggable thumb inside the scrollbar.
     */
    thumb: HTMLElement;
}

/**
 * The measurements required to map between scroll and thumb positions.
 */
interface ScrollAreaSizes {
    /**
     * The maximum value of scrollTop.
     */
    maxScroll: number;
    /**
     * The size of the scrollbar track, excluding its padding.
     */
    track: number;
    /**
     * The offset of the scrollbar track relative to the scrollbar element.
     */
    trackOffset: number;
    /**
     * The size of the thumb.
     */
    thumb: number;
}

/**
 * Delay in ms after which the scrollbar is hidden again once the pointer leaves the scroll area
 * or scrolling stops.
 */
const HIDE_DELAY = 600;

/**
 * The minimum size of the thumb in px, so that it stays grabbable for very long content.
 */
const MIN_THUMB_SIZE = 18;

/**
 * Tolerance in px used to decide whether the content overflows the viewport.
 * Avoids a flickering scrollbar caused by subpixel rounding.
 */
const OVERFLOW_TOLERANCE = 1;

/**
 * Controller for a custom, overlaying scrollbar.
 * This is a reimplementation of the reka-ui ScrollArea (https://github.com/unovue/reka-ui),
 * see the LICENSES file. Only vertical scrolling is supported, as this is the only direction
 * required so far.
 *
 * The controller is framework agnostic and only operates on the provided DOM elements,
 * meaning it can be used both from snabbdom based views and from Vue components.
 * It is meant to be created once per logical scroll area and to survive re-renders:
 * {@link attach} can be called repeatedly, and is a no-op if the elements did not change.
 *
 * The scrollbar is exposed via attributes so that the whole appearance can be controlled via CSS:
 * - `data-scrollable` on the root is `true` exactly if the content overflows the viewport
 * - `data-state` on the scrollbar is either `visible` or `hidden`
 * - `data-dragging` is present on the thumb while it is being dragged
 */
export class ScrollAreaController {
    /**
     * The currently attached elements, if any.
     */
    private elements?: ScrollAreaElements;

    /**
     * Observes viewport and content for size changes.
     */
    private resizeObserver?: ResizeObserver;

    /**
     * Callbacks which remove the registered event listeners again.
     */
    private readonly listenerDisposables: (() => void)[] = [];

    /**
     * The last measured sizes, used to map pointer positions to scroll positions.
     */
    private sizes: ScrollAreaSizes = { maxScroll: 0, track: 0, trackOffset: 0, thumb: 0 };

    /**
     * Handle of the pending hide timeout, if any.
     */
    private hideTimeout?: number;

    /**
     * Handle of the pending animation frame used to coalesce scroll events.
     */
    private animationFrame?: number;

    /**
     * If true, the content currently overflows the viewport.
     */
    private scrollable = false;

    /**
     * If true, the pointer is currently over the scroll area.
     */
    private hovered = false;

    /**
     * The distance between the top of the thumb and the pointer while dragging.
     * Undefined if the thumb is currently not dragged.
     */
    private dragOffset?: number;

    /**
     * Attaches the controller to the given elements.
     * If the controller is already attached to exactly these elements, only the sizes are updated,
     * otherwise it is detached from the previous elements first.
     *
     * @param elements the elements making up the scroll area
     */
    attach(elements: ScrollAreaElements): void {
        const current = this.elements;
        if (
            current != undefined &&
            current.root === elements.root &&
            current.viewport === elements.viewport &&
            current.content === elements.content &&
            current.scrollbar === elements.scrollbar &&
            current.thumb === elements.thumb
        ) {
            this.update();
            return;
        }
        this.detach();
        this.elements = elements;
        this.registerListeners(elements);
        this.resizeObserver = new ResizeObserver(() => this.update());
        this.resizeObserver.observe(elements.viewport);
        this.resizeObserver.observe(elements.content);
        this.setVisible(false);
        this.update();
    }

    /**
     * Detaches the controller from its current elements and releases all resources.
     * Safe to call if the controller is not attached.
     */
    detach(): void {
        for (const disposable of this.listenerDisposables) {
            disposable();
        }
        this.listenerDisposables.length = 0;
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        if (this.hideTimeout != undefined) {
            window.clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }
        if (this.animationFrame != undefined) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = undefined;
        }
        this.elements = undefined;
        this.scrollable = false;
        this.hovered = false;
        this.dragOffset = undefined;
    }

    /**
     * Re-measures the scroll area and updates the thumb accordingly.
     * Called automatically on resize, but can be used to react to changes which are not observable,
     * for example a change of the scrollbar padding.
     */
    update(): void {
        const elements = this.elements;
        if (elements == undefined) {
            return;
        }
        const { root, viewport, scrollbar, thumb } = elements;
        const viewportSize = viewport.clientHeight;
        const contentSize = viewport.scrollHeight;
        const scrollable = contentSize - viewportSize > OVERFLOW_TOLERANCE;
        if (scrollable !== this.scrollable) {
            this.scrollable = scrollable;
            root.setAttribute("data-scrollable", `${scrollable}`);
            this.setVisible(scrollable && this.hovered);
        }
        if (!scrollable) {
            return;
        }
        const scrollbarStyle = getComputedStyle(scrollbar);
        const paddingStart = parseFloat(scrollbarStyle.paddingTop) || 0;
        const paddingEnd = parseFloat(scrollbarStyle.paddingBottom) || 0;
        const track = Math.max(scrollbar.clientHeight - paddingStart - paddingEnd, 0);
        const thumbSize = Math.min(Math.max((track * viewportSize) / contentSize, MIN_THUMB_SIZE), track);
        this.sizes = {
            maxScroll: contentSize - viewportSize,
            track,
            trackOffset: paddingStart,
            thumb: thumbSize
        };
        thumb.style.height = `${thumbSize}px`;
        this.updateThumbPosition();
    }

    /**
     * Registers all event listeners required for hover detection, scrolling and dragging.
     *
     * @param elements the elements making up the scroll area
     */
    private registerListeners(elements: ScrollAreaElements): void {
        const { root, viewport, scrollbar } = elements;
        this.addListener(root, "pointerenter", () => {
            this.hovered = true;
            this.show();
        });
        this.addListener(root, "pointerleave", () => {
            this.hovered = false;
            this.scheduleHide();
        });
        this.addListener(
            viewport,
            "scroll",
            () => {
                this.requestThumbPositionUpdate();
                this.show();
                this.scheduleHide();
            },
            { passive: true }
        );
        this.addListener(scrollbar, "pointerdown", (event) => this.handlePointerDown(event));
        this.addListener(scrollbar, "pointermove", (event) => this.handlePointerMove(event));
        this.addListener(scrollbar, "pointerup", (event) => this.handlePointerUp(event));
        this.addListener(scrollbar, "pointercancel", (event) => this.handlePointerUp(event));
    }

    /**
     * Adds an event listener which is removed again on {@link detach}.
     *
     * @param target the element to register the listener on
     * @param type the type of the event to listen for
     * @param listener the listener to register
     * @param options the options to pass to addEventListener
     */
    private addListener<K extends keyof HTMLElementEventMap>(
        target: HTMLElement,
        type: K,
        listener: (event: HTMLElementEventMap[K]) => void,
        options?: AddEventListenerOptions
    ): void {
        target.addEventListener(type, listener as EventListener, options);
        this.listenerDisposables.push(() => target.removeEventListener(type, listener as EventListener, options));
    }

    /**
     * Handles a pointer down on the scrollbar.
     * Dragging the thumb keeps the grabbed position under the pointer, while clicking the track
     * first centers the thumb at the pointer and then continues as a drag.
     *
     * @param event the pointer event
     */
    private handlePointerDown(event: PointerEvent): void {
        const elements = this.elements;
        if (elements == undefined || !this.scrollable || event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const { scrollbar, thumb, viewport } = elements;
        if (event.target === thumb) {
            this.dragOffset = event.clientY - thumb.getBoundingClientRect().top;
        } else {
            this.dragOffset = this.sizes.thumb / 2;
        }
        scrollbar.setPointerCapture(event.pointerId);
        thumb.setAttribute("data-dragging", "true");
        viewport.style.scrollBehavior = "auto";
        this.show();
        this.scrollToPointer(event.clientY);
    }

    /**
     * Handles a pointer move while the thumb is being dragged.
     *
     * @param event the pointer event
     */
    private handlePointerMove(event: PointerEvent): void {
        if (this.dragOffset == undefined) {
            return;
        }
        event.preventDefault();
        this.scrollToPointer(event.clientY);
    }

    /**
     * Handles the end of a thumb drag.
     *
     * @param event the pointer event
     */
    private handlePointerUp(event: PointerEvent): void {
        const elements = this.elements;
        if (elements == undefined || this.dragOffset == undefined) {
            return;
        }
        this.dragOffset = undefined;
        const { scrollbar, thumb, viewport } = elements;
        if (scrollbar.hasPointerCapture(event.pointerId)) {
            scrollbar.releasePointerCapture(event.pointerId);
        }
        thumb.removeAttribute("data-dragging");
        viewport.style.scrollBehavior = "";
        this.scheduleHide();
    }

    /**
     * Scrolls the viewport so that the dragged thumb position matches the pointer position.
     *
     * @param clientY the y coordinate of the pointer
     */
    private scrollToPointer(clientY: number): void {
        const elements = this.elements;
        if (elements == undefined || this.dragOffset == undefined) {
            return;
        }
        const { scrollbar, viewport } = elements;
        const { maxScroll, track, trackOffset, thumb } = this.sizes;
        const maxThumbPosition = track - thumb;
        if (maxThumbPosition <= 0) {
            return;
        }
        const trackTop = scrollbar.getBoundingClientRect().top + trackOffset;
        const thumbPosition = clamp(clientY - trackTop - this.dragOffset, 0, maxThumbPosition);
        viewport.scrollTop = (thumbPosition / maxThumbPosition) * maxScroll;
    }

    /**
     * Schedules a thumb position update on the next animation frame.
     * Used to coalesce scroll events, avoiding scroll linked layout thrashing.
     */
    private requestThumbPositionUpdate(): void {
        if (this.animationFrame != undefined) {
            return;
        }
        this.animationFrame = window.requestAnimationFrame(() => {
            this.animationFrame = undefined;
            this.updateThumbPosition();
        });
    }

    /**
     * Moves the thumb to the position matching the current scroll position.
     */
    private updateThumbPosition(): void {
        const elements = this.elements;
        if (elements == undefined || !this.scrollable) {
            return;
        }
        const { maxScroll, track, thumb } = this.sizes;
        const maxThumbPosition = track - thumb;
        const progress = maxScroll > 0 ? clamp(elements.viewport.scrollTop / maxScroll, 0, 1) : 0;
        elements.thumb.style.transform = `translate3d(0, ${progress * maxThumbPosition}px, 0)`;
    }

    /**
     * Makes the scrollbar visible and cancels a pending hide.
     */
    private show(): void {
        if (this.hideTimeout != undefined) {
            window.clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }
        this.setVisible(true);
    }

    /**
     * Hides the scrollbar after {@link HIDE_DELAY}, unless it is hovered or dragged by then.
     */
    private scheduleHide(): void {
        if (this.hideTimeout != undefined) {
            window.clearTimeout(this.hideTimeout);
        }
        this.hideTimeout = window.setTimeout(() => {
            this.hideTimeout = undefined;
            if (!this.hovered && this.dragOffset == undefined) {
                this.setVisible(false);
            }
        }, HIDE_DELAY);
    }

    /**
     * Updates the state attribute controlling the visibility of the scrollbar.
     *
     * @param visible whether the scrollbar should be visible
     */
    private setVisible(visible: boolean): void {
        this.elements?.scrollbar.setAttribute("data-state", visible && this.scrollable ? "visible" : "hidden");
    }
}

/**
 * Clamps a value to the given range.
 *
 * @param value the value to clamp
 * @param min the lower bound
 * @param max the upper bound
 * @returns the clamped value
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

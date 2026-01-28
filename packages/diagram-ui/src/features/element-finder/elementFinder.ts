import { injectable, inject } from "inversify";
import { SModelElementImpl, SModelRootImpl, TYPES } from "sprotty";
import type { DOMHelper } from "sprotty/lib/base/views/dom-helper.js";

/**
 * Service for finding model elements from DOM elements or coordinates.
 * This is useful when working with pointer capture where event.target may not be accurate.
 */
@injectable()
export class ElementFinder {
    /**
     * The injected DOM helper
     */
    @inject(TYPES.DOMHelper) protected domHelper!: DOMHelper;

    /**
     * Finds the target element by traversing the DOM tree starting from a DOM element.
     *
     * @param model The root model
     * @param domElement The DOM element to start from
     * @returns The target element or undefined if not found
     */
    findElementByDOMElement(model: SModelRootImpl, domElement: Element): SModelElementImpl | undefined {
        let target = domElement as Element;
        const index = model.index;
        while (target) {
            if (target.id) {
                const element = index.getById(this.domHelper.findSModelIdByDOMElement(target));
                if (element !== undefined) return element;
            }
            target = target.parentNode as Element;
        }
        return undefined;
    }

    /**
     * Finds the target element at a specific point in the document.
     * This is useful when working with pointer capture where event.target may not be accurate.
     *
     * @param model The root model
     * @param clientX The X coordinate in viewport space
     * @param clientY The Y coordinate in viewport space
     * @returns The target element or undefined if not found
     */
    findElementAtPoint(model: SModelRootImpl, clientX: number, clientY: number): SModelElementImpl | undefined {
        const domElement = document.elementFromPoint(clientX, clientY);
        if (!domElement) {
            return undefined;
        }
        return this.findElementByDOMElement(model, domElement);
    }
}

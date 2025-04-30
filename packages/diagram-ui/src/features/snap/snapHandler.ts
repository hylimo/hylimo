import type { SRoot } from "../../model/sRoot.js";
import type { SnapReferenceData } from "./model.js";
import { getSnapReferenceData, intersectSnapReferenceDatas } from "./snapping.js";

/**
 * Base class for snap handlers.
 */
export abstract class SnapHandler {
    /**
     * Creates a new SnapHandler.

     * @param referenceData the reference data to use for snapping
     */
    constructor(protected referenceData: SnapReferenceData) {}

    /**
     * Updates the reference data for snapping based on the current context.
     *
     * @param root The root element of the model
     */
    updateReferenceData(root: SRoot): void {
        const newReferenceData = getSnapReferenceData(root, new Set(this.referenceData.keys()), new Set());
        this.referenceData = intersectSnapReferenceDatas(this.referenceData, newReferenceData);
    }
}

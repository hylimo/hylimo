import type { SharedSettings } from "@hylimo/diagram-protocol";
import type { SRoot } from "../../model/sRoot.js";
import type { SnapReferenceData } from "./model.js";
import { getSnapReferenceData, intersectSnapReferenceDatas } from "./snapData.js";

/**
 * Base class for snap handlers.
 */
export abstract class SnapHandler {
    /**
     * Shared settings for the snap handler.
     */
    protected readonly settings: SharedSettings;

    /**
     * Creates a new SnapHandler.
     *
     * @param referenceData the reference data to use for snapping
     * @param settings the shared settings for the snap handler
     */
    constructor(
        protected referenceData: SnapReferenceData,
        settings: SharedSettings | undefined
    ) {
        this.settings = settings ?? {};
    }

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

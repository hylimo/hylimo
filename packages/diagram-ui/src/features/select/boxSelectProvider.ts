import type { Bounds } from "@hylimo/diagram-common";

/**
 * Provider for the current selection box
 */
export interface BoxSelectProvider {
    /**
     * The current selection box
     */
    box: Bounds | undefined;
}

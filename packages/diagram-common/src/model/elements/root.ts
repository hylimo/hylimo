import type { Bounds } from "../../common/bounds.js";
import type { FontData } from "../../font/fontData.js";
import type { Element } from "./base/element.js";

/**
 * Root diagram element, defining child elements and fonts
 */
export interface Root extends Element {
    /**
     * Type of the element
     */
    type: typeof Root.TYPE;
    /**
     * The id of the element
     */
    id: string;
    /**
     * Defined font families
     */
    fonts: FontData[];
    /**
     * The bounds of the whole diagram, as defined by hylimo's internal definition, not the definition of any external tool
     */
    rootBounds: Bounds;
    /**
     * Is this a preview element?
     */
    preview: boolean;
    /**
     * If this was rendered based on a transaction, the id and sequence number of the transaction
     */
    transactionState?: TransactionState;
}

/**
 * The state of a transaction
 */
export interface TransactionState {
    /**
     * The id of the transaction
     */
    id: string;
    /**
     * The sequence number of the transaction
     */
    sequenceNumber: number;
}

export namespace Root {
    export const TYPE = "root";
}

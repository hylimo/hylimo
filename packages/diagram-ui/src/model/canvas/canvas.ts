import { SChildElement } from "sprotty";
import { SLayoutedElement } from "../layoutedElement";
import { PointVisibilityManager } from "./pointVisibilityManager";

/**
 * Canvas model element
 */
export class SCanvas extends SLayoutedElement {
    /**
     * Lookup of children by id
     */
    private childrenById?: Map<string, SChildElement>;

    /**
     * Internal cached version of the PointVisibilityManager
     */
    private _pointVisibilityManager?: PointVisibilityManager;

    /**
     * Gets the PointVisibilityManager
     */
    get pointVisibilityManager(): PointVisibilityManager {
        if (!this._pointVisibilityManager) {
            this._pointVisibilityManager = new PointVisibilityManager(this);
        }
        return this._pointVisibilityManager;
    }
}

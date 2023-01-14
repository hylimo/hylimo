import { SChildElement } from "sprotty";
import { SLayoutedElement } from "../layoutedElement";

/**
 * Canvas model element
 */
export class SCanvas extends SLayoutedElement {
    /**
     * Lookup of children by id
     */
    private childrenById?: Map<string, SChildElement>;

    /**
     * Gets a child by its id
     * Initializes the lookup if required
     *
     * @param id the id of the child
     * @returns the found child
     */
    getChildById(id: string): SChildElement {
        if (this.childrenById === undefined) {
            this.childrenById = new Map();
            for (const child of this.children) {
                this.childrenById.set(child.id, child);
            }
        }
        return this.childrenById.get(id)!;
    }
}

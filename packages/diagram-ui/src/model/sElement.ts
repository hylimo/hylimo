import { SChildElement } from "sprotty";
import { Element } from "@hylimo/diagram-common";

/**
 * Base class for all elements
 */
export abstract class SElement extends SChildElement implements Element {
    override children!: SElement[];
}

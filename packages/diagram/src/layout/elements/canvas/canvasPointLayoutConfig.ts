import { Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig";

/**
 * Base class for all point layout configs
 */
export abstract class CanvasPointLayoutConfig extends CanvasContentLayoutConfig {
    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return constraints.min;
    }
}

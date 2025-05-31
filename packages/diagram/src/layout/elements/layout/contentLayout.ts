import type { LayoutElement } from "../../layoutElement.js";
import type { ContentLayoutConfig } from "./contentLayoutConfig.js";
import { HBoxLayoutConfig } from "./hboxLayoutConfig.js";
import { StackLayoutConfig } from "./stackLayoutConfig.js";
import { VBoxLayoutConfig } from "./vboxLayoutConfig.js";

/**
 * Known content layouts
 */
const layouts = [new HBoxLayoutConfig(), new VBoxLayoutConfig(), new StackLayoutConfig()];

/**
 * Lookup map for content layouts by type
 */
const layoutMap = new Map<string, ContentLayoutConfig>(layouts.map((layout) => [layout.type, layout]));

/**
 * Gets the content layout config for a given container element
 * Falls back to hbox if the layout is not defined
 *
 * @param element the container element to get the layout config for
 * @returns the content layout config
 */
export function getContentLayoutConfig(element: LayoutElement): ContentLayoutConfig {
    const type = element.styles.layout ?? "stack";
    return layoutMap.get(type)!;
}

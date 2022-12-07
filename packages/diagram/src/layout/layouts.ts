import { HBoxLayoutConfig } from "./elements/hboxLayoutConfig";
import { RectLayoutConfig } from "./elements/rectLayoutConfig";
import { SpanLayoutConfig } from "./elements/spanLayoutConfig";
import { TextLayoutConfig } from "./elements/textLayoutConfig";
import { VBoxLayoutConfig } from "./elements/vboxLayoutConfig";
import { LayoutElementConfig } from "./layoutElement";

/**
 * Known layouts
 */
export const layouts: LayoutElementConfig[] = [
    new RectLayoutConfig(),
    new VBoxLayoutConfig(),
    new HBoxLayoutConfig(),
    new TextLayoutConfig(),
    new SpanLayoutConfig()
];

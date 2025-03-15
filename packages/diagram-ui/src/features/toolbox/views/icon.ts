import type { IconNode } from "lucide";
import type { VNode } from "snabbdom";
import { h, thunk } from "snabbdom";

/**
 * Generates an icon.
 *
 * @param icon the name of the icon
 * @param cls the classes to apply
 * @returns the icon
 */
export function generateIcon(icon: IconNode, cls: string[] = []): VNode {
    return thunk("svg.icon", renderIcon, [icon, cls]);
}

/**
 * Renders a Lucide icon.
 *
 * @param icon The icon to render
 * @param cls The classes to apply
 * @returns The rendered icon
 */
function renderIcon(icon: IconNode, cls: string[]): VNode {
    return h(
        "svg.icon",
        {
            attrs: {
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 2,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            },
            class: Object.fromEntries(cls.map((entry) => [entry, true]))
        },
        icon.map(([tag, attrs]) => h(tag, { attrs }))
    );
}

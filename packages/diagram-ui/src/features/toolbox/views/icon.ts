import { IconNode } from "lucide";
import { h, thunk, VNode } from "snabbdom";

/**
 * Generates an icon.
 *
 * @param icon the name of the icon
 * @returns the icon
 */
export function generateIcon(icon: IconNode): VNode {
    return thunk("svg.icon", renderIcon, [icon]);
}

/**
 * Renders a Lucide icon.
 *
 * @param icon The icon to render
 * @returns The rendered icon
 */
function renderIcon(icon: IconNode): VNode {
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
            }
        },
        icon.map(([tag, attrs]) => h(tag, { attrs }))
    );
}

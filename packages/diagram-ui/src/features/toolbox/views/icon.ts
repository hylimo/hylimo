import { h, VNode } from "snabbdom";

/**
 * Generates an icon.
 *
 * @param icon the name of the icon
 * @returns the icon
 */
export function generateIcon(icon: string): VNode {
    return h("span.icon", {
        class: {
            [`icon-${icon}`]: true
        }
    });
}

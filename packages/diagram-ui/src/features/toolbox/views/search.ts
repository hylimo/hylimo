import { Toolbox } from "../toolbox.js";
import { VNode, h } from "snabbdom";
import { generateIcon } from "./icon.js";

/**
 * Generates the search box.
 *
 * @param context The toolbox context
 * @returns The search box or undefined
 */
export function generateSearchBox(context: Toolbox): VNode {
    const searchInput = generateSearchInput(context);
    const icon = generateIcon("search");
    return h("div.toolbox-details-header", [h("div.selectable-input", [icon, searchInput])]);
}

/**
 * Generates the search input element.
 *
 * @param context The toolbox context
 * @returns The search input element
 */
function generateSearchInput(context: Toolbox): VNode {
    return h("input", {
        props: {
            placeholder: "Search"
        },
        hook: {
            insert: (vnode) => {
                const element = vnode.elm as HTMLInputElement;
                element.focus();
            },
            update: (oldVnode, vnode) => {
                const element = vnode.elm as HTMLInputElement;
                element.value = context.searchString;
            }
        },
        on: {
            input: (event) => {
                context.searchString = (event.target as HTMLInputElement).value;
                context.update();
            },
            keydown: (event) => {
                if (event.key === "Escape") {
                    context.searchString = "";
                    context.update();
                }
            }
        }
    });
}

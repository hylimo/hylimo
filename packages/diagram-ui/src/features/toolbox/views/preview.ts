import type { ConnectionEditEntry, Toolbox, ToolboxEditEntry } from "../toolbox.js";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";

/**
 * Generates the preview for a toolbox/connection edit if available.
 * If no preview is available, undefined is returned.
 *
 * @param context The toolbox context
 * @param editEntry The toolbox/connection edit
 * @returns The preview or undefined
 */
export function generatePreviewIfAvailable(
    context: Toolbox,
    editEntry: ToolboxEditEntry | ConnectionEditEntry
): VNode | undefined {
    if (context.showPreviewFor != editEntry.edit) {
        return undefined;
    }
    const preview = context.elementPreviews.get(editEntry.edit);
    if (preview == undefined) {
        return undefined;
    }
    return h(
        "div.preview",
        {
            hook: {
                insert: (vnode) => {
                    const element = vnode.elm as HTMLElement;
                    const parent = element.parentElement!;
                    const toolbox = parent.closest(".toolbox")!;
                    const offset = parent.getBoundingClientRect().top - toolbox.getBoundingClientRect().top;
                    element.style.top = `${offset}px`;
                }
            }
        },
        preview
    );
}

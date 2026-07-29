import type { Toolbox } from "../toolbox.js";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";

/**
 * Generates the preview for the currently hovered toolbox/connection edit if available.
 * The preview is intentionally not part of the scrollable item list, as it is rendered outside of
 * the toolbox and would therefore be clipped by the scroll area.
 * Instead, it is aligned with the item it belongs to based on the actual item position.
 *
 * @param context The toolbox context
 * @returns The preview or undefined if no preview is available
 */
export function generateCurrentPreview(context: Toolbox): VNode | undefined {
    const edit = context.showPreviewFor;
    if (edit == undefined) {
        return undefined;
    }
    const preview = context.elementPreviews.get(edit);
    if (preview == undefined) {
        return undefined;
    }
    return h(
        "div.preview",
        {
            key: edit,
            hook: {
                insert: (vnode) => alignPreviewWithItem(vnode.elm as HTMLElement, edit),
                postpatch: (_oldVnode, vnode) => alignPreviewWithItem(vnode.elm as HTMLElement, edit)
            }
        },
        preview
    );
}

/**
 * Vertically aligns the preview with the item it belongs to.
 *
 * @param element The preview element
 * @param edit The edit the preview belongs to
 */
function alignPreviewWithItem(element: HTMLElement, edit: string): void {
    const offsetParent = element.offsetParent;
    const item = element.closest(".toolbox")?.querySelector(`[data-edit="${CSS.escape(edit)}"]`);
    if (offsetParent == undefined || item == undefined) {
        return;
    }
    element.style.top = `${item.getBoundingClientRect().top - offsetParent.getBoundingClientRect().top}px`;
}

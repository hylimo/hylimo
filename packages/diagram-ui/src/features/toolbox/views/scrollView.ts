import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import type { ScrollAreaController } from "../../../base/scrollArea.js";

/**
 * Generates a scroll area with a custom, overlaying scrollbar.
 * The generated structure is based on the reka-ui ScrollArea (https://github.com/unovue/reka-ui),
 * see the LICENSES file.
 * The provided controller is attached to the generated elements and must be kept alive
 * across re-renders, meaning it should be owned by the component generating the view.
 *
 * @param controller the controller managing this scroll area
 * @param selector the snabbdom selector of the root element, the scroll area class is added automatically
 * @param children the scrollable content
 * @returns the scroll area VNode
 */
export function generateScrollView(
    controller: ScrollAreaController,
    selector: string,
    children: (VNode | undefined)[]
): VNode {
    const attach = (element: HTMLElement) => {
        const viewport = element.querySelector<HTMLElement>(":scope > .scroll-area-viewport");
        const content = viewport?.querySelector<HTMLElement>(":scope > .scroll-area-content");
        const scrollbar = element.querySelector<HTMLElement>(":scope > .scroll-area-scrollbar");
        const thumb = scrollbar?.querySelector<HTMLElement>(":scope > .scroll-area-thumb");
        if (viewport == undefined || content == undefined || scrollbar == undefined || thumb == undefined) {
            return;
        }
        controller.attach({ root: element, viewport, content, scrollbar, thumb });
    };
    return h(
        `${selector}.scroll-area`,
        {
            hook: {
                insert: (vnode) => attach(vnode.elm as HTMLElement),
                postpatch: (_oldVnode, vnode) => attach(vnode.elm as HTMLElement),
                destroy: () => controller.detach()
            }
        },
        [
            h("div.scroll-area-viewport", [h("div.scroll-area-content", children)]),
            h("div.scroll-area-scrollbar", [h("div.scroll-area-thumb")])
        ]
    );
}

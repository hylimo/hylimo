import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import { AlertTriangle } from "lucide";
import { generateIcon } from "./icon.js";
import type { Toolbox } from "../toolbox.js";

/**
 * Generates the error display UI.
 *
 * @param context The toolbox context
 * @returns The error display UI
 */
export function generateErrorDisplay(context: Toolbox): VNode | undefined {
    if (!context.errorState || context.errorState.diagnostics.length === 0) {
        return undefined;
    }
    return h("div.toolbox-errors", [
        h("div.toolbox-errors-container", [
            h("div.toolbox-error-button.toolbox-icon-button", [generateIcon(AlertTriangle)]),
            h(
                "div.error-list",
                context.errorState.diagnostics.map((d) => h("div.error-item", d.message))
            )
        ])
    ]);
}

import type { MarkdownRenderer, MarkdownOptions } from "vitepress";

function config(renderer: MarkdownRenderer) {
    const defaultRenderer = renderer.renderer.rules.fence;

    if (defaultRenderer == undefined) {
        throw new Error("defaultRenderer is undefined");
    }

    renderer.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const langauge = token.info.trim();
        if (langauge === "hylimo") {
            return `<EmbeddedHylimoEditor code="${encodeURIComponent(token.content)}"/>`;
        }

        return defaultRenderer(tokens, idx, options, env, self);
    };
}

export default {
    config
} satisfies MarkdownOptions;

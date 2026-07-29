import { inject, ref, watch, type Ref } from "vue";
import {
    DidCloseTextDocumentNotification,
    DidOpenTextDocumentNotification
} from "vscode-languageserver-protocol/browser";
import { DiagramRequest } from "@hylimo/diagram-protocol";
import { SVGRenderer } from "@hylimo/diagram-render-svg";
import { useData } from "vitepress";
import { languageClientKey, languageServerConfigKey } from "../theme/injectionKeys";
import { language } from "../theme/lspPlugin";

/**
 * The uri of the document used to render previews.
 * A single document is reused for all previews, as the resources associated with a document
 * are not released completely when it is closed.
 */
const previewDocumentUri = "hylimo-preview:///preview.hyl";

/**
 * Renderer used to convert a rendered diagram to an svg string.
 */
const svgRenderer = new SVGRenderer();

/**
 * Provides rendered previews of diagrams which are not currently open in the editor.
 */
export interface DiagramPreviewProvider {
    /**
     * Renders a preview of the provided diagram source.
     * Results are cached, meaning rendering the same source twice is free.
     *
     * @param code the source of the diagram to render
     * @returns the rendered diagram as an svg string, or undefined if it could not be rendered
     */
    getPreview(code: string): Promise<string | undefined>;
    /**
     * Incremented whenever the cached previews become outdated, e.g. because the theme changed.
     * Consumers should re-request the previews they display when this changes.
     */
    revision: Ref<number>;
}

/**
 * Creates a provider for rendered diagram previews.
 * Previews are rendered by opening the diagram on the language server like a regular document,
 * requesting the resulting diagram, and closing the document again.
 * Must be called during setup, as it relies on the language client and language server config injections.
 *
 * @returns the created provider
 */
export function useDiagramPreviewProvider(): DiagramPreviewProvider {
    const languageClient = inject(languageClientKey)!;
    const languageServerConfig = inject(languageServerConfigKey)!;
    const { isDark } = useData();
    const cache = new Map<string, Promise<string | undefined>>();
    const revision = ref(0);
    let pending: Promise<unknown> = Promise.resolve();

    watch(
        [isDark, languageServerConfig.diagramConfig],
        () => {
            cache.clear();
            revision.value++;
        },
        { deep: true }
    );

    async function renderPreview(code: string): Promise<string | undefined> {
        const client = await languageClient.value;
        await client.sendNotification(DidOpenTextDocumentNotification.type, {
            textDocument: { uri: previewDocumentUri, languageId: language, version: 1, text: code }
        });
        try {
            const response = await client.sendRequest(DiagramRequest.type, { diagramUri: previewDocumentUri });
            const root = response.diagram?.rootElement;
            if (root == undefined) {
                return undefined;
            }
            return await svgRenderer.render(root, false);
        } finally {
            await client.sendNotification(DidCloseTextDocumentNotification.type, {
                textDocument: { uri: previewDocumentUri }
            });
        }
    }

    function getPreview(code: string): Promise<string | undefined> {
        const cached = cache.get(code);
        if (cached != undefined) {
            return cached;
        }
        // all previews share a single document, so they must not be rendered concurrently
        const preview = pending.then(() => renderPreview(code)).catch(() => undefined);
        pending = preview;
        cache.set(code, preview);
        return preview;
    }

    return { getPreview, revision };
}

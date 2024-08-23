import { computed, InjectionKey, Plugin, ShallowRef, shallowRef, toRaw, watch } from "vue";
import {
    BrowserMessageReader,
    BrowserMessageWriter,
    createProtocolConnection,
    NotificationHandler,
    NotificationType,
    Disposable
} from "vscode-languageserver-protocol/browser.js";
import { MonacoLanguageClient } from "monaco-languageclient";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import {
    ConfigNotification,
    DynamicLanguageServerConfig,
    RemoteNotification,
    RemoteRequest,
    SetLanguageServerIdNotification
} from "@hylimo/diagram-protocol";
import { initServices } from "monaco-languageclient/vscode/services";
import { checkServiceConsistency, configureServices } from "monaco-editor-wrapper/vscode/services";
import * as monaco from "monaco-editor";
import { customDarkTheme, customLightTheme, languageConfiguration, monarchTokenProvider } from "../util/language";
import { useData } from "vitepress";
import { useLocalStorage } from "@vueuse/core";
import { useWorkerFactory } from "monaco-editor-wrapper/workerFactory";
import monacoEditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

/**
 * A key for the language client in the Vue app.
 */
export const languageClientKey = Symbol("languageClient") as InjectionKey<ShallowRef<Promise<LanguageClientProxy>>>;

/**
 * The language identifier for the SyncScript language.
 */
export const language = "syncscript";

/**
 * A plugin that provides a language client for the SyncScript language.
 * In particular, it configures the monaco editor (globally) and sets up the language client.
 * The language client is provided under the `languageClientKey` injection key.
 */
export const lspPlugin: Plugin = {
    install(app) {
        const languageServerSettings = useLocalStorage("languageServerSettings", {});
        const languageServerConfig = computed<DynamicLanguageServerConfig>(() => {
            return {
                diagramConfig: {
                    theme: isDark.value ? "dark" : "light"
                },
                settings: languageServerSettings.value
            };
        });
        const isDark = app.runWithContext(() => {
            const data = useData();
            return data.isDark;
        });

        const client = setupLanguageClient(isDark.value);
        app.provide(languageClientKey, shallowRef(client));

        client.then((value) => {
            watch(isDark, (value) => {
                monaco.editor.setTheme(value ? "custom-dark" : "custom-light");
            });
            watch(
                languageServerConfig,
                () => {
                    const configValue = languageServerConfig.value;
                    if (value) {
                        value.sendNotification(ConfigNotification.type, {
                            diagramConfig: toRaw(configValue.diagramConfig),
                            settings: toRaw(configValue.settings)
                        });
                    }
                },
                { deep: true, immediate: true }
            );
        });
    }
};

/**
 * Sets up the language client for the SyncScript language.
 *
 * @param isDark whether the theme is dark
 * @returns a promise that resolves to a proxy for the language client
 */
async function setupLanguageClient(isDark: boolean) {
    const [worker, secondaryWorker] = [0, 1].map(
        () => new Worker(new URL("../util/languageServer.ts", import.meta.url), { type: "module" })
    );
    const secondaryConnection = createProtocolConnection(
        new BrowserMessageReader(secondaryWorker),
        new BrowserMessageWriter(secondaryWorker)
    );
    secondaryConnection.listen();

    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);

    useWorkerFactory({
        ignoreMapping: true,
        workerLoaders: {
            editorWorkerService: () => new monacoEditorWorker()
        }
    });
    const serviceConfig = await configureServices({});
    await initServices({
        serviceConfig,
        caller: "website",
        performChecks: checkServiceConsistency
    });

    monaco.languages.register({ id: language });
    monaco.languages.setLanguageConfiguration(language, languageConfiguration);
    monaco.languages.setMonarchTokensProvider(language, monarchTokenProvider);
    monaco.editor.defineTheme("custom-light", customLightTheme);
    monaco.editor.defineTheme("custom-dark", customDarkTheme);
    monaco.editor.setTheme(isDark ? "custom-dark" : "custom-light");

    const client = new MonacoLanguageClient({
        name: "SyncScript Language Client",
        clientOptions: {
            documentSelector: [{ language }],
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart })
            }
        },
        connectionProvider: {
            get: () => {
                return Promise.resolve({ reader, writer });
            }
        }
    });

    await client.start();

    client.onNotification(RemoteNotification.type, (message) => {
        secondaryConnection.sendNotification(RemoteNotification.type, message);
    });
    secondaryConnection.onNotification(RemoteNotification.type, (message) => {
        client.sendNotification(RemoteNotification.type, message);
    });
    client.onRequest(RemoteRequest.type, async (request) => {
        return secondaryConnection.sendRequest(RemoteRequest.type, request);
    });
    secondaryConnection.onRequest(RemoteRequest.type, (request) => {
        return client.sendRequest(RemoteRequest.type, request);
    });
    secondaryConnection.sendNotification(SetLanguageServerIdNotification.type, 1);

    return new LanguageClientProxy(client);
}

/**
 * A proxy for the language client that allows for multiple subscriptions to the same notification type.
 */
class LanguageClientProxy {
    /**
     * A map of notification handlers for each method.
     */
    private readonly handlers: Map<string, Set<NotificationHandler<any>>> = new Map();

    /**
     * Creates a new LanguageClientProxy with the given client.
     *
     * @param client the language client to proxy to
     */
    constructor(private readonly client: MonacoLanguageClient) {}

    /**
     * @see MonacoLanguageClient.onNotification
     */
    onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable {
        if (!this.handlers.has(type.method)) {
            this.handlers.set(type.method, new Set());
            this.client.onNotification(type, (params) => {
                this.handlers.get(type.method)?.forEach((handler) => handler(params));
            });
        }
        this.handlers.get(type.method)?.add(handler);
        return {
            dispose: () => {
                this.handlers.get(type.method)?.delete(handler);
            }
        };
    }

    /**
     * @see MonacoLanguageClient.sendNotification
     */
    sendNotification<P>(type: NotificationType<P>, params?: P): Promise<void> {
        return this.client.sendNotification(type, params);
    }
}

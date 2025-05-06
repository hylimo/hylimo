import type { Plugin, Ref } from "vue";
import { computed, ref, shallowRef, toRaw, watch } from "vue";
import type { NotificationHandler, NotificationType, Disposable } from "vscode-languageserver-protocol/browser.js";
import {
    BrowserMessageReader,
    BrowserMessageWriter,
    createProtocolConnection
} from "vscode-languageserver-protocol/browser.js";
import { MonacoLanguageClient } from "monaco-languageclient";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import type { DynamicLanguageServerConfig, EditorConfig, LanguageServerSettings } from "@hylimo/diagram-protocol";
import {
    ConfigNotification,
    UpdateEditorConfigNotification,
    RemoteNotification,
    RemoteRequest,
    SetLanguageServerIdNotification
} from "@hylimo/diagram-protocol";
import * as monaco from "monaco-editor";
import { customDarkTheme, customLightTheme, languageConfiguration, monarchTokenProvider } from "../util/language";
import { useData } from "vitepress";
import { useLocalStorage, throttledWatch } from "@vueuse/core";
import monacoEditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { languageServerConfigKey, languageClientKey, diagramIdProviderKey } from "./injectionKeys";
import { ConsoleLogger } from "monaco-languageclient/tools";
import { augmentVscodeApiConfig, checkServiceConsistency } from "monaco-editor-wrapper/vscode/services";
import { useWorkerFactory } from "monaco-languageclient/workerFactory";
import { LogLevel } from "@codingame/monaco-vscode-api";
import { initServices } from "monaco-languageclient/vscode/services";

/**
 * Config for the diagram
 */
export interface DiagramConfig {
    /**
     * Primary color for light theme
     */
    lightPrimaryColor: string;
    /**
     * Background color for light theme
     */
    lightBackgroundColor: string;
    /**
     * Primary color for dark theme
     */
    darkPrimaryColor: string;
    /**
     * Background color for dark theme
     */
    darkBackgroundColor: string;
    /**
     * Whether to enable font subsetting
     */
    enableFontSubsetting: boolean;
    /**
     * Whether to enable external fonts
     */
    enableExternalFonts: boolean;
}

/**
 * Config for the Hylimo language server.
 */
export interface LanguageServerConfig {
    /**
     * Settings, primarily for graphical interaction
     */
    settings: Ref<LanguageServerSettings>;
    /**
     * Diagram configuration
     */
    diagramConfig: Ref<DiagramConfig>;
    /**
     * Graphical editor configuration
     */
    editorConfig: Ref<EditorConfig>;
}

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
        const languageServerSettings = useLocalStorage<LanguageServerSettings>(
            "languageServerSettings",
            {
                translationPrecision: 1,
                resizePrecision: 1,
                linePointPosPrecision: 0.001,
                linePointDistancePrecision: 0.1,
                axisAlignedPosPrecision: 0.001,
                rotationPrecision: 1
            },
            { mergeDefaults: true }
        );
        const diagramConfig = useLocalStorage<DiagramConfig>(
            "diagramConfig",
            {
                lightPrimaryColor: "#000000",
                lightBackgroundColor: "#ffffff",
                darkPrimaryColor: "#ffffff",
                darkBackgroundColor: "#1e1e1e",
                enableFontSubsetting: true,
                enableExternalFonts: false
            },
            { mergeDefaults: true }
        );
        const editorConfig = useLocalStorage<EditorConfig>(
            "editorConfig",
            {
                toolboxEnabled: true,
                snappingEnabled: true,
                gridEnabled: true
            },
            { mergeDefaults: true }
        );
        app.provide(languageServerConfigKey, {
            settings: languageServerSettings,
            diagramConfig,
            editorConfig
        });
        const languageServerConfig = computed<DynamicLanguageServerConfig>(() => {
            return {
                diagramConfig: {
                    theme: isDark.value ? "dark" : "light",
                    primaryColor: isDark.value
                        ? diagramConfig.value.darkPrimaryColor
                        : diagramConfig.value.lightPrimaryColor,
                    backgroundColor: isDark.value
                        ? diagramConfig.value.darkBackgroundColor
                        : diagramConfig.value.lightBackgroundColor,
                    enableFontSubsetting: diagramConfig.value.enableFontSubsetting,
                    enableExternalFonts: diagramConfig.value.enableExternalFonts
                },
                settings: languageServerSettings.value,
                editorConfig: editorConfig.value
            };
        });
        const isDark = app.runWithContext(() => {
            const data = useData();
            return data.isDark;
        });

        const client = setupLanguageClient(isDark.value);
        const idCounter = ref(1);
        app.provide(languageClientKey, shallowRef(client));
        app.provide(diagramIdProviderKey, () => idCounter.value++);

        client.then((value) => {
            value.onNotification(UpdateEditorConfigNotification.type, (config) => {
                editorConfig.value = config;
            });
            watch(isDark, (value) => {
                monaco.editor.setTheme(value ? "custom-dark" : "custom-light");
            });
            throttledWatch(
                languageServerConfig,
                () => {
                    const configValue = languageServerConfig.value;
                    if (value) {
                        value.sendNotification(ConfigNotification.type, {
                            diagramConfig: toRaw(configValue.diagramConfig),
                            settings: toRaw(configValue.settings),
                            editorConfig: toRaw(configValue.editorConfig)
                        });
                    }
                },
                { deep: true, immediate: true, leading: true, trailing: true, throttle: 500 }
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

    const vscodeApiConfig = await augmentVscodeApiConfig("classic", {
        vscodeApiConfig: {},
        logLevel: LogLevel.Warning
    });
    await initServices(vscodeApiConfig, {
        caller: "website",
        performServiceConsistencyChecks: checkServiceConsistency,
        monacoWorkerFactory: () => {
            useWorkerFactory({
                workerLoaders: {
                    TextEditorWorker: () => new monacoEditorWorker()
                }
            });
        },
        logger: new ConsoleLogger(LogLevel.Warning)
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
        messageTransports: { reader, writer }
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
export class LanguageClientProxy {
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

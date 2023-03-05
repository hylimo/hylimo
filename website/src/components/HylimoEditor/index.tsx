import "reflect-metadata";
import { Allotment } from "allotment";
import React, { useEffect, useRef, useState } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import "allotment/dist/style.css";
import { customDarkTheme, customLightTheme, languageConfiguration, monarchTokenProvider } from "./language";
import {
    MonacoLanguageClient,
    CloseAction,
    ErrorAction,
    MonacoServices,
    MessageTransports
} from "monaco-languageclient";
import {
    BrowserMessageReader,
    BrowserMessageWriter,
    createProtocolConnection
} from "vscode-languageserver-protocol/browser.js";
import { StandaloneServices } from "vscode/services";
import MonacoEditor from "react-monaco-editor";
import { useLocalStorage } from "@rehooks/local-storage";
import { createContainer } from "@hylimo/diagram-ui";
import { ActionHandlerRegistry, IActionDispatcher, TYPES } from "sprotty";
import { RequestModelAction, ActionMessage } from "sprotty-protocol";
import {
    ConfigNotification,
    DiagramActionNotification,
    DiagramOpenNotification,
    RemoteNotification,
    RemoteRequest,
    SetLanguageServerIdNotification
} from "@hylimo/diagram-protocol";
import { DiagramServerProxy, ResetCanvasBoundsAction } from "@hylimo/diagram-ui";
import useResizeObserver from "@react-hook/resize-observer";
import { DynamicLanuageServerConfig } from "@hylimo/diagram-protocol";

/**
 * Name of the language
 */
const language = "syncscript";

/**
 * The uri of the TextDocument
 */
const uri = "inmemory://model/1";

/**
 * Editor Component
 *
 * @returns the created editor component
 */
export default function HylimoEditor(): JSX.Element {
    const { colorMode } = useColorMode();
    const [code, setCode] = useLocalStorage<string>("code");
    const sprottyWrapper = useRef(null);
    const [actionDispatcher, setActionDispatcher] = useState<IActionDispatcher | undefined>();
    const [languageClient, setLanguageClient] = useState<MonacoLanguageClient | undefined>();
    const [languageServerConfig, setLanguageServerConfig] = useState<DynamicLanuageServerConfig>({
        diagramConfig: {
            theme: colorMode
        }
    });

    useEffect(() => {
        StandaloneServices.initialize({});
        MonacoServices.install();
        const worker = new Worker(new URL("./languageServer.ts", import.meta.url));
        const secondaryWorker = new Worker(new URL("./languageServer.ts", import.meta.url));
        const secondaryConnection = createProtocolConnection(
            new BrowserMessageReader(secondaryWorker),
            new BrowserMessageWriter(secondaryWorker)
        );
        secondaryConnection.listen();
        const reader = new BrowserMessageReader(worker);
        const writer = new BrowserMessageWriter(worker);
        const languageClient = createLanguageClient({ reader, writer });
        setLanguageClient(languageClient);
        languageClient.start().then(() => {
            languageClient.sendNotification(DiagramOpenNotification.type, {
                clientId: uri,
                diagramUri: uri
            });

            class LspDiagramServerProxy extends DiagramServerProxy {
                override clientId = uri;

                override initialize(registry: ActionHandlerRegistry): void {
                    super.initialize(registry);
                    languageClient.onNotification(DiagramActionNotification.type, (message) => {
                        this.messageReceived(message);
                    });
                    languageClient.onNotification(RemoteNotification.type, (message) => {
                        secondaryConnection.sendNotification(RemoteNotification.type, message);
                    });
                    secondaryConnection.onNotification(RemoteNotification.type, (message) => {
                        languageClient.sendNotification(RemoteNotification.type, message);
                    });
                    languageClient.onRequest(RemoteRequest.type, async (request) => {
                        return secondaryConnection.sendRequest(RemoteRequest.type, request);
                    });
                    secondaryConnection.onRequest(RemoteRequest.type, (request) => {
                        return languageClient.sendRequest(RemoteRequest.type, request);
                    });
                    secondaryConnection.sendNotification(SetLanguageServerIdNotification.type, 1);
                }

                protected override sendMessage(message: ActionMessage): void {
                    languageClient.sendNotification(DiagramActionNotification.type, message);
                }
            }

            const container = createContainer("sprotty-container");
            container.bind(LspDiagramServerProxy).toSelf().inSingletonScope();
            container.bind(TYPES.ModelSource).toService(LspDiagramServerProxy);
            const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);
            actionDispatcher.request(RequestModelAction.create()).then((response) => {
                actionDispatcher.dispatch(response);
            });
            setActionDispatcher(actionDispatcher);
        });
    }, []);

    useResizeObserver(sprottyWrapper, () => {
        const action: ResetCanvasBoundsAction = {
            kind: ResetCanvasBoundsAction.KIND
        };
        actionDispatcher?.dispatch(action);
    });

    useEffect(() => {
        setLanguageServerConfig((currentConfig) => {
            return {
                ...currentConfig,
                diagramConfig: {
                    ...currentConfig.diagramConfig,
                    theme: colorMode
                }
            };
        });
    }, [colorMode]);

    useEffect(() => {
        languageClient?.sendNotification(ConfigNotification.type, languageServerConfig);
    }, [languageServerConfig]);

    return (
        <Allotment>
            <Allotment.Pane>
                <MonacoEditor
                    options={{
                        automaticLayout: true,
                        fixedOverflowWidgets: true,
                        hover: {
                            above: false
                        },
                        suggest: {
                            snippetsPreventQuickSuggestions: false
                        }
                    }}
                    theme={colorMode === "dark" ? "custom-dark" : "custom-light"}
                    editorWillMount={(editor) => {
                        editor.languages.register({ id: language });
                        editor.languages.setLanguageConfiguration(language, languageConfiguration as any);
                        editor.languages.setMonarchTokensProvider(language, monarchTokenProvider as any);
                        editor.editor.defineTheme("custom-dark", customDarkTheme as any);
                        editor.editor.defineTheme("custom-light", customLightTheme as any);
                    }}
                    language={language}
                    value={code}
                    onChange={setCode}
                ></MonacoEditor>
            </Allotment.Pane>
            <Allotment.Pane>
                <div ref={sprottyWrapper} className="sprotty-wrapper">
                    <div id="sprotty-container"></div>
                </div>
            </Allotment.Pane>
        </Allotment>
    );
}

/**
 * Creates the language client
 *
 * @param transports used for the JSON rpc
 * @returns the crated MonacoLangaugeClient
 */
function createLanguageClient(transports: MessageTransports): MonacoLanguageClient {
    return new MonacoLanguageClient({
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
                return Promise.resolve(transports);
            }
        }
    });
}

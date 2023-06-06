import "reflect-metadata";
import { Allotment } from "allotment";
import React, { useContext, useEffect, useRef, useState } from "react";
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
import { DynamicLanguageServerConfig } from "@hylimo/diagram-protocol";
import { GlobalStateContext } from "../../theme/Root";
import { Root } from "@hylimo/diagram-common";
import { PublishDocumentRevealNotification } from "@hylimo/diagram-protocol";
import SettingsDialog from "../SettingsDialog";

/**
 * Name of the language
 */
const language = "syncscript";

/**
 * Editor Component
 *
 * @returns the created editor component
 */
export default function HylimoEditor(): JSX.Element {
    const { setDiagram, setDiagramCode, showSettings, settings } = useContext(GlobalStateContext);
    const { colorMode } = useColorMode();
    const [code, setCode] = useLocalStorage<string>("code");
    const sprottyWrapper = useRef(null);
    const monaco = useRef<MonacoEditor | null>(null);
    const [actionDispatcher, setActionDispatcher] = useState<IActionDispatcher | undefined>();
    const [languageClient, setLanguageClient] = useState<MonacoLanguageClient | undefined>();
    const [languageServerConfig, setLanguageServerConfig] = useState<DynamicLanguageServerConfig>({
        diagramConfig: {
            theme: colorMode
        },
        settings: {}
    });

    useEffect(() => {
        setDiagramCode(code);
        StandaloneServices.initialize({});
        MonacoServices.install();
        const [worker, secondaryWorker] = [0, 1].map(() => new Worker(new URL("./languageServer.ts", import.meta.url)));
        const secondaryConnection = createProtocolConnection(
            new BrowserMessageReader(secondaryWorker),
            new BrowserMessageWriter(secondaryWorker)
        );
        secondaryConnection.listen();
        const reader = new BrowserMessageReader(worker);
        const writer = new BrowserMessageWriter(worker);
        const languageClient = createLanguageClient({ reader, writer });
        languageClient.onNotification(PublishDocumentRevealNotification.type, (message) => {
            const editor = monaco.current?.editor;
            if (editor) {
                const range = message.range;
                const editorRange = {
                    startLineNumber: range.start.line + 1,
                    startColumn: range.start.character + 1,
                    endLineNumber: range.end.line + 1,
                    endColumn: range.end.character + 1
                };
                editor.setSelection(editorRange);
                editor.revealRange(editorRange);
            }
        });
        setLanguageClient(languageClient);
        languageClient.start().then(() => {
            const uri = monaco.current?.editor?.getModel()?.uri?.toString();
            if (uri == undefined) {
                throw new Error("Missing editor or model");
            }
            languageClient.sendNotification(DiagramOpenNotification.type, {
                clientId: uri,
                diagramUri: uri
            });

            class LspDiagramServerProxy extends DiagramServerProxy {
                override clientId = uri!;

                override initialize(registry: ActionHandlerRegistry): void {
                    super.initialize(registry);
                    languageClient.onNotification(DiagramActionNotification.type, (message) => {
                        if ("newRoot" in message.action && message.action.newRoot != undefined) {
                            setDiagram(message.action.newRoot as Root);
                        }
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
        return () => {
            worker.terminate();
            secondaryWorker.terminate();
        };
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
        setLanguageServerConfig((currentConfig) => {
            return {
                ...currentConfig,
                settings: settings
            };
        });
    }, [settings]);

    useEffect(() => {
        languageClient?.sendNotification(ConfigNotification.type, languageServerConfig);
    }, [languageServerConfig]);

    useEffect(() => () => setDiagram(null), []);

    return (
        <>
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
                        ref={monaco}
                        language={language}
                        value={code}
                        onChange={(code) => {
                            setCode(code);
                            setDiagramCode(code);
                        }}
                    ></MonacoEditor>
                </Allotment.Pane>
                <Allotment.Pane>
                    <div ref={sprottyWrapper} className="sprotty-wrapper">
                        <div id="sprotty-container"></div>
                    </div>
                </Allotment.Pane>
            </Allotment>
            {showSettings && <SettingsDialog />}
        </>
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

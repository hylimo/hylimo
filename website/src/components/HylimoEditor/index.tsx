import "reflect-metadata";
import { Allotment } from "allotment";
import React, { useEffect } from "react";
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
import { BrowserMessageReader, BrowserMessageWriter } from "vscode-languageserver-protocol/browser.js";
import { StandaloneServices } from "vscode/services";
import MonacoEditor from "react-monaco-editor";
import { useLocalStorage } from "@rehooks/local-storage";
import { createContainer } from "@hylimo/diagram-ui";
import { ActionHandlerRegistry, IActionDispatcher, TYPES } from "sprotty";
import { RequestModelAction, ActionMessage } from "sprotty-protocol";
import { DiagramActionNotification, DiagramOpenNotification } from "@hylimo/language-server";
import { DiagramServerProxy } from "@hylimo/diagram-ui";

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

    useEffect(() => {
        StandaloneServices.initialize({});
        MonacoServices.install();
        const worker = new Worker(new URL("./languageServer.ts", import.meta.url));
        const reader = new BrowserMessageReader(worker);
        const writer = new BrowserMessageWriter(worker);
        const languageClient = createLanguageClient({ reader, writer });
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
        });
    }, []);

    return (
        <Allotment>
            <Allotment.Pane>
                <MonacoEditor
                    options={{
                        automaticLayout: true,
                        fixedOverflowWidgets: true,
                        hover: {
                            above: false
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
                <div id="sprotty-container"></div>
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

import { Allotment } from "allotment";
import React from "react";
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
    const { colorMode } = useColorMode();

    return (
        <Allotment>
            <Allotment.Pane>
                <MonacoEditor
                    options={{
                        automaticLayout: true
                    }}
                    theme={colorMode === "dark" ? "custom-dark" : "custom-light"}
                    editorWillMount={(editor) => {
                        editor.languages.register({ id: language });
                        editor.languages.setLanguageConfiguration(language, languageConfiguration as any);
                        editor.languages.setMonarchTokensProvider(language, monarchTokenProvider as any);
                        editor.editor.defineTheme("custom-dark", customDarkTheme as any);
                        editor.editor.defineTheme("custom-light", customLightTheme as any);

                        StandaloneServices.initialize({});
                        MonacoServices.install();
                        const worker = new Worker(new URL("./languageServer.ts", import.meta.url));
                        const reader = new BrowserMessageReader(worker);
                        const writer = new BrowserMessageWriter(worker);
                        const languageClient = createLanguageClient({ reader, writer });
                        languageClient.start();
                    }}
                    editorWillUnmount={(editor) => {}}
                    language={language}
                ></MonacoEditor>
            </Allotment.Pane>
            <Allotment.Pane>
                <div>Hello world</div>
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

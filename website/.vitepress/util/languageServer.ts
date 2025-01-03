import { createConnection, BrowserMessageReader, BrowserMessageWriter } from "vscode-languageserver/browser.js";
import { LanguageServer } from "@hylimo/language-server";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const languageServer = new LanguageServer({
    defaultConfig: {
        diagramConfig: {
            theme: "dark",
            primaryColor: "#ffffff",
            backgroundColor: "#1e1e1e",
            enableFontSubsetting: true,
            enableExternalFonts: false
        },
        settings: {},
        editorConfig: {
            toolboxDisabled: false
        }
    },
    connection,
    additionalInterpreterModules: [],
    maxExecutionSteps: 1000000
});
languageServer.listen();

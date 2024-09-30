import { createConnection, BrowserMessageReader, BrowserMessageWriter } from "vscode-languageserver/browser.js";
import { LanguageServer } from "@hylimo/language-server";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const languageServer = new LanguageServer({
    defaultConfig: {
        diagramConfig: {
            theme: "dark"
        },
        settings: {}
    },
    connection,
    additionalInterpreterModules: [],
    maxExecutionSteps: 1000000
});
languageServer.listen();

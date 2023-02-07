import { createConnection, BrowserMessageReader, BrowserMessageWriter } from "vscode-languageserver/browser.js";
import { LanguageServer } from "@hylimo/language-server";
import { classDiagramModule } from "@hylimo/diagram";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const languageServer = new LanguageServer({
    connection,
    additionalInterpreterModules: [classDiagramModule],
    maxExecutionSteps: 1000000
});
languageServer.listen();

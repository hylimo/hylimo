import { createConnection, BrowserMessageReader, BrowserMessageWriter } from "vscode-languageserver/browser.js";
import { LanguageServer } from "@hylimo/language-server";
import { defaultModules } from "@hylimo/core";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const languageServer = new LanguageServer({
    connection,
    interpreterModules: defaultModules
});
languageServer.listen();

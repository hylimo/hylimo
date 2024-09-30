import { Range } from "@hylimo/core";
import { CompletionItem as LspCompletionItem } from "vscode-languageserver";

/**
 * Completion item with a text edit based on an AST range (instead of an LSP range)
 */
export type CompletionItem = Omit<LspCompletionItem, "textEdit"> & {
    textEdit: {
        text: string;
        range: Range;
    };
};

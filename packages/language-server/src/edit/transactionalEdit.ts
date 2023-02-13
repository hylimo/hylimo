import { LayoutedDiagram } from "@hylimo/diagram";
import { Action } from "sprotty-protocol";
import {
    Range,
    TextDocumentEdit,
    VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent
} from "vscode-languageserver";
import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { EditGenerator } from "./generators/editGenerator";

/**
 * Handles transaction al edits to a TextDocument
 *
 * @param T the type of action which is handled
 */
export abstract class TransactionalEdit<T extends Action> {
    /**
     * Version of the TextDocument to apply the edit to
     */
    version: number;

    /**
     * Generates a new TransactionalEdit
     *
     * @param generatorEntries the entries which generate the edit foreach action
     * @param diagram associated diagram
     */
    constructor(private readonly generatorEntries: EditGeneratorEntry[], private readonly textDocument: TextDocument) {
        generatorEntries.sort((a, b) => a.start - b.start);
        for (let i = 1; i < generatorEntries.length; i++) {
            if (generatorEntries[i - 1].end > generatorEntries[i].start) {
                throw new Error("Overlapping edit generators");
            }
        }
        this.version = textDocument.version;
    }

    /**
     * Applies the action to the specified EditGenerator and returns the new string
     *
     * @param action the action to apply
     * @param generator the EditGenerator to use
     * @param meta additional metadata from the entry
     * @returns the new string
     */
    abstract applyActionToGenerator(action: T, generator: EditGenerator<never>, meta: any): string;

    /**
     * Predicts the effect of newest on layoutedDiagram assuming lastApplied was last applied
     *
     * @param layoutedDiagram the layouted diagram
     * @param lastApplied the last command applied to layoutedDiagram
     * @param newest the newest known command
     */
    abstract predictActionDiff(layoutedDiagram: LayoutedDiagram, lastApplied: T, newest: T): void;

    /**
     * Applies an action to all generators and creates a corresponding edit
     * @param action
     */
    applyAction(action: T): TextDocumentEdit {
        const edits = this.generatorEntries.map((entry) => {
            const newText = this.applyActionToGenerator(action, entry.generator, entry.meta);
            const result: TextEdit = {
                range: Range.create(this.textDocument.positionAt(entry.start), this.textDocument.positionAt(entry.end)),
                newText
            };
            return result;
        });
        const res = {
            textDocument: VersionedTextDocumentIdentifier.create(this.textDocument.uri, this.version),
            edits
        };
        this.version++;
        return res;
    }

    /**
     * Update the current entries based on the changes.
     * Updates indices.
     *
     * @param changes the changes to the text document
     */
    updateGeneratorEntries(changes: TextDocumentContentChangeEvent[]): void {
        for (const change of changes) {
            if (!TextDocumentContentChangeEvent.isIncremental(change)) {
                break;
            }
            const start = this.textDocument.offsetAt(change.range.start);
            const end = this.textDocument.offsetAt(change.range.end);
            const delta = change.text.length - (end - start);
            for (const entry of this.generatorEntries) {
                if (entry.start > end) {
                    entry.start += delta;
                    entry.end += delta;
                } else if (entry.start >= start) {
                    entry.end += delta;
                }
            }
        }
    }
}

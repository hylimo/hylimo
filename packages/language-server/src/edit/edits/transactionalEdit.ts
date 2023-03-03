import { IncrementalUpdate } from "@hylimo/diagram-protocol";
import { Action } from "sprotty-protocol";
import {
    Range,
    TextDocumentEdit,
    VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent
} from "vscode-languageserver";
import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import { EditGenerator } from "../generators/editGenerator";
import { GeneratorRegistry } from "../generators/generatorRegistry";
import { EditGeneratorEntry } from "./editGeneratorEntry";
import { BaseLayoutedDiagram } from "@hylimo/diagram";

/**
 * Handles transaction al edits to a TextDocument
 *
 * @param T the type of action which is handled
 */
export interface TransactionalEdit {
    readonly type: string;
    /**
     * Generators which are used to generate the text
     */
    readonly generatorEntries: EditGeneratorEntry[];
}

/**
 * A transactional edit with a version
 */
export type Versioned<T extends TransactionalEdit> = T & {
    /**
     * The version of the edit
     */
    version: number;
};

export namespace TransactionalEdit {
    /**
     * Update the current entries based on the changes.
     * Updates indices.
     *
     * @param edit the edit to update
     * @param changes the changes to the text document
     * @param textDocument the text document the changes were applied to
     */
    export function updateGeneratorEntries(
        edit: TransactionalEdit,
        changes: TextDocumentContentChangeEvent[],
        textDocument: TextDocument
    ): void {
        for (const change of changes) {
            if (!TextDocumentContentChangeEvent.isIncremental(change)) {
                break;
            }
            const start = textDocument.offsetAt(change.range.start);
            const end = textDocument.offsetAt(change.range.end);
            const delta = change.text.length - (end - start);
            for (const entry of edit.generatorEntries) {
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

/**
 * Handles transaction al edits to a TextDocument
 *
 * @param T the type of action which is handled
 */
export abstract class TransactionalEditEngine<A extends Action, T extends TransactionalEdit> {
    /**
     * Generates a new TransactionalEditEngine
     *
     * @param type the type of action which is handled
     * @param actionType the type of action which is handled
     * @param generatorRegistory the generator registry to use
     */
    constructor(readonly type: string, readonly actionType: string, readonly generatorRegistory: GeneratorRegistry) {}

    /**
     * Applies the action to the specified EditGenerator and returns the new string
     *
     * @param action the action to apply
     * @param generator the EditGenerator to use
     * @param meta additional metadata from the entry
     * @returns the new string
     */
    protected abstract applyActionToGenerator(edit: T, action: A, generator: EditGenerator, meta: any): string;

    /**
     * Predicts the effect of newest on layoutedDiagram assuming lastApplied was last applied
     *
     * @param layoutedDiagram the layouted diagram
     * @param lastApplied the last command applied to layoutedDiagram
     * @param newest the newest known command
     * @returns the incremental updates to apply
     */
    abstract predictActionDiff(
        edit: T,
        layoutedDiagram: BaseLayoutedDiagram,
        lastApplied: A | undefined,
        newest: A
    ): IncrementalUpdate[];

    /**
     * Applies an action to all generators and creates a corresponding edit
     * @param action
     */
    applyAction(edit: Versioned<T>, action: A, textDocument: TextDocument): TextDocumentEdit {
        const edits = edit.generatorEntries.map((entry) => {
            const newText = this.applyActionToGenerator(edit, action, entry.generator, entry.meta);
            const result: TextEdit = {
                range: Range.create(textDocument.positionAt(entry.start), textDocument.positionAt(entry.end)),
                newText
            };
            return result;
        });

        const res = {
            textDocument: VersionedTextDocumentIdentifier.create(textDocument.uri, edit.version),
            edits
        };
        edit.version++;
        return res;
    }
}

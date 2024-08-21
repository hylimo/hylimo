import { DynamicLanguageServerConfig, IncrementalUpdate, TransactionalAction } from "@hylimo/diagram-protocol";
import { EditEngine } from "./editEngine.js";
import { ReplaceEditEngine } from "./replaceEditEngine.js";
import { Diagram } from "../../diagram/diagram.js";
import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import {
    Position,
    Range,
    TextDocumentEdit,
    uinteger,
    VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent
} from "vscode-languageserver";
import { parseTemplate } from "./template.js";
import { groupBy } from "../../util/groupBy.js";
import { AddEditEngine } from "./addEditEngine.js";
import { AddEditSpecificationEntry, BaseLayoutedDiagram, EditSpecificationEntry } from "@hylimo/diagram-common";
import { EditHandlerRegistry } from "../handlers/editHandlerRegistry.js";

/**
 * Transaction edit handling transaction actions
 */
export class TransactionalEdit {
    /**
     * Id of the transaction
     */
    readonly transactionId: string;

    /**
     * The sequence number of the initial action
     */
    readonly initialSequenceNumber: number;

    /**
     * Edit engines for the transaction
     */
    readonly engines: EditEngine[] = [];

    /**
     * Text edits applied only on the first update of the transaction
     * Contains additional edits for add edit engines
     */
    readonly initialTextEdits: TextEdit[] = [];

    /**
     * Creates a new transactional edit
     *
     * @param action the action this edit is based on
     * @param diagram the diagram affected by the action
     * @param registry the registry to use
     */
    constructor(
        private readonly action: TransactionalAction,
        private readonly diagram: Diagram,
        private readonly registry: EditHandlerRegistry
    ) {
        this.transactionId = action.transactionId;
        this.initialSequenceNumber = action.sequenceNumber;
        this.generateEngines();
    }

    /**
     * Applies the action and generates the text document edit based on it
     *
     * @param action the action to apply
     * @returns the text document edit
     */
    applyAction(action: TransactionalAction): TextDocumentEdit {
        const edits: TextEdit[] = [];
        if (action.sequenceNumber === this.initialSequenceNumber) {
            edits.push(...this.initialTextEdits);
        }
        const textDocument = this.diagram.document;
        for (const engine of this.engines) {
            const text = engine.apply(action.edits.map((edit) => edit.values));
            edits.push({
                range: Range.create(textDocument.positionAt(engine.start), textDocument.positionAt(engine.end)),
                newText: text
            });
        }
        return TextDocumentEdit.create(
            VersionedTextDocumentIdentifier.create(textDocument.uri, textDocument.version),
            edits
        );
    }

    /**
     * Update the engines based on the text document changes.
     * Updates indices.
     *
     * @param changes the changes to the text document
     */
    updateEngines(changes: TextDocumentContentChangeEvent[]): void {
        const textDocument = this.diagram.document;
        for (const change of changes) {
            if (!TextDocumentContentChangeEvent.isIncremental(change)) {
                break;
            }
            const start = textDocument.offsetAt(change.range.start);
            const end = textDocument.offsetAt(change.range.end);
            const delta = change.text.length - (end - start);
            for (const entry of this.engines) {
                if (entry.start > end) {
                    entry.start += delta;
                    entry.end += delta;
                } else if (entry.start >= start) {
                    entry.end += delta;
                }
            }
        }
    }

    /**
     * Predicts the action diff based on the layouted diagram and the last applied action
     * 
     * @param layoutedDiagram the layouted diagram to apply the prediction to
     * @param lastApplied the last applied action
     * @param newest the newest action
     * @returns the incremental updates generated by the prediction
     */
    predictActionDiff(
        layoutedDiagram: BaseLayoutedDiagram,
        lastApplied: TransactionalAction | undefined,
        newest: TransactionalAction
    ): IncrementalUpdate[] {
        const res: IncrementalUpdate[] = [];
        for (const edit of this.action.edits) {
            const elements = edit.elements!.map((id) => layoutedDiagram.elementLookup[id]);
            for (const type of edit.types!) {
                const handler = this.registry.getEditHandler(type);
                if (handler != undefined) {
                    res.push(...handler.predictActionDiff(layoutedDiagram, lastApplied, newest, elements));
                }
            }
        }
        return res;
    }

    /**
     * Transforms the action based on settings and other values
     * 
     * @param action the action to transform
     * @param config the language server config
     */
    transformEdit(
        action: TransactionalAction,
        config: DynamicLanguageServerConfig
    ): void {
        for (const edit of action.edits) {
            for (const type of edit.types!) {
                const handler = this.registry.getEditHandler(type);
                if (handler != undefined) {
                    handler.transformAction(action, config);
                }
            }
        }
    }

    /**
     * Generates edit engines for the given action
     */
    private generateEngines() {
        const textDocument = this.diagram.document;
        const edits = this.action.edits.flatMap((edit, index) => {
            const res = [];
            for (const elementId of edit.elements!) {
                const element = this.diagram.currentDiagram!.elementLookup[elementId];
                for (const type of edit.types!) {
                    res.push({
                        index,
                        spec: element.edits[type]
                    });
                }
            }
            return res;
        });
        edits.sort((a, b) => a.spec.range[0] - b.spec.range[0]);
        this.generateReplaceEdits(edits, textDocument);
        this.generateAddEdits(edits, textDocument);
    }

    /**
     * Generates replace edit engines for the given edits
     *
     * @param edits the sorted edits to generate engines for
     * @param textDocument the text document to use
     */
    private generateReplaceEdits(edits: IndexedModificationSpecificationEntry[], textDocument: TextDocument) {
        const replaceEdits = edits.filter((e) => e.spec.type === "replace");
        for (const edit of replaceEdits) {
            const indentation = this.extractIndentation(textDocument, edit.spec.range[0]);
            const parsedTemplate = parseTemplate(edit.spec.template, textDocument, indentation);
            this.engines.push(
                new ReplaceEditEngine(
                    edit.spec.range[0],
                    edit.spec.range[1],
                    { template: parsedTemplate, valuesIndex: edit.index },
                    indentation
                )
            );
        }
    }

    /**
     * Generates add edit engines for the given edits
     *
     * @param edits the sorted edits to generate engines for
     * @param textDocument the text document to use
     */
    private generateAddEdits(edits: IndexedModificationSpecificationEntry[], textDocument: TextDocument) {
        const addEdits = edits.filter((e) => e.spec.type === "add");
        for (const edits of groupBy(addEdits, (edit) => edit.spec.range[0]).values()) {
            const firstSpec = edits[0].spec as AddEditSpecificationEntry;
            const indentation = this.extractIndentation(textDocument, firstSpec.range[1]);
            this.generateAddInitialEdit(textDocument, firstSpec, indentation);
            const parsedTemplates = edits.map((edit) => {
                return {
                    template: parseTemplate(edit.spec.template, textDocument, indentation),
                    valuesIndex: edit.index
                };
            });
            this.engines.push(
                new AddEditEngine(edits[0].spec.range[0], edits[0].spec.range[1], parsedTemplates, indentation)
            );
        }
    }

    /**
     * Generates the initial edit for an add edit specification entry if needed.
     * This edit is required if the function is a single line function.
     * Then, a new line and indentation must be inserted before the first statement of the function.
     *
     * @param textDocument the text document to use
     * @param specification the add edit specification entry
     * @param indentation the indentation to use
     */
    private generateAddInitialEdit(
        textDocument: TextDocument,
        specification: AddEditSpecificationEntry,
        indentation: string
    ) {
        const replaceLine = textDocument.positionAt(specification.range[0]).line;
        const functionStartPos = textDocument.positionAt(specification.functionRange[0]);
        if (replaceLine === functionStartPos.line) {
            const functionStart = textDocument.getText(
                Range.create(functionStartPos, Position.create(functionStartPos.line, uinteger.MAX_VALUE))
            );
            const lengthToReplace = functionStart.match(/^{[^\S\n]*/)![0].length;
            this.initialTextEdits.push({
                range: Range.create(
                    functionStartPos,
                    textDocument.positionAt(specification.functionRange[0] + lengthToReplace)
                ),
                newText: "{\n" + indentation
            });
        }
    }

    /**
     * Extracts the indentation of the given line and returns it as a string.
     *
     * @param document the document from whicht to extract the line
     * @param line the line number
     * @returns the extracted indentation
     */
    private extractIndentation(document: TextDocument, offset: number): string {
        const line = document.positionAt(offset).line;
        const lineText = document.getText(Range.create(line, 0, line, uinteger.MAX_VALUE));
        const match = lineText.match(/^\s*/);
        if (match == null) {
            return "";
        } else {
            return match[0];
        }
    }
}

/**
 * Modification specification entry with an index
 */
interface IndexedModificationSpecificationEntry {
    index: number;
    spec: EditSpecificationEntry;
}

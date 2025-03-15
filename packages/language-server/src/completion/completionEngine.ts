import { Parser } from "@hylimo/core";
import { CompletionAstTransformer } from "./completionAstTransformer.js";
import { CompletionError } from "./completionError.js";
import type { CompletionItem } from "./completionItem.js";
import type { DiagramEngine } from "@hylimo/diagram";
import type { DiagramConfig } from "@hylimo/diagram-common";

/**
 * Completion engine which can generate completion items by executing the given code
 */
export class CompletionEngine {
    /**
     * Fault tolerant parser used to parse the code
     */
    private readonly parser = new Parser(true);

    /**
     * Creates a new CompletionEngine with the given interpreter and max execution steps
     *
     * @param diagramEngine the diagram engine to use
     */
    constructor(private readonly diagramEngine: DiagramEngine) {}

    /**
     * Generates completion items based on the given text and position
     *
     * @param text the code to execute
     * @param config the configuration to use
     * @param position the position of the cursor
     * @returns the generated complete items or undefined if no items could be generated
     */
    complete(text: string, config: DiagramConfig, position: number): CompletionItem[] | undefined {
        const parserResult = this.parser.parse(text);
        if (parserResult.ast == undefined) {
            return undefined;
        }
        const toExecutableTransformer = new CompletionAstTransformer(position);
        const executableAst = parserResult.ast.map((expression) => toExecutableTransformer.visit(expression));
        try {
            this.diagramEngine.execute(executableAst, config);
        } catch (e: any) {
            if (CompletionError.isCompletionError(e)) {
                return e.completionItems;
            } else {
                return undefined;
            }
        }
        return undefined;
    }
}

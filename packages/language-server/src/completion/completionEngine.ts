import { Parser } from "@hylimo/core";
import { ExecutableExpression } from "@hylimo/core";
import { Interpreter } from "@hylimo/core";
import { CompletionAstTransformer } from "./completionAstTransformer.js";
import { CompletionError } from "./completionError.js";
import { CompletionItem } from "./completionItem.js";

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
     * @param interpreter the interpreter to use
     */
    constructor(private readonly interpreter: Interpreter) {}

    /**
     * Generates completion items based on the given text and position
     *
     * @param text the code to execute
     * @param additionalExpressions additionally available variables for use in the completion that are not located within the given text
     * @param position the position of the cursor
     * @returns the generated complete items or undefined if no items could be generated
     */
    complete(
        text: string,
        additionalExpressions: ExecutableExpression[],
        position: number
    ): CompletionItem[] | undefined {
        const parserResult = this.parser.parse(text);
        if (parserResult.ast == undefined) {
            return undefined;
        }
        const toExecutableTransformer = new CompletionAstTransformer(position);
        const executableAst = parserResult.ast.map((expression) => toExecutableTransformer.visit(expression));
        try {
            this.interpreter.run([...additionalExpressions, ...executableAst]);
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

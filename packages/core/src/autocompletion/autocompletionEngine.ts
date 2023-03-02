import { Parser } from "../parser/parser";
import { Interpreter } from "../runtime/interpreter";
import { AutocompletionAstTransformer } from "./autocompletionAstTransformer";
import { AutocompletionError } from "./autocompletionError";
import { AutocompletionItem } from "./autocompletionItem";

/**
 * Autocompletion engine which can generate autocompletion items by executing the given code
 */
export class AutocompletionEngine {
    /**
     * Fault tolerant parser used to parse the code
     */
    private readonly parser = new Parser(true, true);

    /**
     * Creates a new AutocompletionEngine with the given interpreter and max execution steps
     *
     * @param interpreter the interpreter to use
     */
    constructor(private readonly interpreter: Interpreter) {}

    /**
     * Generates autocompletion items based on the given text and position
     *
     * @param text the code to execute
     * @param position the position of the cursor
     * @returns the generated autocomplete items or undefined if no items could be generated
     */
    autocomplete(text: string, position: number): AutocompletionItem[] | undefined {
        const parserResult = this.parser.parse(text);
        if (parserResult.ast == undefined) {
            return undefined;
        }
        const toExecutableTransformer = new AutocompletionAstTransformer(position);
        const executableAst = parserResult.ast.map((expression) => toExecutableTransformer.visit(expression));
        try {
            this.interpreter.run(executableAst);
        } catch (e: any) {
            if (AutocompletionError.isAutocompletionError(e)) {
                return e.autocompletionItems;
            } else {
                return undefined;
            }
        }
        return undefined;
    }
}

import { CstResult, InterpretationResult, Interpreter, Parser, RuntimeError, toExecutable } from "@hylimo/core";
import { LayoutEngine } from "./layout/layoutEngine";
import { DiagramConfig } from "@hylimo/diagram-common";
import { LayoutedDiagram } from "./layout/diagramLayoutResult";

/**
 * All errors that can occur during rendering of a diagram
 */
export interface RenderErrors extends Pick<CstResult, "lexingErrors" | "parserErrors"> {
    /**
     * Errors that occurred during the interpretation
     */
    interpreterErrors: RuntimeError[];
    /**
     * Errors that occurred during the layouting
     */
    layoutErrors: Error[];
}

export interface RenderResult {
    /**
     * The result of the parser
     */
    cstResult: CstResult;
    /**
     * The result of the interpreter
     */
    interpretationResult?: InterpretationResult;
    /**
     * All errors combined
     */
    errors: RenderErrors;
    /**
     * The final layouted diagram
     */
    layoutedDiagram?: LayoutedDiagram;
}

/**
 * A diagram engine that can render a diagram from source code and config using a parser, interpreter, and a layout engine
 */
export class DiagramEngine {
    /**
     * Creates a new DiagramEngine
     *
     * @param parser the parser to use
     * @param interpreter the interpreter to use
     * @param layoutEngine the layout engine to use
     */
    constructor(
        private readonly parser: Parser,
        private readonly interpreter: Interpreter,
        private readonly layoutEngine: LayoutEngine
    ) {}

    /**
     * Renders a diagram
     *
     * @param source the source to execute
     * @param config additional config
     * @returns the render result including the potential diagram and all errors
     */
    async render(source: string, config: DiagramConfig): Promise<RenderResult> {
        const parserResult = this.parser.parse(source);
        let interpretationResult: InterpretationResult | undefined = undefined;
        let layoutedDiagram: LayoutedDiagram | undefined = undefined;
        const layoutErrors: Error[] = [];
        if (parserResult.ast != undefined) {
            interpretationResult = this.interpreter.run(toExecutable(parserResult.ast));
            if (interpretationResult.result != undefined) {
                try {
                    layoutedDiagram = await this.layoutEngine.layout(interpretationResult.result);
                } catch (e: any) {
                    layoutErrors.push(e);
                }
            }
        }
        return {
            cstResult: parserResult,
            interpretationResult,
            layoutedDiagram,
            errors: {
                lexingErrors: parserResult.lexingErrors,
                parserErrors: parserResult.parserErrors,
                interpreterErrors: interpretationResult?.error != undefined ? [interpretationResult.error] : [],
                layoutErrors
            }
        };
    }
}

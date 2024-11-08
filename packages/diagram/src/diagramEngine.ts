import {
    CstResult,
    ExecutableExpression,
    InterpretationResult,
    Interpreter,
    InterpreterModule,
    Parser,
    RuntimeError,
    SemanticFieldNames,
    defaultModules,
    id,
    object,
    str,
    toExecutable
} from "@hylimo/core";
import { LayoutEngine } from "./layout/engine/layoutEngine.js";
import { DiagramConfig } from "@hylimo/diagram-common";
import { LayoutedDiagram } from "./layout/diagramLayoutResult.js";
import { createBaseDiagramModules, defaultDiagramModules } from "./module/diagramModules.js";
import { baseDiagramModule } from "./module/diagrams/baseDiagramModule.js";

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
     * The parser to use
     */
    private readonly parser = new Parser(false);
    /**
     * The interpreter to use
     */
    private readonly interpreter: Interpreter;
    /**
     * The layout engine to use
     */
    private readonly layoutEngine = new LayoutEngine();

    /**
     * Creates a new DiagramEngine
     *
     * @param additionalInterpreterModules additional modules to use in the interpreter
     * @param maxExecutionSteps the maximum number of execution steps
     */
    constructor(additionalInterpreterModules: InterpreterModule[], maxExecutionSteps: number) {
        this.interpreter = new Interpreter(
            [...additionalInterpreterModules, ...createBaseDiagramModules(this.layoutEngine), ...defaultDiagramModules],
            defaultModules,
            maxExecutionSteps
        );
    }

    /**
     * Renders a diagram
     *
     * @param source the source to execute
     * @param config additional config
     * @returns the render result including the potential diagram and all errors
     */
    async render(source: string, config: DiagramConfig): Promise<RenderResult> {
        const parserResult = this.parser.parse(source);
        if (parserResult.ast == undefined) {
            return {
                errors: {
                    lexingErrors: parserResult.lexingErrors,
                    parserErrors: parserResult.parserErrors,
                    interpreterErrors: [],
                    layoutErrors: []
                }
            };
        }
        const expressions = toExecutable(parserResult.ast, true);
        return this.renderInternal(expressions, config);
    }

    /**
     * Renders a diagram from a list of executable expressions
     *
     * @param expressions the expressions to execute, typically derived from the parser result, does not include the config
     * @param config additional config
     * @returns the render result including the potential diagram and all errors
     */
    async renderInternal(
        expressions: ExecutableExpression[],
        config: DiagramConfig,
    ): Promise<RenderResult> {
        let layoutedDiagram: LayoutedDiagram | undefined = undefined;
        const layoutErrors: Error[] = [];
        const interpretationResult = this.interpreter.run([...this.convertConfig(config), ...expressions]);
        if (interpretationResult.result != undefined) {
            try {
                layoutedDiagram = await this.layoutEngine.layout(interpretationResult.result, config);
            } catch (e: any) {
                layoutErrors.push(e);
            }
        }
        return {
            layoutedDiagram,
            errors: {
                lexingErrors: [],
                parserErrors: [],
                interpreterErrors: interpretationResult.error != undefined ? [interpretationResult.error] : [],
                layoutErrors
            }
        };
    }

    /**
     * Converts the config to a list of executable expressions
     *
     * @param config the config to convert
     * @returns the expressions setting the config
     */
    convertConfig(config: DiagramConfig): ExecutableExpression[] {
        const expression = id(SemanticFieldNames.THIS).assignField(
            "config",
            object([
                { name: "theme", value: str(config.theme) },
                { name: "primaryColor", value: str(config.primaryColor) },
                { name: "backgroundColor", value: str(config.backgroundColor) }
            ])
        );
        return [expression];
    }
}

import type { CstResult, ExecutableExpression, InterpretationResult, InterpreterModule } from "@hylimo/core";
import {
    Interpreter,
    Parser,
    RuntimeError,
    SemanticFieldNames,
    defaultModules,
    id,
    isWrapperObject,
    object,
    str,
    toExecutable
} from "@hylimo/core";
import { LayoutEngine, LayoutWithRoot } from "./layout/engine/layoutEngine.js";
import type { DiagramConfig } from "@hylimo/diagram-common";
import type { LayoutedDiagram } from "./layout/diagramLayoutResult.js";
import { createBaseDiagramModules, defaultDiagramModules } from "./module/diagramModules.js";

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
     * @param predictionMode whether to use prediction mode
     * @returns the render result including the potential diagram and all errors
     */
    async render(source: string, config: DiagramConfig, predictionMode: boolean = false): Promise<RenderResult> {
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
        let layoutedDiagram: LayoutedDiagram | undefined = undefined;
        const layoutErrors: Error[] = [];
        const interpretationResult = this.execute(expressions, config);
        if (interpretationResult.result != undefined) {
            try {
                const diagram = interpretationResult.result;
                if (!isWrapperObject(diagram) || !(diagram.wrapped instanceof LayoutWithRoot)) {
                    throw new RuntimeError("No diagram returned");
                }
                layoutedDiagram = await this.layoutEngine.layout(diagram.wrapped, config, predictionMode);
            } catch (e) {
                layoutErrors.push(e as Error);
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
     * Executes the given expressions
     * Also generates and adds expressions for the given config
     *
     * @param expressions the expressions to execute
     * @param config the config to use
     * @returns the interpretation result
     */
    execute(expressions: ExecutableExpression[], config: DiagramConfig): InterpretationResult {
        return this.interpreter.run([...this.convertConfig(config), ...expressions]);
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

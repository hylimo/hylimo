import type {
    CstResult,
    ExecutableExpression,
    InterpretationResult,
    InterpreterModule,
    RuntimeError
} from "@hylimo/core";
import {
    Interpreter,
    Parser,
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

/**
 * The result of rendering a diagram
 */
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
 * Render result with a generic result type and errors
 *
 * @template T the result type
 * @template E the error type
 */
export interface RenderResultBase<T, E extends object> {
    /**
     * All errors combined
     */
    errors: RenderErrors | (RenderErrors & E);
    /**
     * The result, if present
     */
    result?: T;
}

/**
 * A diagram engine that can render a diagram from source code and config using a parser, interpreter, and a layout engine
 */
export class DiagramEngine {
    /**
     * The parser to use
     */
    protected readonly parser = new Parser(false);
    /**
     * The interpreter to use
     */
    protected readonly interpreter: Interpreter;
    /**
     * The layout engine to use
     */
    protected readonly layoutEngine = new LayoutEngine();

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
        const result = await this.renderInternal<LayoutedDiagram, object>(source, config, async (layoutWithRoot) => {
            try {
                return {
                    errors: this.generateErrors({}),
                    result: await this.layoutEngine.layout(layoutWithRoot, config, predictionMode)
                };
            } catch (e) {
                return {
                    errors: this.generateErrors({
                        layoutErrors: [e as Error]
                    })
                };
            }
        });
        return {
            errors: result.errors,
            layoutedDiagram: result.result
        };
    }

    /**
     * Renders a diagram internally with a customizable final step
     *
     * @param source the source to execute
     * @param config additional config
     * @param generateResult function to generate the final result from the layout with root
     * @returns the render result including the potential diagram and all errors
     */
    protected async renderInternal<T, E extends object>(
        source: string,
        config: DiagramConfig,
        generateResult: (layoutWithRoot: LayoutWithRoot) => Promise<RenderResultBase<T, E>>
    ): Promise<RenderResultBase<T, E>> {
        const parserResult = this.parser.parse(source);
        if (
            parserResult.ast == undefined ||
            parserResult.parserErrors.length > 0 ||
            parserResult.lexingErrors.length > 0
        ) {
            return {
                errors: this.generateErrors(parserResult)
            };
        }
        const expressions = toExecutable(parserResult.ast, true);
        const interpretationResult = this.execute(expressions, config);
        if (interpretationResult.result == undefined) {
            return {
                errors: this.generateErrors({
                    interpreterErrors: [interpretationResult.error]
                })
            };
        }
        const diagram = interpretationResult.result;
        if (!isWrapperObject(diagram) || !(diagram.wrapped instanceof LayoutWithRoot)) {
            return {
                errors: this.generateErrors({
                    layoutErrors: [new Error("No diagram returned")]
                })
            };
        }
        return await generateResult(diagram.wrapped);
    }

    /**
     * Generates a complete RenderErrors object from partial errors
     *
     * @param errors the partial errors
     * @returns the complete RenderErrors object
     */
    protected generateErrors(errors: Partial<RenderErrors>): RenderErrors {
        return {
            lexingErrors: errors.lexingErrors ?? [],
            parserErrors: errors.parserErrors ?? [],
            interpreterErrors: errors.interpreterErrors ?? [],
            layoutErrors: errors.layoutErrors ?? []
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

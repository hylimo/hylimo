import { ExecutableExpression } from "../ast/executableExpression.js";
import { BaseObject } from "../objects/baseObject.js";
import { FullObject } from "../objects/fullObject.js";
import { RuntimeError } from "../runtimeError.js";
import { InterpreterContext } from "./interpreterContext.js";
import { InterpreterModule } from "./interpreterModule.js";

/**
 * The result of an interpreter run
 */
export interface InterpretationResult {
    /**
     * The result of the execution
     */
    result?: BaseObject;
    /**
     * The global scope, can be used to process results
     * Only provided if no error was thrown
     */
    globalScope?: FullObject;
    /**
     * If existing, the error which caused the abortion of the execution
     */
    error?: RuntimeError;
}

/**
 * Interpreter able to execute scripts
 * Must be reset after each execution
 */
export class Interpreter {
    /**
     * Sorted consistent modules loaded before each execution
     */
    private readonly modules: InterpreterModule[];

    /**
     * Creates a new Interpreter.
     * Provided modules are checked for consistency and oredered.
     * An error is thrown if a module has unsatisfied dependencies,
     *
     * @param modules loaded modules
     * @param maxExecutionSteps the maximum number of steps the interpreter is allowed to execute
     */
    constructor(
        modules: InterpreterModule[],
        optionalModules: InterpreterModule[],
        private readonly maxExecutionSteps: number
    ) {
        this.modules = InterpreterModule.computeModules(modules, optionalModules);
    }

    /**
     * Evaluates a list of expressions with all modules loaded
     *
     * @param expressions the expressions to evaluate
     * @returns the result of the interpretation, consting of a scope or an error
     */
    run(expressions: ExecutableExpression<any>[]): InterpretationResult {
        const context = new InterpreterContext(
            this.maxExecutionSteps,
            this.modules.map((module) => module.name)
        );
        try {
            for (const module of this.modules) {
                for (const expression of module.expressions) {
                    expression.evaluate(context);
                }
            }
            let previousResult: BaseObject = context.null;
            for (const expression of expressions) {
                previousResult = expression.evaluate(context).value;
            }
            return { result: previousResult, globalScope: context.currentScope };
        } catch (e: any) {
            if (Array.isArray(e.interpretationStack)) {
                return { error: e };
            } else {
                throw e;
            }
        }
    }
}

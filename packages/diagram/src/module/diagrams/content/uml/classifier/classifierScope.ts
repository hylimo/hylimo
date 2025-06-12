import type {
    BaseObject,
    ExecutableNativeFunctionExpression,
    Expression,
    FullObject,
    InterpreterContext
} from "@hylimo/core";
import {
    assertObject,
    ExecutableConstExpression,
    FunctionObject,
    id,
    jsFun,
    num,
    object,
    str,
    type FunctionDocumentation,
    type LabeledValue,
    type ParseableExpressions
} from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 *
 * Represents a parsed classifier entry with its values and compartment index.
 */
export interface ParsedClassifierEntry {
    /**
     * The labeled values associated with this classifier entry
     */
    values: LabeledValue[];
    /**
     * The compartment index of this entry within the classifier
     */
    index: number;
}

/**
 *
 * Specification for creating a classifier scope with type-specific context and parsing logic.
 *
 * @template T The type of the context extracted for parsing entries
 */
export interface ClassifierScopeSpecification<T> {
    /**
     * The name of the classifier scope function
     */
    name: string;
    /**
     * Documentation for the function
     */
    docs: FunctionDocumentation;
    /**
     * Edit configurations with value and name pairs
     */
    edits: { value: string; name: string }[];
    /**
     * Function to extract context used for parsing the entries
     */
    extractContext: (context: InterpreterContext, args: FullObject) => T;
    /**
     * Function to parse expressions into classifier entries
     */
    parseEntries: (parseContext: T, expressions: Expression[], context: InterpreterContext) => ParsedClassifierEntry[];
}

/**
 * Creates a content module for classifier scopes with the given specifications.
 * This function sets up the necessary scope functions and edits.
 *
 * @template T The type of context used by the classifier specifications
 * @param name The name of the content module
 * @param contentHandlerName The name of the content handler to be assigned
 * @param specifications Array of classifier scope specifications defining the behavior
 * @param additionalExpressions Additional parseable expressions to include in the module
 * @returns A configured ContentModule for classifier scopes
 */
export function createClassifierScopeContentModule<T>(
    name: string,
    contentHandlerName: string,
    specifications: ClassifierScopeSpecification<T>[],
    additionalExpressions: Exclude<ParseableExpressions, string>
): ContentModule {
    return ContentModule.create(
        name,
        [],
        [],
        [
            id(SCOPE)
                .field("internal")
                .assignField(
                    contentHandlerName,
                    object([
                        {
                            value: jsFun((args, context) => {
                                const callScope = args.getLocalFieldOrUndefined("callScope")!.value;
                                const createAddEdit = context.getField("createAddEdit");
                                const element = args.getLocalFieldOrUndefined("element")!.value;
                                assertObject(element);
                                const elementEdits = element.getLocalFieldOrUndefined("edits")!.value;
                                assertObject(elementEdits);
                                for (const spec of specifications) {
                                    const classifierScope = createClassifierScopeFunction(
                                        spec,
                                        callScope,
                                        createAddEdit,
                                        elementEdits
                                    );
                                    callScope.setSelfLocalField(spec.name, classifierScope.evaluate(context), context);
                                }
                                return context.null;
                            })
                        },
                        {
                            value: jsFun((args, context) => {
                                const element = args.getLocalFieldOrUndefined("element")!.value;
                                assertObject(element);
                                const elementEdits = element.getLocalFieldOrUndefined("edits")!.value;
                                assertObject(elementEdits);
                                const classifierArgs = args.getLocalFieldOrUndefined("args")!;
                                assertObject(classifierArgs.value);
                                const optionalCallback = classifierArgs.value.getLocalFieldOrUndefined(1);
                                if (optionalCallback == undefined) {
                                    const originalArgs = classifierArgs.value.getLocalFieldOrUndefined("args")!;
                                    handleAppendScopeEdits(specifications, elementEdits, originalArgs, context);
                                } else {
                                    handleAddEdits(specifications, elementEdits, optionalCallback, context);
                                }
                                return context.null;
                            })
                        }
                    ])
                ),
            ...additionalExpressions
        ]
    );
}

/**
 * Creates a classifier scope function from a specification and call scope.
 * This function processes scope functions, extracts expressions, parses them according to the specification,
 * and adds the resulting entries to the appropriate sections.
 * It also handles edits defined in the specification by invoking the `createAddEdit` function
 *
 * @template T The type of context used by the specification
 * @param spec The classifier scope specification defining parsing behavior
 * @param callScope The base object representing the call scope
 * @param createAddEdit the function to create an add edit
 * @param elementEdits the objects containing edits for the element
 * @returns An executable native function expression for the classifier scope
 */
function createClassifierScopeFunction<T>(
    spec: ClassifierScopeSpecification<T>,
    callScope: BaseObject,
    createAddEdit: BaseObject,
    elementEdits: FullObject
): ExecutableNativeFunctionExpression {
    return jsFun((args, context) => {
        const scopeFunction = args.getLocalFieldOrUndefined(0)!;
        if (!(scopeFunction.value instanceof FunctionObject)) {
            throw new Error("scope is not a function");
        }
        const expressions = scopeFunction.value.definition.expressions.map(
            (expression) => expression.expression as Expression
        );
        const parseContext = spec.extractContext(context, args);
        const parsedExpressions = spec.parseEntries(parseContext, expressions, context);
        const section = callScope.getSelfFieldValue("section", context);
        for (const parsed of parsedExpressions) {
            addEntriesToScope(parsed.values, parsed.index, section, context);
        }
        for (const edit of spec.edits) {
            const editValue = createAddEdit.invoke(
                [
                    {
                        value: new ExecutableConstExpression(scopeFunction)
                    },
                    {
                        value: str(`'${edit.value}'`)
                    }
                ],
                context,
                undefined,
                undefined
            );
            elementEdits.setSelfLocalField(`toolbox/${edit.name}`, editValue, context);
        }
        return context.null;
    }, spec.docs);
}

/**
 * Adds parsed classifier entries to the appropriate section.
 * If there are entries to add, invokes the section with the entry values and section index.
 *
 * @param entries Array of labeled values representing the classifier entries
 * @param index The section index where the entries should be added
 * @param section The section function to invoke
 * @param context The interpreter context for execution
 */
function addEntriesToScope(
    entries: LabeledValue[],
    index: number,
    section: BaseObject,
    context: InterpreterContext
): void {
    if (entries.length > 0) {
        section.invoke(
            [
                ...entries.map((entry) => ({ value: new ExecutableConstExpression(entry) })),
                {
                    name: "section",
                    value: num(index)
                }
            ],
            context,
            undefined,
            undefined
        );
    }
}

/**
 * Handles the creation of append scope edits when no optional callback is provided.
 * This generates edits that append new scope content to existing classifier element.
 *
 * @template T The type of context used by the classifier specifications
 * @param specifications Array of classifier scope specifications
 * @param elementEdits The object containing edits for the element
 * @param originalArgs The original arguments from the classifier
 * @param context The interpreter context
 */
function handleAppendScopeEdits<T>(
    specifications: ClassifierScopeSpecification<T>[],
    elementEdits: FullObject,
    originalArgs: LabeledValue,
    context: InterpreterContext
): void {
    const createAppendScopeEdit = context.getField("createAppendScopeEdit");
    for (const spec of specifications) {
        for (const edit of spec.edits) {
            const generatedEdit = createAppendScopeEdit.invoke(
                [
                    {
                        value: new ExecutableConstExpression(originalArgs)
                    },
                    {
                        value: new ExecutableConstExpression({
                            value: context.null,
                            source: undefined
                        })
                    },
                    {
                        value: str(`'${spec.name} {\n    ${edit.value}\n}'`)
                    }
                ],
                context,
                undefined,
                undefined
            );
            elementEdits.setSelfLocalField(`toolbox/${edit.name}`, generatedEdit, context);
        }
    }
}

/**
 * Handles the creation of add edits when an optional callback is provided.
 * This generates edits that add new scopes to the existing callback,
 * however, only if the edits are not already present.
 *
 * @template T The type of context used by the classifier specifications
 * @param specifications Array of classifier scope specifications
 * @param elementEdits The object containing edits for the element
 * @param optionalCallback The callback to use for the add edits
 * @param context The interpreter context
 */
function handleAddEdits<T>(
    specifications: ClassifierScopeSpecification<T>[],
    elementEdits: FullObject,
    optionalCallback: LabeledValue,
    context: InterpreterContext
): void {
    const createAddEdit = context.getField("createAddEdit");
    for (const spec of specifications) {
        if (
            spec.edits.length === 0 ||
            elementEdits.getLocalFieldOrUndefined(`toolbox/${spec.edits[0].name}`) != undefined
        ) {
            continue;
        }
        for (const edit of spec.edits) {
            const generatedEdit = createAddEdit.invoke(
                [
                    {
                        value: new ExecutableConstExpression(optionalCallback)
                    },
                    {
                        value: str(`'${spec.name} {\n    ${edit.value}\n}'`)
                    }
                ],
                context,
                undefined,
                undefined
            );
            elementEdits.setSelfLocalField(`toolbox/${edit.name}`, generatedEdit, context);
        }
    }
}

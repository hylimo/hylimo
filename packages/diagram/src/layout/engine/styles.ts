import type { InterpreterContext } from "@hylimo/core";
import {
    assertObject,
    assertString,
    ExecutableConstExpression,
    FullObject,
    objectToList,
    type LabeledValue
} from "@hylimo/core";
import type { LayoutElement } from "../layoutElement.js";

/**
 * Different types of selectors
 */
enum SelectorType {
    /**
     * Class selector, matches class
     */
    CLASS = "class",
    /**
     * Type selector, matches type
     */
    TYPE = "type",
    /**
     * Any selector, maches any element
     */
    ANY = "any"
}

/**
 * A selector which is part of the selector chain
 */
interface Selector {
    /**
     * The type of the selector
     */
    type: SelectorType;
    /**
     * The value of the selector
     */
    value: string;
}

/**
 * Represents a single style context with its selector, variables, and child contexts.
 * Each StyleContext can match against layout elements based on its selector and provides
 * style values and variables when matched.
 */
export class StyleContext {
    /**
     * Flag indicating whether this context has been initialized
     */
    private isInitialized: boolean = false;

    /**
     * Flag indicating whether this context is currently active (matched)
     */
    isActive: boolean = false;

    /**
     * Child style contexts that are nested within this context
     */
    children: StyleContext[] = [];

    /**
     * Cache for variable lookups to avoid repeated property access
     */
    variablesLookup: Map<string, LabeledValue | null> = new Map();

    /**
     * Cache for value lookups to avoid repeated property access
     */
    valuesLookup: Map<string, LabeledValue | null> = new Map();

    /**
     * Variables object containing all variables defined in this context
     */
    variables?: FullObject;

    /**
     * The selector used to match elements against this style context
     */
    selector: Selector;

    /**
     * Creates a new StyleContext from a style object.
     * Extracts the selector type and value from the style object.
     *
     * @param styleObject The full object containing style definition with selector information
     */
    constructor(private readonly styleObject: FullObject) {
        this.selector = {
            type: assertString(
                styleObject.getLocalFieldOrUndefined("selectorType")!.value,
                "selectorType"
            ) as SelectorType,
            value: assertString(styleObject.getLocalFieldOrUndefined("selectorValue")!.value, "selectorValue")
        };
    }

    /**
     * Initializes the style context by loading child styles and variables.
     * This is called lazily when the context becomes active for the first time.
     * Sets up child StyleContext instances and extracts variables object.
     */
    initialize(): void {
        if (this.isInitialized) {
            return;
        }
        const styles = this.styleObject.getLocalFieldOrUndefined("styles");
        if (styles != undefined) {
            for (const style of objectToList(styles.value as FullObject)) {
                assertObject(style!);
                this.children.push(new StyleContext(style));
            }
        }
        const variables = this.styleObject.getLocalFieldOrUndefined("variables")?.value;
        if (variables instanceof FullObject) {
            this.variables = variables;
        }
        this.isInitialized = true;
    }

    /**
     * Gets the value of a variable defined in this style context.
     * Uses caching to avoid repeated lookups of the same variable.
     *
     * @param name The name of the variable to retrieve
     * @returns The labeled value of the variable, or null if not found
     */
    getVariable(name: string): LabeledValue | null {
        if (this.variables == undefined) {
            return null;
        }
        const variable = this.variablesLookup.get(name);
        if (variable !== undefined) {
            return variable;
        }
        const value = this.variables.getLocalFieldOrUndefined(name) ?? null;
        this.variablesLookup.set(name, value);
        return value;
    }

    /**
     * Gets a style property value from this style context.
     * Uses caching to avoid repeated lookups of the same property.
     *
     * @param name The name of the style property to retrieve
     * @returns The labeled value of the property, or null if not found
     */
    getValue(name: string): LabeledValue | null {
        const value = this.valuesLookup.get(name);
        if (value !== undefined) {
            return value;
        }
        const field = this.styleObject.getLocalFieldOrUndefined(name) ?? null;
        this.valuesLookup.set(name, field);
        return field;
    }

    /**
     * Checks if a layout element matches this style context's selector.
     * Supports class selectors (matching element classes), type selectors
     * (matching element types), and the universal selector (matching any element).
     *
     * @param element The layout element to check against the selector
     * @returns true if the element matches the selector, otherwise false
     */
    matchesSelector(element: LayoutElement): boolean {
        const type = this.selector.type;
        if (type === SelectorType.CLASS) {
            return element.class.has(this.selector.value);
        } else if (type === SelectorType.TYPE) {
            return element.layoutConfig.type === this.selector.value;
        }
        return type === SelectorType.ANY;
    }
}

/**
 * Evaluates and manages style contexts for layout elements.
 * Handles matching elements against style selectors and maintains
 * an active style stack for nested style application.
 */
export class StyleEvaluator {
    /**
     * All available style contexts
     */
    contexts: StyleContext[];

    /**
     * Stack of currently active style contexts
     */
    activeStyleStack: StyleContext[] = [];

    /**
     * Stack tracking the number of active styles at each nesting level
     */
    activeStyleCountStack: number[] = [];

    /**
     * Creates a new StyleEvaluator with the given styles object.
     * Extracts all top-level style contexts from the styles object.
     *
     * @param styles The full object containing all style definitions
     */
    constructor(styles: FullObject) {
        this.contexts = objectToList(styles.getLocalFieldOrUndefined("styles")!.value as FullObject).map((style) => {
            assertObject(style!);
            return new StyleContext(style as FullObject);
        });
    }

    /**
     * Begins style matching for a layout element.
     * Finds all style contexts that match the element and updates the active style stack.
     * The returned contexts are in reverse order (most specific first).
     *
     * @param layoutElement The layout element to match styles against
     * @returns Array of matching style contexts in reverse order (most specific first)
     */
    beginMatchStyles(layoutElement: LayoutElement): StyleContext[] {
        const matchedContexts: StyleContext[] = [];
        const currentActiveCount = this.activeStyleStack.length;
        for (const context of this.contexts) {
            this.matchStylesRecursive(layoutElement, context, matchedContexts);
        }
        matchedContexts.reverse();
        this.activeStyleCountStack.push(this.activeStyleStack.length - currentActiveCount);
        return matchedContexts;
    }

    /**
     * Ends style matching for the current element.
     * Removes the styles that were added during the last beginMatchStyles call
     * from the active style stack.
     */
    endMatchStyles(): void {
        const count = this.activeStyleCountStack.pop()!;
        for (let i = 0; i < count; i++) {
            const context = this.activeStyleStack.pop();
            context!.isActive = false;
        }
    }

    /**
     * Recursively matches a layout element against a style context and its children.
     * If the context matches, it's added to the matched contexts and activated.
     * Child contexts are only processed if the parent context was already active.
     *
     * @param layoutElement The layout element to match against
     * @param context The style context to check for matching
     * @param matchedContexts Array to collect all matching contexts
     */
    private matchStylesRecursive(
        layoutElement: LayoutElement,
        context: StyleContext,
        matchedContexts: StyleContext[]
    ): void {
        const wasActive = context.isActive;
        if (context.matchesSelector(layoutElement)) {
            matchedContexts.push(context);
            if (!wasActive) {
                context.isActive = true;
                this.activeStyleStack.push(context);
                context.initialize();
            }
        }
        if (wasActive) {
            for (const child of context.children) {
                this.matchStylesRecursive(layoutElement, child, matchedContexts);
            }
        }
    }
}

/**
 * Helper class to get style values from a set of matching style objects
 */
export class StyleValueParser {
    /**
     * Cached variable values
     * During computation, a variable value is set to null to detect circular dependencies
     */
    private readonly variableValues = new Map<string, LabeledValue | null>();

    /**
     * Creates a new style value parser
     *
     * @param matchingStyles all matching styles
     * @param context the context to use for variable resolution
     */
    constructor(
        readonly matchingStyles: StyleContext[],
        readonly context: InterpreterContext
    ) {}

    /**
     * Gets the value of a style attribute
     *
     * @param name the name of the attribute
     * @returns the value of the attribute, undefined if none of the matching styles provides the attribute
     */
    getValue(name: string): LabeledValue | undefined {
        for (const style of this.matchingStyles) {
            const value = style.getValue(name);
            if (value != undefined) {
                return this.parse(value);
            }
        }
        return undefined;
    }

    /**
     * Parses a labeled value, resolving calc, var and unset special values
     *
     * @param labeledValue the labeled value to parse
     * @returns the parsed labeled value
     */
    private parse(labeledValue: LabeledValue): LabeledValue {
        const value = labeledValue.value;
        if (!(value instanceof FullObject)) {
            return labeledValue;
        }
        const type = value.getLocalFieldOrUndefined("_type")?.value?.toNative();
        if (type == undefined) {
            return labeledValue;
        }
        if (type === "unset") {
            return { value: this.context.null, source: undefined };
        } else if (type === "var") {
            const variableName = value.getLocalFieldOrUndefined("name")?.value?.toNative();
            return this.getVariableValue(variableName);
        } else if (type === "calc") {
            const operator = value.getField("operator", this.context).value;
            const result = operator.invoke(
                [
                    { value: new ExecutableConstExpression(this.parse(value.getField("left", this.context))) },
                    { value: new ExecutableConstExpression(this.parse(value.getField("right", this.context))) }
                ],
                this.context,
                undefined,
                undefined
            );
            return { value: result.value, source: labeledValue.source };
        } else {
            throw new Error(`Unknown style value type: ${type}`);
        }
    }

    /**
     * Gets the value of a variable
     *
     * @param name the name of the variable
     * @returns the value of the variable
     */
    private getVariableValue(name: string): LabeledValue {
        const variableValue = this.variableValues.get(name);
        if (variableValue != undefined) {
            return variableValue;
        }
        if (variableValue === null) {
            throw new Error(`Circular dependency detected! Variable ${name} depends on itself with itself`);
        }
        this.variableValues.set(name, null);
        for (const style of this.matchingStyles) {
            const entry = style.getVariable(name);
            if (entry != undefined) {
                const value = this.parse(entry);
                this.variableValues.set(name, value);
                return value;
            }
        }
        return { value: this.context.null, source: undefined };
    }
}

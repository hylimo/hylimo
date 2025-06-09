import {
    assertObject,
    assertString,
    ExecutableConstExpression,
    FullObject,
    InterpreterContext,
    objectToList,
    type LabeledValue
} from "@hylimo/core";
import { SelectorType, type Selector } from "../../styles.js";
import type { LayoutElement } from "../layoutElement.js";

export class StyleContext {
    private isInitialized: boolean = false;
    isActive: boolean = false;
    children: StyleContext[] = [];
    variablesLookup: Map<string, LabeledValue | null> = new Map();
    valuesLookup: Map<string, LabeledValue | null> = new Map();
    variables?: FullObject;
    selector: Selector;

    constructor(private readonly styleObject: FullObject) {
        this.selector = {
            type: assertString(
                styleObject.getLocalFieldOrUndefined("selectorType")!.value,
                "selectorType"
            ) as SelectorType,
            value: assertString(styleObject.getLocalFieldOrUndefined("selectorValue")!.value, "selectorValue")
        };
    }

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
    }

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
     * Checks if an element matches a selector
     * @param element the element to check
     * @param selector the selector to check
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

export class StyleEvaluator {
    contexts: StyleContext[];
    activeStyleStack: StyleContext[] = [];
    activeStyleCountStack: number[] = [];

    constructor(styles: FullObject) {
        this.contexts = objectToList(styles.getLocalFieldOrUndefined("styles")!.value as FullObject).map((style) => {
            assertObject(style!);
            return new StyleContext(style as FullObject);
        });
    }

    matchStyles(layoutElement: LayoutElement): StyleContext[] {
        const matchedContexts: StyleContext[] = [];
        const currentActiveCount = this.activeStyleStack.length;
        for (const context of this.contexts) {
            this.matchStylesRecursive(layoutElement, context, matchedContexts);
        }
        matchedContexts.reverse();
        this.activeStyleCountStack.push(this.activeStyleStack.length - currentActiveCount);
        return matchedContexts;
    }

    endMatchStyles(): void {
        const count = this.activeStyleCountStack.pop()!;
        if (count > 0) {
            this.activeStyleStack.length -= count;
        }
    }

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
            const operator = value.getSelfField("operator", this.context).value;
            const result = operator.invoke(
                [
                    { value: new ExecutableConstExpression(this.parse(value.getSelfField("left", this.context))) },
                    { value: new ExecutableConstExpression(this.parse(value.getSelfField("right", this.context))) }
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

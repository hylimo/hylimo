import {
    assertString,
    assign,
    ExecutableConstExpression,
    ExecutableExpression,
    Expression,
    fun,
    FunctionObject,
    functionType,
    id,
    IdentifierExpression,
    InterpreterModule,
    InvocationExpression,
    jsFun,
    parse,
    RuntimeError,
    SemanticFieldNames,
    StringLiteralExpression,
    stringType
} from "@hylimo/core";

/**
 * Identifier for temporary variable used to safe scope
 */
const scope = "scope";

/**
 * Converts an expression to a string, assuming the expression is either a string literal or an identifier.
 * If the expression is not a string literal or an identifier, an error is thrown.
 *
 * @param expression the expression to convert
 * @returns the string representation of the expression
 */
function convertStringOrIdentifier(expression: Expression): string {
    if (expression instanceof StringLiteralExpression) {
        return expression.value;
    } else if (expression instanceof IdentifierExpression) {
        return expression.identifier;
    } else {
        throw new RuntimeError("Expected string or identifier", expression);
    }
}

/**
 * Converts a invocation to a UML function string
 *
 * @param expression the expression to convert
 * @returns the UML function string
 */
function convertFunctionInvocation(expression: InvocationExpression): string {
    const identifier = convertStringOrIdentifier(expression.target);
    const args = expression.argumentExpressions
        .filter((argument) => argument.name === undefined)
        .map((argument) => {
            const value = argument.value;
            if (value instanceof InvocationExpression && isColonInvocation(value)) {
                const [left, right] = value.argumentExpressions
                    .filter((argument) => argument.name === undefined)
                    .map((argument) => argument.value);
                return convertStringOrIdentifier(left) + " : " + convertStringOrIdentifier(right);
            } else {
                return convertStringOrIdentifier(value);
            }
        });
    return `${identifier}(${args.join(", ")})`;
}

/**
 * Checks if the invocation expression is an operator expression with a colon as operator
 *
 * @param expression the expression to check
 * @returns true if the expression is a colon invocation, false otherwise
 */
function isColonInvocation(expression: InvocationExpression): boolean {
    return expression.target instanceof IdentifierExpression && expression.target.identifier === ":";
}

/**
 * Converts the given expressions to fields and functions
 *
 * @param expressions the expressions to convert
 * @returns the fields and functions
 */
function convertFieldsAndFunctions(expressions: Expression[]): [string[], string[]] {
    const fields: string[] = [];
    const functions: string[] = [];
    for (const expression of expressions) {
        if (expression instanceof InvocationExpression) {
            if (isColonInvocation(expression)) {
                const [left, right] = expression.argumentExpressions
                    .filter((argument) => argument.name === undefined)
                    .map((argument) => argument.value);
                const type = convertStringOrIdentifier(right);
                if (left instanceof InvocationExpression) {
                    functions.push(convertFunctionInvocation(left) + " : " + type);
                } else {
                    fields.push(convertStringOrIdentifier(left) + " : " + type);
                }
            } else {
                functions.push(convertFunctionInvocation(expression));
            }
        } else {
            fields.push(convertStringOrIdentifier(expression));
        }
    }
    return [fields, functions];
}

/**
 * Expressions for the callback provided to generateDiagramEnvironment
 */
const scopeExpressions: ExecutableExpression[] = [
    assign(scope, id(SemanticFieldNames.IT)),
    assign(
        "_classEntryScopeGenerator",
        fun([
            ...parse(
                `
                    (visibility, scope) = args
                `
            ),
            jsFun(
                (args, context) => {
                    const scopeFunction = args.getLocalFieldOrUndefined(0)!.value;
                    if (!(scopeFunction instanceof FunctionObject)) {
                        throw new Error("scope is not a function");
                    }
                    const expressions = scopeFunction.definition.expressions.map((expression) => expression.expression);
                    const visibility = assertString(context.getField("visibility"));
                    const scope = context.getField("scope");
                    const [fields, functions] = convertFieldsAndFunctions(expressions);

                    function addEntriesToScope(entries: string[], index: number): void {
                        if (entries.length > 0) {
                            scope.invoke(
                                [
                                    ...entries.map((entry) => ({
                                        value: new ExecutableConstExpression({
                                            value: context.newString(visibility + entry)
                                        })
                                    })),
                                    {
                                        name: "section",
                                        value: new ExecutableConstExpression({ value: context.newNumber(index) })
                                    }
                                ],
                                context
                            );
                        }
                    }

                    addEntriesToScope(fields, 0);
                    addEntriesToScope(functions, 1);

                    return context.null;
                },
                {
                    docs: `
                        Function to take a function in which fields and functions can be declared declaratively.
                        The content of the function is not executed, but analyzed on the AST level.
                        Identifiers can be provided both as identifiers and as strings.
                        A field is defined by an identifier, and optionally a colon and a type identifier.
                        Example: \`x : int\`
                        A function is defined by an identifier, an opening and closing bracket with optional parameters,
                        and optionally a colon and a return type identifier (e.g. test() : int).
                        Parameters are defined like fields, and separated by commas.
                        Example: \`point(x : int, y : int) : Point\`
                    `,
                    params: [[0, "the function which defines the fields and functions", functionType]],
                    returns: "null"
                }
            )
        ])
    ),
    assign(
        "_title",
        fun(
            `
                (name, keywords) = args
                this.contents = list()
                if(keywords != null) {
                    keywords.forEach {
                        contents += text(
                            contents = list(span(text = "\\u00AB" + it + "\\u00BB")),
                            class = list("keyword")
                        )
                    }
                }

                contents += text(contents = list(span(text = name)), class = list("title"))
                vbox(contents = contents)
            `
        )
    ),
    assign(
        "_package",
        fun(
            `
                (name, optionalCallback, keywords) = args
                packageElement = canvasElement(
                    scopes = object(),
                    class = list("package-element"),
                    content = vbox(
                        contents = list(
                            stack(
                                contents = list(
                                    rect(content = _title(name, keywords), class = list("title-wrapper")),
                                    path(path = "M 0 0 V 1", hAlign = "left"),
                                    path(path = "M 0 0 V 1", hAlign = "right"),
                                    path(path = "M 0 0 H 1", vAlign = "top")
                                ),
                                class = list("package")
                            ),
                            rect(
                                class = list("package-body")
                            )
                        )
                    )
                )
                scope.contents += packageElement
                if(optionalCallback != null) {
                    optionalCallback()
                }
                packageElement
            `
        )
    ),
    assign(
        "_comment",
        fun(
            `
                textContent = it
                commentElement = canvasElement(
                    scopes = object(),
                    content = stack(
                        contents = list(
                            path(path = "M0 0 H 1", vAlign = "top", class = list("comment-top")),
                            path(path = "M0 0 H 1", vAlign = "bottom"),
                            path(path = "M0 0 V 1", hAlign = "left"),
                            path(path = "M0 0 V 1", hAlign = "right", class = list("comment-right")),
                            vbox(
                                contents = list(
                                    path(
                                        path = "M 0 0 V 1 H 1 Z",
                                        hAlign = "right",
                                        vAlign = "top",
                                        class = list("comment-triangle")
                                    ),
                                    text(contents = list(span(text = textContent)), class = list("comment"))
                                )
                            )
                        )
                    ),
                    class = list("comment-element")
                )
                scope.contents += commentElement
                commentElement
            `
        )
    ),
    assign(
        "_class",
        fun(
            `
                (name, optionalCallback, keywords, abstract) = args
                callback = optionalCallback ?? {}
                result = object(sections = list())
                result.section = listWrapper {
                    sectionIndex = args.section
                    newSection = it
                    if(sectionIndex == null) {
                        result.sections += newSection
                    } {
                        while { result.sections.length <= sectionIndex } {
                            result.sections += list()
                        }
                        result.sections.get(sectionIndex).addAll(newSection)
                    }
                }
                result.public = _classEntryScopeGenerator("+ ", result.section)
                result.protected = _classEntryScopeGenerator("# ", result.section)
                result.private = _classEntryScopeGenerator("- ", result.section)
                result.package = _classEntryScopeGenerator("~ ", result.section)
                result.default = _classEntryScopeGenerator("", result.section)

                callback.callWithScope(result)
                classContents = list()
                classContents += _title(name, keywords)

                result.sections.forEach {
                    classContents += path(path = "M 0 0 L 1 0", class = list("separator"))
                    it.forEach {
                        classContents += text(contents = list(span(text = it)))
                    }
                }

                renderedClass = rect(
                    class = list("class"),
                    content = vbox(contents = classContents)
                )
                if(abstract == true) {
                    renderedClass.class += "abstract"
                }
                classElement = canvasElement(
                    content = renderedClass,
                    scopes = object(default = callback),
                    class = list("class-element")
                )
                targetScope = args.self
                if(targetScope.get(name) == null) {
                    targetScope.set(name, classElement)
                }
                scope.contents += classElement
                classElement
            `
        )
    ),
    ...parse(
        `
            scope.defaultMarkers = object(
                diamond = {
                    marker(
                        content = path(
                            path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                            class = list("diamond-marker-path", "marker-path")
                        ),
                        class=list("diamond-marker", "marker"),
                        lineStart = 1
                    )
                },
                filledDiamond = {
                    marker(
                        content = path(
                            path = "M 1 0 L 0 1 L -1 0 L 0 -1 Z",
                            class = list("filled-diamond-marker-path", "marker-path", "filled-marker-path")
                        ),
                        class=list("filled-diamond-marker", "marker"),
                        lineStart = 1
                    )
                },
                arrow = {
                    marker(
                        content = path(
                            path = "M 0 0 L 10 6 L 0 12",
                            class = list("arrow-marker-path", "marker-path")
                        ),
                        class=list("arrow-marker", "marker"),
                        lineStart = 0
                    )
                },
                cross = {
                    marker(
                        content = path(
                            path = "M 0 0 L 12 12 M 12 0 L 0 12",
                            class = list("cross-marker-path", "marker-path")
                        ),
                        class=list("cross-marker", "marker"),
                        lineStart = 0
                    )
                },
                triangle = {
                    marker(
                        content = path(
                            path = "M 0 0 L 10 6 L 0 12 Z",
                            class = list("triangle-marker-path", "marker-path")
                        ),
                        class=list("triangle-marker", "marker"),
                        lineStart = 1
                    )
                }
            )
        `
    ),
    ...parse(
        `
            this.create = scope.internal.createConnectionOperator
            scope.-- = create()
            scope.--> = create(
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<-- = create(
                startMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--> = create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.!-- = create(
                startMarkerFactory = scope.defaultMarkers.cross
            )
            scope.--! = create(
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope.!--! = create(
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope.!--> = create(
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--! = create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope.<>-- = create(
                startMarkerFactory = scope.defaultMarkers.diamond
            )
            scope.--<> = create(
                endMarkerFactory = scope.defaultMarkers.diamond
            )
            scope.<>--> = create(
                startMarkerFactory = scope.defaultMarkers.diamond,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--<> = create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.diamond
            )
            scope.*-- = create(
                startMarkerFactory = scope.defaultMarkers.filledDiamond
            )
            scope.--* = create(
                endMarkerFactory = scope.defaultMarkers.filledDiamond
            )
            scope.*--> = create(
                startMarkerFactory = scope.defaultMarkers.filledDiamond,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--* = create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.filledDiamond
            )
            scope.extends = create(
                endMarkerFactory = scope.defaultMarkers.triangle
            )
            scope.implements = create(
                endMarkerFactory = scope.defaultMarkers.triangle,
                class = list("dashed-connection")
            )
            scope.set("..", create(
                class = list("dashed-connection")
            ))
            scope.set("..>", create(
                endMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            ))
            scope.set("<..", create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            ))
            scope.set("<..>", create(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            ))
        `
    ),
    ...parse(
        `
            scope.comment = scope.internal.withRegisterSource {
                (content) = args
                _comment(content, self = args.self)
            }
            scope.comment.docs = [
                docs = "Creates a comment.",
                snippet = "(\\"$1\\")"
            ]
            scope.package = scope.internal.withRegisterSource {
                (name, callback) = args
                _package(name, callback, args.keywords, self = args.self)
            }
            scope.package.docs = [
                docs = "Creates a package.",
                snippet = "(\\"$1\\") {\\n    $2\\n}"
            ]
            scope.class = scope.internal.withRegisterSource {
                (name, callback) = args
                _class(name, callback, args.keywords, args.abstract, self = args.self)
            }
            scope.class.docs = [
                docs = "Creates a class.",
                snippet = "(\\"$1\\") {\\n    $2\\n}"
            ]
            scope.interface = scope.internal.withRegisterSource  {
                (name, callback) = args
                keywords = list("interface")
                otherKeywords = args.keywords
                if(otherKeywords != null) {
                    keywords.addAll(otherKeywords)
                }
                _class(name, callback, keywords, args.abstract, self = args.self)
            }
            scope.interface.docs = [
                docs = "Creates an interface.",
                snippet = "(\\"$1\\") {\\n    $2\\n}"
            ]
        `
    ),
    id(scope).assignField(
        "readingLeft",
        fun(
            `
                list(span(text = "\\u25c0", class = list("direction-triangle")), span(text = it))
            `,
            {
                docs: "Can be used to create a label with an arrow pointing to the right. Typically used for labels on associations to indicate the the reading direction from right to left.",
                params: [[0, "the text of the label", stringType]],
                returns: "A list of spans, containing the arrow and the text"
            }
        )
    ),
    id(scope).assignField(
        "readingRight",
        fun(
            `
                list(span(text = it), span(text = "\\u25b8", class = list("direction-triangle")))
            `,
            {
                docs: "Can be used to create a label with an arrow pointing to the left. Typically used for labels on associations to indicate the the reading direction from left to right.",
                params: [[0, "the text of the label", stringType]],
                returns: "A list of spans, containing the arrow and the text"
            }
        )
    ),
    fun(
        `
            scope.styles {
                vars {
                    primary = if((config ?? object()).theme == "dark") {
                        "#ffffff"
                    } {
                        "#000000"
                    }
                    strokeWidth = 2
                    commentTriangleSize = 20
                }
                type("span") {
                    fill = var("primary")
                }
                cls("class") {
                    stroke = var("primary")
                    strokeWidth = var("strokeWidth")
                    type("vbox") {
                        margin = 5
                    }
                }
                cls("abstract") {
                    cls("title") {
                        type("span") {
                            fontStyle = "italic"
                        }
                    }
                }
                cls("title") {
                    hAlign = "center"
                    type("span") {
                        fontWeight = "bold"
                    }
                }
                cls("keyword") {
                    hAlign = "center"
                }
                cls("separator") {
                    marginTop = 5
                    marginBottom = 5
                    marginLeft = -5
                    marginRight = -5
                    strokeWidth = var("strokeWidth")
                    stroke = var("primary")
                }
                type("canvasConnection") {
                    stroke = var("primary")
                    strokeWidth = var("strokeWidth")
                }
                cls("class-element") {
                    vAlign = "center"
                    hAlign = "center"
                    minWidth = 300
                }
                cls("package-element") {
                    minWidth = 300
                }
                cls("package-body") {
                    minHeight = 50
                    stroke = var("primary")
                    strokeWidth = var("strokeWidth")
                }
                cls("package") {
                    type("vbox") {
                        margin = 5
                    }
                    cls("title-wrapper") {
                        marginLeft = var("strokeWidth")
                        marginRight = var("strokeWidth")
                        marginTop = var("strokeWidth")
                    }
                    type("path") {
                        stroke = var("primary")
                        strokeWidth = var("strokeWidth")
                    }
                    minWidth = 100
                    hAlign = "left"
                }
                cls("comment-element") {
                    vAlign = "center"
                    hAlign = "center"
                    minWidth = 80
                    maxWidth = 300
                    cls("comment-right") {
                        marginTop = var("commentTriangleSize")
                    }
                    cls("comment-top") {
                        marginRight = var("commentTriangleSize")
                    }
                    cls("comment-triangle") {
                        width = var("commentTriangleSize")
                        height = var("commentTriangleSize")
                    }
                    type("path") {
                        stroke = var("primary")
                        strokeWidth = var("strokeWidth")
                    }
                }
                cls("comment") {
                    marginRight = 5
                    marginLeft = 5
                    marginBottom = 5
                }
                cls("marker") {
                    height = 25
                    width = 25
                }
                cls("diamond-marker") {
                    width = 40
                }
                cls("filled-diamond-marker") {
                    width = 40
                }
                cls("marker-path") {
                    strokeWidth = var("strokeWidth")
                    stroke = var("primary")
                }
                cls("filled-marker-path") {
                    fill = var("primary")
                }
                cls("arrow-marker-path") {
                    strokeLineJoin = "bevel"
                }
                cls("dashed-connection") {
                    strokeDash = 10
                }
                cls("cross-marker-path") {
                    marginRight = 5
                }
                type("text") {
                    cls("direction-triangle") {
                        fontFamily = "Source Code Pro"
                        fontSize = 20
                    }
                }
                type("span") {
                    fontSize = 16
                }
            }
        `
    ).call(id(scope))
];

/**
 * Module for class diagrams
 */
export const classDiagramModule = InterpreterModule.create(
    "class-diagram",
    ["diagram", "dsl"],
    [],
    [assign("classDiagram", id("generateDiagramEnvironment").call(fun(scopeExpressions)))]
);

import {
    AbstractFunctionObject,
    assign,
    ConstExpression,
    fun,
    id,
    InterpreterModule,
    native,
    SemanticFieldNames
} from "@hylimo/core";

/**
 * Identifier for temporary variable used to safe scope
 */
const scope = "scope";

export const classDiagramModule: InterpreterModule = {
    name: "class-diagram",
    dependencies: ["diagram", "dsl"],
    runtimeDependencies: [],
    expressions: [
        assign(
            "classDiagram",
            id("generateDiagramEnvironment").call(
                fun([
                    assign(scope, id(SemanticFieldNames.IT)),
                    assign(
                        "_listWrapper",
                        fun([
                            id(SemanticFieldNames.THIS).assignField("callback", id(SemanticFieldNames.IT)),
                            native((args, context, staticScope) => {
                                const listFunction = staticScope.getField("list", context);
                                const list = listFunction.invoke(args, context);
                                const callback = staticScope.getField("callback", context);
                                callback.invoke([{ value: new ConstExpression(list) }], context);
                                return list;
                            })
                        ])
                    ),
                    assign(
                        "_class",
                        fun(
                            `
                                (name, callback) = args
                                result = object(sections = list())
                                result.section = _listWrapper {
                                    result.sections += it
                                }
                                callback.callWithScope(result)
                                classContents = list()
                                classContents += text(contents = list(span(text = name)), class = list("title"))

                                result.sections.forEach {
                                    classContents += hline(class = list("separator"))
                                    it.forEach {
                                        classContents += text(contents = list(span(text = it)))
                                    }
                                }

                                renderedClass = rect(
                                    class = list("class"),
                                    content = vbox(contents = classContents)
                                )
                                classElement = canvasElement(
                                    pos = scope.apos(0, 0),
                                    content = renderedClass,
                                    scopes = object(default = callback)
                                )
                                scope.contents += classElement
                                classElement
                            `
                        )
                    ),
                    id(scope).assignField(
                        "class",
                        native((args, context, staticScope, callExpression) => {
                            const classFunction = staticScope.getField(
                                "_class",
                                context
                            ) as AbstractFunctionObject<any>;
                            const generatedClass = classFunction.invoke(args, context);
                            generatedClass.value.setLocalField(
                                "source",
                                {
                                    value: generatedClass.value,
                                    source: callExpression
                                },
                                context
                            );
                            return generatedClass;
                        })
                    ),
                    fun(
                        `
                            primary = "white"
                            lineWidth = 2
                            scope.styles {
                                type("span") {
                                    fill = primary
                                }
                                class("class") {
                                    stroke = primary
                                    strokeWidth = lineWidth
                                    width = 300
                                    type("vbox") {
                                        margin = 5
                                    }
                                }
                                class("title") {
                                    hAlign = "center"
                                    type("span") {
                                        fontWeight = "bold"
                                    }
                                }
                                class("separator") {
                                    marginTop = 5
                                    marginBottom = 5
                                    marginLeft = -5
                                    marginRight = -5
                                    strokeWidth = lineWidth
                                    stroke = primary
                                }
                            }
                            scope.fonts += robotoFontFamily
                        `
                    ).call(id(scope))
                ])
            )
        )
    ]
};

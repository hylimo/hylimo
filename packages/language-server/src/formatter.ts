import { Parser } from "@hylimo/core";
import { Plugin, doc, Doc } from "prettier";
import { format } from "prettier/standalone";
import { TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import { CstNode, ICstVisitor, IToken } from "chevrotain";
import { uinteger } from "vscode-languageserver";

const { group, indent, join, line, hardline, softline } = doc.builders;

/**
 * Formatter used to format syncscript documents using a prettier plugin
 */
export class Formatter {
    /**
     * Visitor used
     */
    private readonly formatVisitor: ICstVisitor<never, Doc>;

    /**
     * Creates a new formatter using the provided parser
     *
     * @param parser the parser to create the cst
     */
    constructor(private readonly parser: Parser) {
        this.formatVisitor = generateFormatVisitor(parser);
    }

    /**
     * The prettier plugin to use
     */
    readonly plugin: Plugin<CstNode> = {
        parsers: {
            syncscript: {
                parse: (text, options) => this.parser.parse(text).cst!,
                astFormat: "syncscript",
                locStart: (node) => node.location!.startOffset,
                locEnd: (node) => node.location!.endOffset!
            }
        },
        printers: {
            syncscript: {
                print: (path, options, print) => {
                    const node = path.getValue();
                    return this.formatVisitor.visit(node);
                }
            }
        }
    };

    /**
     * Formats the whole document
     *
     * @param document the document to format
     * @param options define how formatting is done
     * @returns the edits defining how to update the document
     */
    formatDocument(document: TextDocument, options: { useTabs?: boolean; tabWidth?: number }): string {
        return format(document.getText(), {
            parser: "syncscript",
            plugins: [this.plugin],
            ...options
        });
    }
}

/**
 * Generates the visitor which can format the document based on the CST
 *
 * @param parser the parser for which the visitor is generated
 * @returns an instance of the visitor
 */
function generateFormatVisitor(parser: Parser): ICstVisitor<never, Doc> {
    /**
     * Visitor which visists each node and generates the formatted document
     */
    class FormatVisitor extends parser.getBaseCstVisitorConstructor<never, Doc>() {
        constructor() {
            super();
            this.validateVisitor();
        }

        /**
         * Formats a literal
         *
         * @param ctx the children of the current CST node
         * @returns the formatteed literal
         */
        private literal(ctx: any): Doc {
            if (ctx.String) {
                const token = ctx.String[0];
                return token.image;
            } else {
                const token = ctx.Number[0];
                if (ctx.SignMinus) {
                    return "-" + token.image;
                } else {
                    return token.image;
                }
            }
        }

        /**
         * Formats a function decorator
         *
         * @param ctx the children of the current CST node
         * @returns the formatted function decorator
         */
        private decorator(ctx: any): Doc {
            const entries = (ctx.decoratorEntry ?? []).map((entry: CstNode) => this.visit(entry));
            return group(["[", indent([softline, join([",", line], entries)]), softline, "]"]);
        }

        /**
         * Formats a decorator entry
         *
         * @param ctx the children of the current CST node
         * @returns the formatted decorator entry
         */
        private decoratorEntry(ctx: any): Doc {
            if (ctx.String) {
                return [ctx.Identifier[0].image, " = ", ctx.String[0].image];
            } else {
                return ctx.Identifier[0].image;
            }
        }

        /**
         * Formats a function expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted function expression
         */
        private function(ctx: any): Doc {
            let decorator: Doc;
            if (ctx.decorator) {
                decorator = [this.visit(ctx.decorator), " "];
            } else {
                decorator = [];
            }
            const expressions = this.visit(ctx.expressions);
            const expressionsChildren = ctx.expressions[0].children;
            if (!expressionsChildren.expression) {
                return "{ }";
            } else {
                const newLine = expressionsChildren.StartNewLine ? hardline : line;
                return [decorator, group(["{", indent([newLine, expressions]), newLine, "}"])];
            }
        }

        /**
         * Formats a list of expressions
         *
         * @param ctx the children of the current CST node
         * @returns the formatted list of expressions
         */
        private expressions(ctx: any): Doc {
            const lines: Doc[] = [];
            let lastLine = uinteger.MAX_VALUE;
            for (const expression of ctx.expression ?? []) {
                if (expression.location.startLine > lastLine + 1) {
                    lines.push("");
                }
                lines.push(this.visit(expression));
                lastLine = expression.location.endLine;
            }
            return join(hardline, lines);
        }

        /**
         * Formats a call argument
         *
         * @param ctx the children of the current CST node
         * @returns the formatted call argument
         */
        private callArgument(ctx: any): Doc {
            if (ctx.Identifier) {
                return [ctx.Identifier[0].image, " = ", this.visit(ctx.operatorExpression)];
            } else {
                return this.visit(ctx.operatorExpression);
            }
        }

        /**
         * Formats the brackets part of a function invokation
         *
         * @param ctx the children of the current CST node
         * @returns the formatted call brackets
         */
        private callBrackets(ctx: any): Doc {
            const allBrackets: Doc[] = [];
            if (ctx.OpenRoundBracket) {
                const args = (ctx.callArgument ?? []).map((argument: CstNode) => this.visit(argument));
                allBrackets.push(group(["(", indent([softline, join([",", line], args)]), softline, ")"]));
            }
            if (ctx.function) {
                if (!ctx.OpenRoundBracket) {
                    allBrackets.push("");
                }
                allBrackets.push(...ctx.function.map((func: CstNode) => this.visit(func)));
            }
            return join(" ", allBrackets);
        }

        /**
         * Formats a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted call expression
         */
        private callExpression(ctx: any): Doc {
            let baseExpression: Doc;
            if (ctx.Identifier) {
                baseExpression = ctx.Identifier[0].image;
            } else if (ctx.literal) {
                baseExpression = this.visit(ctx.literal);
            } else if (ctx.function) {
                baseExpression = this.visit(ctx.function);
            } else {
                baseExpression = this.visit(ctx.bracketExpression);
            }
            if (ctx.callBrackets) {
                return [baseExpression, ctx.callBrackets.map((brackets: CstNode) => this.visit(brackets))];
            } else {
                return baseExpression;
            }
        }

        /**
         * Formats a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted simpleCallExpression
         */
        private simpleCallExpression(ctx: any): Doc {
            return this.callExpression(ctx);
        }

        /**
         * Formats a bracket expression
         *
         * @param ctx the children of the current CST node
         * @returns the inner expression
         */
        private bracketExpression(ctx: any) {
            return group(["(", indent([softline, this.visit(ctx.expression)]), softline, ")"]);
        }

        /**
         * Formats field accesses including call operators
         *
         * @param ctx the children of the current CST node
         * @returns the formatted fieldAccessExpression
         */
        private fieldAccessExpression(ctx: any): Doc {
            return join(".", [
                this.visit(ctx.callExpression),
                ...(ctx.simpleCallExpression ?? []).map((exp: CstNode) => this.visit(exp))
            ]);
        }

        /**
         * Formats a simple field access to an expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted expression
         */
        private simpleFieldAccessExpression(ctx: any): Doc {
            const identifiers: IToken[] = ctx.Identifier ?? [];
            if (ctx.SignMinus) {
                identifiers.push(...ctx.SignMinus);
            }
            return join(
                ".",
                identifiers.map((id: IToken) => id.image)
            );
        }

        /**
         * Formats an operator expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted expression
         */
        private operatorExpression(ctx: any): Doc {
            const expressions = ctx.fieldAccessExpression.map((exp: CstNode) => this.visit(exp));
            const operators = (ctx.simpleFieldAccessExpression ?? []).map((operator: CstNode) => this.visit(operator));
            const res: Doc[] = [expressions[0]];
            for (let i = 0; i < operators.length; i++) {
                res.push(operators[i], expressions[i + 1]);
            }
            return join(" ", res);
        }

        /**
         * Formats a destructuring expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted expression
         */
        private destructuringExpression(ctx: any): Doc {
            const entries = ctx.Identifier.map((id: IToken) => id.image);
            return [
                group(["(", indent([softline, join([",", line], entries)]), softline, ")"]),
                " = ",
                this.visit(ctx.operatorExpression)
            ];
        }

        /**
         * Formats an expression
         *
         * @param ctx the children of the current CST node
         * @returns the formatted expression
         */
        private expression(ctx: any): Doc {
            if (ctx.destructuringExpression) {
                return this.visit(ctx.destructuringExpression);
            } else {
                const expressions = ctx.operatorExpression.map((exp: CstNode) => this.visit(exp));
                return join(" = ", expressions);
            }
        }
    }
    return new FormatVisitor();
}

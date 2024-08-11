import { Parser } from "@hylimo/core";
import { Plugin, doc, Doc } from "prettier";
import { format } from "prettier/standalone.js";
import { TextDocument } from "vscode-languageserver-textdocument";
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
    private readonly formatVisitor: ICstVisitor<CommentManager, Doc>;

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
    readonly plugin: Plugin<[CstNode, IToken[]]> = {
        parsers: {
            syncscript: {
                parse: (text, _options) => {
                    const parserResult = this.parser.parse(text);
                    return [parserResult.cst!, parserResult.comments];
                },
                astFormat: "syncscript",
                locStart: () => -1,
                locEnd: () => -1
            }
        },
        printers: {
            syncscript: {
                print: (path, _options, _print) => {
                    const node = path.getValue();
                    const commentManager = new CommentManager(node[1]);
                    const contentDoc = this.formatVisitor.visit(node[0], commentManager);
                    return [printComments(commentManager.comments, { startLine: false, endLine: true }), contentDoc];
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
 * Formatting options for printing comments
 */
interface CommentFormatOptions {
    /**
     * Should a newline be printed before the first comment
     */
    startLine: boolean;
    /**
     * Should a newline be printed after the last comment
     */
    endLine: boolean;
}

/**
 * Manages the comments in the document
 */
class CommentManager {
    /**
     * Creates a new comment manager
     *
     * @param comments the tokens of the document
     */
    constructor(readonly comments: IToken[]) {}

    /**
     * Gets all comments in the given range. Removes the returned comments from the comment manager.
     *
     * @param start the start of the range
     * @param end the end of the range
     * @returns the comments in the range
     */
    getCommentsInRange(start: number, end: number): IToken[] {
        const minIndex = this.comments.findIndex((token) => token.startOffset >= start);
        const maxIndex = this.comments.findIndex((token) => token.startOffset >= end);
        if (minIndex !== -1) {
            return this.comments.splice(minIndex, maxIndex >= 0 ? maxIndex - minIndex : Number.POSITIVE_INFINITY);
        }
        return [];
    }
}

/**
 * Prints the comments to a doc
 *
 * @param comments the comments to print
 * @param options the options to use, defines newlines at start and end
 * @returns the doc representing the comments
 */
function printComments(comments: IToken[], options: CommentFormatOptions): Doc[] {
    const commentDocs: Doc[] = [];
    for (let i = 0; i < comments.length; i++) {
        if (i === 0 && options.startLine) {
            commentDocs.push(hardline);
        }
        const comment = comments[i];
        const commentDoc: Doc[] = [comment.image];
        if (options.endLine || i < comments.length - 1) {
            commentDoc.push(hardline);
        }
        commentDocs.push(commentDoc);
    }
    return commentDocs;
}

/**
 * Generates the visitor which can format the document based on the CST
 *
 * @param parser the parser for which the visitor is generated
 * @returns an instance of the visitor
 */
function generateFormatVisitor(parser: Parser): ICstVisitor<CommentManager, Doc> {
    /**
     * Visitor which visists each node and generates the formatted document
     */
    class FormatVisitor extends parser.getBaseCstVisitorConstructor<CommentManager, Doc>() {
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
         * Formats a function expression
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted function expression
         */
        private function(ctx: any, param: CommentManager): Doc {
            const expressions = ctx.expressions[0];
            const openBracket = ctx.OpenCurlyBracket[0];
            const closeBracket = ctx.CloseCurlyBracket[0];
            const expressionsDocs = this.visit(ctx.expressions, param);
            const expressionsChildren = expressions.children;
            const newLine = expressionsChildren.StartNewLine ? hardline : line;
            return group([
                "{",
                indent([
                    newLine,
                    ...this.commentsInRange(openBracket, expressions, param),
                    expressionsDocs,
                    ...this.commentsInRange(expressions, closeBracket, param, {
                        endLine: false,
                        startLine: true
                    })
                ]),
                newLine,
                "}"
            ]);
        }

        /**
         * Formats a list of expressions
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted list of expressions
         */
        private expressions(ctx: any, param: CommentManager): Doc {
            let lastLine = uinteger.MAX_VALUE;
            const expressions = ctx.expression ?? [];
            const docs: Doc[] = [];
            for (let i = 0; i < expressions.length; i++) {
                const expression = expressions[i];
                let localComments: Doc[];
                const expressionResult = this.visit(expression, param);
                if (i === 0) {
                    localComments = this.commentsInRange(expression, expression, param);
                } else {
                    localComments = this.commentsInRange(expressions[i - 1], expression, param);
                }
                if (expression.location.startLine > lastLine + 1 + localComments.length) {
                    docs.push(hardline);
                }
                docs.push(...localComments);
                docs.push(expressionResult);
                if (i < expressions.length - 1) {
                    docs.push(hardline);
                }
                lastLine = expression.location.endLine;
            }
            return docs;
        }

        /**
         * Formats a list entry
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted call argument
         */
        private listEntry(ctx: any, param: CommentManager): Doc {
            if (ctx.Identifier) {
                return [ctx.Identifier[0].image, " = ", this.visit(ctx.operatorExpression, param)];
            } else {
                return this.visit(ctx.operatorExpression);
            }
        }

        /**
         * Formats the brackets part of a function invocation
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted call brackets
         */
        private callBrackets(ctx: any, param: CommentManager): Doc {
            const allBrackets: Doc[] = [];
            if (ctx.OpenRoundBracket) {
                const args = (ctx.listEntry ?? []).map((argument: CstNode) => this.visit(argument, param));
                allBrackets.push(group(["(", indent([softline, join([",", line], args)]), softline, ")"]));
            }
            if (ctx.function) {
                if (!ctx.OpenRoundBracket) {
                    allBrackets.push("");
                }
                allBrackets.push(...ctx.function.map((func: CstNode) => this.visit(func, param)));
            }
            return join(" ", allBrackets);
        }

        /**
         * Formats an object expression
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted object expression
         */
        private objectExpression(ctx: any, param: CommentManager): Doc {
            const args = (ctx.listEntry ?? []).map((argument: CstNode) => this.visit(argument, param));
            return group(["[", indent([softline, join([",", line], args)]), softline, "]"]);
        }

        /**
         * Formats a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted call expression
         */
        private callExpression(ctx: any, param: CommentManager): Doc {
            let baseExpression: Doc;
            if (ctx.Identifier) {
                baseExpression = ctx.Identifier[0].image;
            } else if (ctx.literal) {
                baseExpression = this.visit(ctx.literal, param);
            } else if (ctx.function) {
                baseExpression = this.visit(ctx.function, param);
            } else if (ctx.bracketExpression) {
                baseExpression = this.visit(ctx.bracketExpression, param);
            } else {
                baseExpression = this.visit(ctx.objectExpression, param);
            }
            if (ctx.callBrackets) {
                return [baseExpression, ctx.callBrackets.map((brackets: CstNode) => this.visit(brackets, param))];
            } else {
                return baseExpression;
            }
        }

        /**
         * Formats a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted simpleCallExpression
         */
        private simpleCallExpression(ctx: any, param: CommentManager): Doc {
            return this.callExpression(ctx, param);
        }

        /**
         * Formats a bracket expression
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the inner expression
         */
        private bracketExpression(ctx: any, param: CommentManager) {
            return group(["(", indent([softline, this.visit(ctx.expression, param)]), softline, ")"]);
        }

        /**
         * Formats field accesses including call operators
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted fieldAccessExpression
         */
        private fieldAccessExpression(ctx: any, param: CommentManager): Doc {
            return join(".", [
                this.visit(ctx.callExpression, param),
                ...(ctx.simpleCallExpression ?? []).map((exp: CstNode) => this.visit(exp, param))
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
         * @param param the comment manager used to print comments
         * @returns the formatted expression
         */
        private operatorExpression(ctx: any, param: CommentManager): Doc {
            const expressions = ctx.fieldAccessExpression.map((exp: CstNode) => this.visit(exp, param));
            const operators = (ctx.simpleFieldAccessExpression ?? []).map((operator: CstNode) =>
                this.visit(operator, param)
            );
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
         * @param param the comment manager used to print comments
         * @returns the formatted expression
         */
        private destructuringExpression(ctx: any, param: CommentManager): Doc {
            const entries = ctx.Identifier.map((id: IToken) => id.image);
            return [
                group(["(", indent([softline, join([",", line], entries)]), softline, ")"]),
                " = ",
                this.visit(ctx.operatorExpression, param)
            ];
        }

        /**
         * Formats an expression
         *
         * @param ctx the children of the current CST node
         * @param param the comment manager used to print comments
         * @returns the formatted expression
         */
        private expression(ctx: any, param: CommentManager): Doc {
            if (ctx.destructuringExpression) {
                return this.visit(ctx.destructuringExpression, param);
            } else {
                const expressions = ctx.operatorExpression.map((exp: CstNode) => this.visit(exp, param));
                return join(" = ", expressions);
            }
        }

        /**
         * Calculates docs for the non-handled comments in range of start and end (inclusive)
         *
         * @param start the start of the range
         * @param end the end of the range
         * @param commentManager provides comments when required
         * @param startHardLine if true, a hardline is added before the first comment
         * @param endHardLine if true, a hardline is added after the last comment
         * @returns the docs for the comments
         */
        private commentsInRange(
            start: CstNode | IToken,
            end: CstNode | IToken,
            commentManager: CommentManager,
            options: CommentFormatOptions = {
                startLine: false,
                endLine: true
            }
        ): Doc[] {
            const comments = commentManager.getCommentsInRange(this.startOf(start), this.endOf(end));
            return printComments(comments, options);
        }

        /**
         * Calculates the start offset of a node or token
         *
         * @param node the node or token of which the start offset should be calculated
         * @returns the start offset
         */
        private startOf(node: CstNode | IToken): number {
            if ("startOffset" in node) {
                return node.startOffset;
            } else {
                return node.location!.startOffset;
            }
        }

        /**
         * Calculates the end offset of a node or token
         *
         * @param node the node or token of which the end offset should be calculated
         * @returns the end offset
         */
        private endOf(node: CstNode | IToken): number {
            if ("endOffset" in node) {
                return node.endOffset!;
            } else {
                return (node as CstNode).location!.endOffset!;
            }
        }
    }
    return new FormatVisitor();
}

import type { Parser } from "@hylimo/core";
import { Rules, TokenType } from "@hylimo/core";
import type { Plugin } from "prettier";
import { format } from "prettier";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { CstNode, IToken } from "chevrotain";
import type { Comment, Path, Node } from "./types.js";
import { printers } from "./printers.js";
import { printComment } from "./comments.js";

/**
 * Formatter used to format syncscript documents using a prettier plugin
 */
export class Formatter {
    /**
     * Creates a new formatter using the provided parser
     *
     * @param parser the parser to create the cst
     */
    constructor(private readonly parser: Parser) {}

    /**
     * Transforms the CST to a format prettier can use better
     *
     * @param cst the CST to transform
     * @returns the transformed CST
     */
    private transformCst(cst: CstNode): Node {
        const res: any = { name: cst.name, location: cst.location };
        for (const key in cst.children) {
            res[key] = cst.children[key].map((child: CstNode | IToken) => {
                if ("image" in child) {
                    return child;
                } else {
                    return this.transformCst(child);
                }
            });
        }
        return res;
    }

    /**
     * The prettier plugin to use
     */
    readonly plugin: Plugin<Node | IToken> = {
        parsers: {
            syncscript: {
                parse: (text) => {
                    const parserResult = this.parser.parse(text);
                    return {
                        ...this.transformCst(parserResult.cst!),
                        comments: parserResult.comments as Comment[]
                    };
                },
                astFormat: "syncscript",
                locStart: (node: IToken | Pick<CstNode, "location">) => {
                    if ("location" in node) {
                        return node.location!.startOffset;
                    } else {
                        return (node as IToken).startOffset as number;
                    }
                },
                locEnd: (node: IToken | Pick<CstNode, "location">) => {
                    if ("location" in node) {
                        return node.location!.endOffset! + 1;
                    } else {
                        return ((node as IToken).endOffset as number) + 1;
                    }
                }
            }
        },
        printers: {
            syncscript: {
                print(path, options, print) {
                    const node = path.node as Node;
                    const printer = printers[node.name];
                    return printer({ ctx: node, path: path as Path, options, print });
                },
                printComment(commentPath, options) {
                    return printComment(commentPath.node as Comment, options);
                },
                canAttachComment(node) {
                    if (!("name" in node)) {
                        return false;
                    }
                    if (typeof node.location?.startOffset !== "number") {
                        return false;
                    }
                    if (node.name === Rules.EXPRESSIONS) {
                        if (node.expression == undefined) {
                            return false;
                        }
                    }
                    return true;
                },
                getVisitorKeys(node) {
                    return Object.keys(node).filter((key) => key in printers);
                },
                isBlockComment(comment) {
                    return (comment as IToken).tokenType.name === TokenType.MULTI_LINE_COMMENT;
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
    async formatDocument(document: TextDocument, options: { useTabs?: boolean; tabWidth?: number }): Promise<string> {
        return format(document.getText(), {
            parser: "syncscript",
            plugins: [this.plugin],
            ...options
        });
    }
}

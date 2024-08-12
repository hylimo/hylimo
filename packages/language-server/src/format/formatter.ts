import { Parser, TokenType } from "@hylimo/core";
import { Plugin, format } from "prettier";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CstNode, IToken } from "chevrotain";
import { Comment, Path, Node } from "./types.js";
import { printers, printComment } from "./printers.js";

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
        let res: any = { name: cst.name, location: cst.location };
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
                        return node.location!.endOffset!;
                    } else {
                        return (node as IToken).endOffset as number;
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
                printComment(commentPath) {
                    return printComment(commentPath.node as Comment);
                },
                canAttachComment(node) {
                    return "name" in node;
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
        }).catch((error) => {
            console.error(error);
            return document.getText();
        });
    }
}

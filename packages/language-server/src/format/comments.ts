import { TokenType } from "@hylimo/core";
import type { Doc } from "prettier";
import { doc } from "prettier";
import type { Path, Options, Node, Comment } from "./types.js";

const { join, hardline, lineSuffix } = doc.builders;

/**
 * Prints all dangling comments
 *
 * @param path the current path
 * @param options the formatting options
 * @returns the formatted comments
 */
export function printDanglingComments(path: Path, options: Options): Doc {
    const node = path.node as Node;
    const comments = (node as { comments?: Comment[] }).comments;
    if (Array.isArray(comments) && comments.length > 0) {
        const parts: Doc = [];
        path.each((comment) => {
            const commentToken = comment.node;
            if (commentToken.trailing || commentToken.leading) {
                return;
            }
            const commentDoc = printComment(commentToken, options);
            if (commentToken.tokenType.name === TokenType.MULTI_LINE_COMMENT) {
                parts.push(commentDoc);
            } else {
                parts.push(lineSuffix(commentDoc));
            }
        }, "comments");
        return [join(hardline, parts)];
    } else {
        return [];
    }
}
/**
 * Prints a comment
 *
 * @param comment the comment to print
 * @param options the formatting options
 * @returns the formatted comment
 */

export function printComment(comment: Comment, options: Options): Doc {
    comment.printed = true;
    if (comment.tokenType.name === TokenType.MULTI_LINE_COMMENT) {
        const image = comment.image;
        const leadingWhitespaceLength = calculateWhitespaceLength(
            getLeadingWhitespace(options.originalText, comment.startOffset),
            options.tabWidth
        );
        const lines = image
            .split("\n")
            .map((line) => decreaseIdentation(line, leadingWhitespaceLength, options.tabWidth));
        return join(hardline, lines);
    } else {
        return comment.image;
    }
}
/**
 * Gets the leading whitespace of a given offset until the last non-whitespace character or newline
 *
 * @param text the text to get the leading whitespace from
 * @param offset the offset to start from
 * @returns the leading whitespace
 */
function getLeadingWhitespace(text: string, offset: number): string {
    let start = offset;
    while (start > 0 && text[start - 1].match(/[^\S\n]/)) {
        start--;
    }
    return text.substring(start, offset);
}
/**
 * Calculates the whitespace length of a given text
 *
 * @param text the purely whitespace text
 * @param tabWidth the width of a tab
 * @returns the length of the text
 */
function calculateWhitespaceLength(text: string, tabWidth: number): number {
    let length = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "\t") {
            length += tabWidth;
        } else {
            length++;
        }
    }
    return length;
}
/**
 * Decreases the indentation of a given text by a given length
 * If a tab causes a larger dedentation than desired, spaces are used to replace it
 *
 * @param text the text to dedent
 * @param length the length to dedent
 * @param tabWidth the width of a tab
 * @returns the dedented text
 */
function decreaseIdentation(text: string, length: number, tabWidth: number): string {
    let i = 0;
    while (length > 0 && i < text.length && text[i].match(/[^\S\n]/)) {
        if (text[i] === "\t") {
            length -= tabWidth;
        } else {
            length--;
        }
        i++;
    }
    const leadingSpaces = " ".repeat(Math.max(-length, 0));
    return leadingSpaces + text.substring(i);
}

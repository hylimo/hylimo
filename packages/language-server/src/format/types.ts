import { CstChildrenDictionary, Rules } from "@hylimo/core";
import { IToken, CstNode } from "chevrotain";
import { AstPath, Doc, ParserOptions } from "prettier";

/**
 * CST node type used by prettier
 */
export type Node = {
    [K in keyof CstChildrenDictionary]: CstChildrenDictionary[K] extends IToken[]
        ? IToken[]
        : CstChildrenDictionary[K] extends CstNode[]
          ? Node[]
          : never;
} & Pick<CstNode, "location"> & { name: Rules } & { comments?: Comment[] };

/**
 * Path type used by prettier
 */
export type Path = AstPath<Node>;
/**
 * Recursive print function provided by prettier
 */
export type Print = (path: Path) => Doc;

/**
 * Prettier parser options
 */
export type Options = ParserOptions<Node>;

/**
 * Context passed to all printers
 */
export interface PrintContext {
    ctx: Node;
    path: Path;
    options: Options;
    print: Print;
}

/**
 * Prettier comment type
 */
export interface Comment extends IToken {
    leading?: boolean;
    trailing?: boolean;
    printed?: boolean;
}

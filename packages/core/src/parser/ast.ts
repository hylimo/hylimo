export enum ExpressionTypes {}

export abstract class Expression {
    constructor(readonly name: String) {}
}

class BlockExpression {}

class LiteralExpression {}

class StringLiteralExpression {}

class NumberLiteralExpression {}

class FunctionExpression {}

class InvocationExpression {}

class FieldAccessExpression {}

class IdentifierExpression {}

---
outline: deep
---

# SyncScript

SyncScript is a general-purpose programming language with focus on flexibility and implementing internal DSLs.
Characteristings:

- Dynamic typing
- Strong typing
- Static/lexical scoping
- Prototype-based object system

Main data types available are

- object
- string
- number
- boolean
- function
- null

## Syntax

The syntax of SyncScript focuses on flexibility for implementing DSLs.
It is inspired by JavaScript, Kotlin and Scala.
Following, we introduce the main syntactic constructs:

### Literals

Literals, including number and string literals are written as in JavaScript:

```
1
3.14
"Hello World"
```

### Comments

Similar, C-Style comments are supported:

```
// This is a line-end comment
/* This is a block comment */
```

### Identifiers

SyncScript uses no keywords, including operator support.
Thus, identifiers are the most important tokens.
Two types of identifiers exist: alphanumeric identifiers and symbolic identifiers.
Alphanumeric identifiers can contain letters, digits, the underscore and the dollar sign.
Examples include:

```
test
test2
hello_world
$variable
```

Symbolic identifiers are sequences of symbols.
Supported symbols are: `!#%&*+-/:<=>?@^|~.`.
Note that some limitations exist: first, a single equal sign is not allowed.
Next, dots are only supported when using at least two consecutive dots.
Examples include:

```
+
==
!=
...
```

Also, underscores and dollar signs are allowed in symbolic identifiers, however, they **must not** be followed by an alphanumerical character.
Examples include:

```
// allowed
__>
// not allowed
-_test
```

### Field Access

To access fields, the dot operator is used:

```
hello.world
```

To assign values to fields, the assignment operator is used:

```
theAnswer = 42
```

The assignment operator can also be used to assign values to fields of objects:

```
hello.world = "Hello World"
```

### Functions & Function Calls

Functions are created by placing expressions into curly braces:

```
testFunction = {
    // body of the function
}
```

Functions always evaluate to their last inner value

```
testFunction = {
    1
    2
    3 // the return value of the function
}
```

To invoke a function, one uses the call-operator:

```
testFunction()
```

Similar to JavaScript, arguments can be provided to the call-operator by placing them in parentheses:

```
testFunction(1, 2, 3)
```

Furthermore, like Kotlin, named arguments are supported:

```
testFunction(a = 1, b = 2, c = 3)
```

Arguments are provided to the function as a single object under the name `args`:

```
createPoint = {
    x = args.x
    y = args.y
    // TODO
}
```

The first index-based argument cal also be accessed under the name `it`:

```
printWrapper = {
    println(it)
}
```

To access further index-based arguments, the destructuring expression can be used:

```
printWrapper = {
    (a, b, c) = args
}
printWrapper(1, 2, 3)
```

The current scope is available under the name `this` and is always an object:

```
println(this.x)
```

When calling a function using a field access expression, the object on which function is called is available under the name `self`.
If a variable is called instead, the current scope is provided as `self`.
Similar to Kotlin, to support higher-order functions, the trailing-lambda syntax can be used when providing a function as the last argument:

```
testFunction("test") {
    // body of the function
}
// is equivalent to
testFunction("test", {
    // body of the function
})
```

Note that unlike Kotlin, multiple trailing lambdas can be used

```
if(condition) {
    // if branch
} {
    // else branch
}
// is equivalent to
if(condition, {
    // if branch
}, {
    // else branch
})
```

### Operators

Syntactically, an oprator is an identifier.
At runtime, operators are resolved to functions.
For more flexibility, field access expressions are also supported as operators:

```
a + b
// is equivalent to
+(a, b)

// field access as operator
a this.+ b
```

As SyncScript differentiates between alphanumerical and symbolic identifiers, in many cases, separating the operator from the operands is not necessary.

```
a+b
// is equivalent to
a + b
```

For flexibility and a good user experience, operators are usually called on the left-hand side operand:

```
+ = {
    (left, right) = args
    left.+(right)
}

// thus, the following are equivalent with this implementation:
a + b
+(a, b)
a.+(b)
```

### Object Literals

Objects can be created using square brackets:

```
point = [
    x = 1
    y = 2
]
```

Similar to how function arguments work, entries without an identifier are assigned to an appropriate index:

```
test = [
    0, // index 0
    x = 1
    2, // index 1
    y = 3
    4 // index 2
]
```

### Brackets

As SyncScript uses functions for operators, no operator priority is defined.
Instead, all expressions are evaluated left to right.
To group expressions, brackets can be used:

```
a + b * c
// is equivalent to
(a + b) * c
// to achive the expected result, use brackets:
a + (b * c)
```

## Data Types

Following, we go over the supported functionality for all basic data types.

### Supported operators

#### String

- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Concatenation: `+` (also works if one operand is not a string)

#### Number

- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Arithmetic: `+`, `-`, `*`, `/`, `%` (modulo)

#### Boolean

- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Logical: `&&`, `||` (short circuiting)

#### Object

- Comparison: `==`, `!=`

#### Null

- Comparison: `==`, `!=`

### Other functionality

#### Object functions

- `get`: retrieves a field from an object, takes the name of the field as an argument
- `rawGet`: similar to get, but does **not** consider the prototype chain
- `set`: sets a field on an object, takes the name of the field and the value as arguments
- `delete`: deletes a field from an object, takes the name of the field as an argument
- `forEach`: takes a function as argument and calls it for each field of the object, the function is called with the name of the field and the value of the field as arguments

#### Function functions

- `callWithScope`: calls a function with a given scope, takes the scope and the arguments object as arguments. Useful for implementing DSL scope-like structures

## Global functionality

Global available functions, in particular control flow structures:

- `if`: if-statement, takes the conditions and 1-2 functions as arguments. If the condition is true, the first function is called, otherwise the second function is called (if provided)
- `while`: while-loop, takes the condition and a function as arguments. As long as the condition is true, the function is called.
- `error`: throws an error, takes the error message as argument
- `Math`: object containing the mathematical functions `floor`, `ceil`, and `round`
- `println`: prints the given arguments to the console, primarily used for debugging
- `!`: negates the given boolean value
- `-`: negates the given number value
- `noedit`: takes a locally-defined function as argument which is executed immediately, marks this function as non-editable from the interactive graphical editor.
- `range`: takes a number as argument and returns a list containing all numbers from 0 to the given number (exclusive)

Global constants:

- `null`: the null value
- `true`: the boolean value true
- `false`: the boolean value false

### Custom Data Types

#### List

To create a list, use the `list` function with any amount of index-based arguments.
A list supports the following functions and fields, and operators:

- `+` (operator): concatenates two lists
- `length` (field): the current length of the list, should not be modified
- `add`: adds the provided element to the end of the list
- `addAll`: adds all elements in the provided list to the list
- `remove`: removes and returns the last element of the list
- `forEach`: similar to object `forEach`, however only iterates over the index-based fields, thus over the list entries
- `map`: similar to forEach, but returns a new list containing the return values of the provided function

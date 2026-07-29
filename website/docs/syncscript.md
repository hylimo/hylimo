---
outline: deep
---

# SyncScript

SyncScript is the language a `.hyl` file is written in.
It is a general-purpose language, but it was designed with one goal in mind: hosting internal DSLs
which read like a notation of their own.
Everything that looks like special diagram syntax - `classDiagram { … }`, `layout { … }`,
`A --> B with { … }` - is an ordinary function call in this language.

```hyl
classDiagram {
    class("Movie")
}
```

::: tip The one thing to remember
SyncScript has **no keywords**.
`if`, `while`, `class` and even `+` are variables which happen to hold functions, and every construct
is built out of function calls, blocks and objects.
Once that clicks, the rest of the language is small.
:::

| Property                    | What it means here                                                 |
| --------------------------- | ------------------------------------------------------------------ |
| Dynamically typed           | Values carry their type, variables do not                          |
| Strongly typed              | No implicit conversions between unrelated types                    |
| Statically/lexically scoped | A function sees the scope it was written in                        |
| Prototype-based             | Objects inherit from a prototype, like in JavaScript               |
| Expression-oriented         | Everything evaluates to a value, including blocks and control flow |

The available data types are `object`, `string`, `number`, `boolean`, `function` and `null`.

## Syntax

The syntax is inspired by JavaScript, Kotlin and Scala.

### Literals

Number and string literals are written as in JavaScript:

```hyl
1
3.14
"Hello World"
```

Strings support the escape sequences `\\`, `\"`, `\n`, `\t` and `\uXXXX`, and can embed expressions:

```hyl
name = "World"
greeting = "Hello ${name}!"
```

### Comments

C-style comments are supported:

```hyl
// This is a line-end comment
/* This is a block comment */
```

### Identifiers

As there are no keywords, identifiers are the most important tokens, and there are three kinds of
them.

**Alphanumeric identifiers** contain letters, digits, the underscore and the dollar sign, and do not
start with a digit:

```hyl
test
test2
hello_world
$variable
```

**Symbolic identifiers** are sequences of symbols out of `!#%&*+-/:<=>?@^|~.`.
They are what makes operators possible: an operator is nothing but an identifier.

```hyl
+
==
!=
...
```

Two limitations exist: a single equal sign is not allowed, as it is the assignment operator, and a
single dot is not allowed either, as it is the access operator - at least two consecutive dots are
needed.
Underscores and dollar signs may be used, but **must not** be followed by an alphanumeric character:

```hyl
// allowed
__>
// not allowed
-_test
```

**Escaped identifiers** are wrapped in backticks and may contain anything except a newline or a
backtick, which allows names which would otherwise be impossible:

```hyl
`my identifier` = 42
```

Because alphanumeric and symbolic identifiers use disjoint character sets, they need no separator:
`a+b` and `a + b` are the same expression.

### Fields

Fields are accessed with the dot operator and assigned with the assignment operator:

```hyl
hello.world
theAnswer = 42
hello.world = "Hello World"
```

### Functions

A function is written as a block of expressions in curly braces, and evaluates to the value of its
last expression:

```hyl
testFunction = {
    1
    2
    3 // the return value of the function
}
```

Calling a function uses the call operator, with positional and - as in Kotlin - named arguments:

```hyl
testFunction()
testFunction(1, 2, 3)
testFunction(a = 1, b = 2, c = 3)
```

Inside the function, all arguments are available as a single object called `args`:

```hyl
createPoint = {
    x = args.x
    y = args.y
}
```

The first positional argument is also available as `it`, and further positional arguments can be
taken apart with a destructuring expression:

```hyl
printWrapper = {
    println(it)
}

printAll = {
    (a, b, c) = args
    println(a)
    println(b)
    println(c)
}
printAll(1, 2, 3)
```

Two more names are always available: `this` is the current scope as an object, and `self` is the
object a function was called on - for a call like `point.translate()` that is `point`, and for the
call of a plain variable it is the current scope.

```hyl
println(this.x)
```

#### Trailing lambdas

If the last argument is a function, it can be written after the parentheses - this is what makes the
diagram DSL readable:

```hyl
testFunction("test") {
    // body of the function
}
// is equivalent to
testFunction("test", {
    // body of the function
})
```

Unlike Kotlin, **several** trailing lambdas are allowed, which is how two-branch control flow works
without any special syntax:

```hyl
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

Syntactically, an operator is just an identifier, and at runtime it is resolved to a function.
Field access expressions may be used as operators as well:

```hyl
a + b
// is equivalent to
+(a, b)

// field access as operator
a this.+ b
```

For flexibility, the global operators delegate to an implementation on their left-hand side operand,
so a type can define what an operator means for it:

```hyl
+ = {
    (left, right) = args
    left.+(right)
}

// with this implementation, all of these are equivalent:
a + b
+(a, b)
a.+(b)
```

::: warning No operator precedence
As operators are ordinary functions, there is no precedence: expressions are evaluated strictly from
left to right.
Use brackets whenever the order matters.

```hyl
a + b * c
// is equivalent to
(a + b) * c
// to get the expected result, use brackets:
a + (b * c)
```

:::

### Objects

Objects are created with square brackets.
Entries without a name are assigned to the next free index, exactly like positional arguments:

```hyl
point = [
    x = 1
    y = 2
]

test = [
    0, // index 0
    x = 1
    2, // index 1
    y = 3
    4 // index 2
]
```

Fields are read and written with the access operator - `point.x` - or with `get` and `set` if the
name is computed.

## Standard library

### Operators by type

| Type      | Operators                                                                              |
| --------- | -------------------------------------------------------------------------------------- |
| `string`  | `==`, `!=`, `<`, `<=`, `>`, `>=`, `+` (concatenation, the right side may be any value) |
| `number`  | `==`, `!=`, `<`, `<=`, `>`, `>=`, `+`, `-`, `*`, `/`, `%`                              |
| `boolean` | `==`, `!=`, `&&`, `\|\|` (short circuiting), `&`, `\|`                                 |
| `object`  | `==`, `!=`                                                                             |
| `null`    | `==`, `!=`                                                                             |

The `??` operator works on any value: it returns its left side, or its right side if the left side is
`null`.
The right side is only evaluated if it is needed.

### Object functions

| Function         | Description                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| `get`            | Reads the field with the given name                                               |
| `rawGet`         | Like `get`, but does **not** consider the prototype chain                         |
| `set`            | Sets the field with the given name to the given value                             |
| `defineProperty` | Defines a field with a custom getter and setter                                   |
| `delete`         | Deletes the field with the given name                                             |
| `forEach`        | Calls the given function for each field, with the value and the name as arguments |
| `toString`       | Converts the object to a string                                                   |

### Function functions

| Function        | Description                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `callWithScope` | Calls the function with a given scope object - this is what makes DSL blocks such as `layout { … }` possible |

### Lists

A list is created with the `list` function, taking any number of positional arguments:

```hyl
numbers = list(1, 2, 3)
```

| Member    | Description                                                                     |
| --------- | ------------------------------------------------------------------------------- |
| `length`  | Field holding the current length, should not be modified                        |
| `+`       | Concatenates two lists                                                          |
| `+=`      | Appends all elements of another list in place                                   |
| `add`     | Appends one element                                                             |
| `addAll`  | Appends all elements of another list                                            |
| `remove`  | Removes and returns the last element                                            |
| `forEach` | Calls the given function for each entry, with the value and the index           |
| `map`     | Like `forEach`, but collects the results into a new list                        |
| `filter`  | Returns a new list with the entries for which the given function returns `true` |
| `some`    | Returns whether the given function returns `true` for at least one entry        |
| `join`    | Joins the entries into a string, with an optional separator                     |
| `toList`  | Converts the index-based fields of an object into a list                        |

### Math

`Math` provides the usual numerical functions:
`abs`, `sign`, `floor`, `ceil`, `round`, `trunc`, `min`, `max`, `pow`, `sqrt`, `cbrt`, `hypot`,
`exp`, `expm1`, `log`, `log2`, `log10`, `log1p`, the trigonometric functions `sin`, `cos`, `tan`,
`asin`, `acos`, `atan`, `atan2` and their hyperbolic counterparts, as well as the constants `PI`,
`E`, `LN2`, `LN10`, `LOG2E`, `LOG10E`, `SQRT2` and `SQRT1_2`.

### Global functions

| Function                                                      | Description                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `if`                                                          | Takes a condition and one or two functions, and calls the first if the condition is `true`, otherwise the second |
| `while`                                                       | Takes a condition **function** and a body function, and calls the body as long as the condition returns `true`   |
| `range`                                                       | Returns a list with the numbers from `0` up to (excluding) the given number, with an optional step               |
| `list`                                                        | Creates a list from its positional arguments                                                                     |
| `error`                                                       | Throws an error with the given message                                                                           |
| `println`                                                     | Prints its arguments, primarily useful for debugging                                                             |
| `toStr`                                                       | Converts any value, including `null`, to a string                                                                |
| `isNumber`, `isString`, `isBoolean`, `isObject`, `isFunction` | Type checks                                                                                                      |
| `!`                                                           | Negates a boolean                                                                                                |
| `-`                                                           | Negates a number                                                                                                 |
| `noedit`                                                      | Takes a locally defined function, executes it immediately and marks it as not editable from the graphical editor |

The condition of `while` is a function, so that it can be evaluated again for each iteration:

```hyl
i = 0
while { i < 10 } {
    println(i)
    i = i + 1
}
```

### Global constants

`null`, `true` and `false`.

## Putting it together

Nothing in the diagram DSL is magic - it is this language plus a set of functions.
The example below defines a function which creates a class with a standard set of members, and uses a
loop to place several of them; the same techniques you would use in any other language.

```hylimo
classDiagram {
    entity = {
        (name, index) = args
        class(name) {
            public {
                id : UUID
            }
        } layout {
            pos = apos(index * 360, 0)
        }
    }

    list("Movie", "Actor", "Studio").forEach {
        (name, index) = args
        entity(name, index)
    }
}
```

::: info Execution limit
A diagram is re-interpreted on every keystroke, so an endless loop would hang the editor.
The interpreter therefore aborts after a fixed number of execution steps and reports an error.
:::

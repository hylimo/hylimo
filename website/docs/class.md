---
outline: deep
---

# UML Class Diagram

To create a UML class diagram, one uses the `classDiagram` diagram function:

```
classDiagram {
    // define elements
}
```

## Elements

The following elements are supported:

### `class`

Creats a new class element, with the defined name, and optional properties and operations:

```
class("Hello world") {
    public {
        x : Int
        test : String
        print(value : String) : void
    }
}
```

Note that properties and functions are defined declaratively, and are not executable code.
Thus, e.g. if `x` is a defined variable, the property is still named `x`, not the value of `x`.
Five different types of visibility are supported:

- `public`
- `private`
- `protected`
- `package`
- `default` (no visibility)

Using the `section` function, one can also add another section to the body of the class

```
class("Test") {
    section(
        "A new string entry",
        "The next string entry"
    )
}
```

To mark a class as abstract, one can use the `abstract` named argument:

```
class("Test", abstract = true) {
    // ...
}
```

Last, the `keywords` named argument can be used to add keywords or stereotypes in guillemets (`«` and `»`):

```
class("TestEnum", keywords = list("enumeration")) {
    public {
        A
        B
        C
    }
}
```

To simplify using classes later in the diagram, `class` automatically sets itself on the current scope if the variable is not yet defined:

```
class("Test")

// is equivalent to
Test = class("Test")
```

### `interface`

Creates a new interface element.
Identical to `class`, however automatically adds the `«interface»` keyword.

```
interface("Test") {
    // ...
}

// is equivalent to
class("Test", keywords = list("interface")) {
    // ...
}
```

### `package`

Creates a UML package with a name

```
package("Test")
```

Optionally, a function can be passed as second parameter, while this function is executed, it has no additional semantics:

```
package("Test") {
    class("TestClass")
}

// is equivalent to
package("Test)
class("TestClass")
```

### `comment`

Allows creating UML comments:

```
comment("This is a comment")
```

## Connections / Associations

Connections / Associations are created using a PlantUMl-inspired operator syntax.
Both sides of the operand can be either points, or canvasElemments, and thus classes, interfaces, packages or comments.
The following operators are supported:

- `--` for a simple association
- `--*` for a composition
- `--<>` for an aggregation
- `extends` for a generalization
- `implements` for an implementation
- `..>` for a dependency
- `--!` for an association not-navigatable in one direction
- `-->` for an association navigatable in one direction
- ... and several combinations of the above, e.g, `!--!`, `*-->`, ...

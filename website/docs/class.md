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

Creates a new class element, with the defined name, and optional properties and operations:

```hylimo
classDiagram {
    class("Hello world") {
        public {
            x : Int
            test : String
            examples : String [0 .. *]
            print(value : String) : void
        }
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

In addition, by providing named arguments `abstract` or `private` to the scope function call, inner entries are in italics / underlined respectively:

```hylimo
classDiagram {
    class("Hello world") {
        public(abstract = true) {
            print(value : String) : void
        }
        public(static = true) {
            create()
        }
    }
}
```

Using the `section` function, one can also add another section to the body of the class:

```hylimo
classDiagram {
    class("Test") {
        section(
            "A new string entry",
            "The next string entry"
        )
    }
}
```

To simplify using classes later in the diagram, `class` automatically sets itself on the current scope if the variable is not yet defined:

```hylimo
classDiagram {
    class("Test")

    // is equivalent to
    Test = class("Test")
}
```

#### Abstract

To mark a class as abstract, one can use the `abstract` named argument:

```hylimo
classDiagram {
    class("Test", abstract = true) {
        // ...
    }
}
```

#### Keywords

The `keywords` named argument can be used to add keywords or stereotypes in guillemets (`«` and `»`):

```hylimo
classDiagram {
    class("TestEnum", keywords = list("Metaclass")) {
        public {
            A
            B
            C
        }
    }
}
```

#### Nesting

Classes can now contain other classes as nested elements, allowing for a more organized hierarchy:

```hylimo
classDiagram {
    class("OuterClass") {
        public {
            outerProperty : String
        }

        class("InnerClass") {
            public {
                innerProperty : Int
            }
        }
    }
}
```

The nested class is scoped within its parent class and will be visually displayed inside the outer class.

#### Ports

Classes can now have ports, which are connection points on the class boundary. Ports can be defined either inside the class block or using dot notation outside the class:

```hylimo
classDiagram {
    class("ClassWithPorts") {
        public {
            input : String
            output : String
        }

        // Define a port inside the class
        port()
    }

    // Define a port outside of the class
    ClassWithPorts.port(0.5)
}
```

For more details, see [UML Component Diagram](component.md#ports)

### `interface`

Creates a new interface element.
Identical to `class`, however automatically adds the `«interface»` keyword.

```hylimo
classDiagram {
    interface("Test") {
        // ...
    }

    // is equivalent to
    class("Test", keywords = list("interface")) {
        // ...
    }
}
```

### `enum`

Creates an enumeration class. Enums are a special type of class and support all class functionality. You can define enum entries using the `entries` block:

```hylimo
classDiagram {
    enum("Color") {
        entries {
            RED
            GREEN
            BLUE
        }
    }
}
```

This is equivalent to creating a class with the "enumeration" keyword:

```hylimo
classDiagram {
    class("Color", keywords = list("enumeration")) {
        default {
            RED
            GREEN
            BLUE
        }
    }
}
```

Enums can also have additional properties and methods like regular classes:

```hylimo
classDiagram {
    enum("Status") {
        entries {
            PENDING
            ACTIVE
            COMPLETED
        }

        public {
            getDescription() : String
        }
    }
}
```

### `package`

Creates a UML package with a name

```hylimo
classDiagram {
    package("Test")
}
```

Packages can contain nested elements, similar to classes:

```hylimo
classDiagram {
    package("TestPackage") {
        class("TestClass") {
            public {
                test : String
            }
        }

        interface("TestInterface") layout {
            pos = apos(390, 0)
        }

        // Nested packages are also possible
        package("NestedPackage") {
            class("NestedClass")
        } layout {
            pos = apos(0, 110)
        }
    }
}
```

The nested elements are scoped within the package and will be visually displayed inside the package.

### `comment`

Allows creating UML comments:

```hylimo
classDiagram {
    comment("This is a comment")
}
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

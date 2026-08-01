---
outline: deep
---

# UML Use Case Diagram

To create a UML use case diagram, use the `useCaseDiagram` function:

```hyl
useCaseDiagram {
    // define elements
}
```

A use case diagram says who uses a system and what they use it for, and it is built from very few
elements: the actors outside the system, the use cases inside it, the subject that separates the two,
and the associations that cross the boundary.
All elements described below are also available in the [general UML diagram](./uml.md).

## Elements

### `useCase`

Creates a use case, rendered as an ellipse with its name inside:

```hylimo
useCaseDiagram {
    useCase("Place order")
}
```

The ellipse is grown around its name rather than the name being squeezed into a fixed oval, so a long
name widens the use case instead of overflowing it.

#### Extension points

A use case that is extended by another one names the points at which that may happen.
They are declared with `extensionPoints`, and are rendered in a compartment of their own below the
name, under the heading UML prescribes for it.
As with [enum entries](./class.md#enum), the block is not executed but read on the AST level, so the
points may be written as identifiers or as strings:

```hylimo
useCaseDiagram {
    useCase("Place order") {
        extensionPoints {
            "Payment declined"
            Timeout
        }
    }
}
```

#### Further compartments

A use case is a classifier, so `section` adds a plain compartment, which is where a precondition or a
postcondition is usually written:

```hylimo
useCaseDiagram {
    useCase("Ship order") {
        section("{ precondition: order is paid }")
    }
}
```

### `actor`

Creates an actor, rendered as a stick man.
This is the same element the [sequence diagram](./sequence.md#actor) uses:

```hylimo
useCaseDiagram {
    actor("Customer")
}
```

### `systemActor`

Creates an actor in the rectangle notation, the alternative UML offers for the stick man.
It is a classifier carrying the `«actor»` keyword, and is conventionally used for the actors which
are not people - external systems, clocks, sensors - so that a reader can tell at a glance which of
the actors is human:

```hylimo
useCaseDiagram {
    systemActor("Payment Gateway")
}
```

Both notations mean the same thing, and both are associated with a use case in exactly the same way.

### `subject`

Creates the subject, the system boundary: a rectangle with its name at the top, holding the use cases
that apply to it.

```hylimo
useCaseDiagram {
    subject("Online Shop") {
        useCase("Browse catalog")

        useCase("Place order") layout {
            pos = apos(0, 200)
        }
    }
}
```

Drawing a use case inside the subject is the whole of the statement that it belongs to that system,
so nothing else has to be written down for it.
Actors belong outside, and only the association crosses the boundary - which it may, as the use cases
inside a subject are registered in the diagram scope just like every other element:

```hylimo
useCaseDiagram {
    actor("Customer") layout {
        pos = apos(0, 200)
    }

    subject("Online Shop") {
        useCase("Place order")
    } layout {
        pos = apos(350, 0)
    }

    Customer -- `Place order`
}
```

### Further elements

`instance`, `package` and `comment` are available as well, and behave exactly as in the
[class diagram](./class.md).

## Connections

A use case diagram draws its connections as straight lines rather than as the axis-aligned routes the
other diagram types use, so this is the one diagram type where `defaultLineType` defaults to `line`,
see [config properties](#config-properties).
A connection therefore needs no `over` at all unless it should leave its elements somewhere other
than the default, which is the right side of the start and the left side of the end.

### Association

The line between an actor and a use case is a plain association, so the `--` operator already is one.
Multiplicities are written on it as ordinary labels:

```hylimo
useCaseDiagram {
    actor("Customer")

    useCase("Place order") layout {
        pos = apos(450, 0)
    }

    Customer -- `Place order` with {
        label("1", 0.1, -15)
        label("*", 0.9, -15)
    }
}
```

### `«include»` and `«extend»`

Both are dependencies, and are distinguished from any other dependency only by their keyword.
They are therefore written with the dashed arrow `..>` and an `«include»` respectively `«extend»`
label, the same way the [deployment diagram](./deployment.md#deployment-and-manifestation) writes its
stereotyped dependencies.

The two point in opposite directions, which is the part worth getting right: an `«include»` points
from the base use case to the one it always includes, an `«extend»` from the extending use case back
to the base one it may extend.

```hylimo
useCaseDiagram {
    useCase("Offer voucher")

    useCase("Place order") layout {
        pos = apos(550, 0)
    }

    useCase("Authenticate") layout {
        pos = apos(1100, 0)
    }

    `Offer voucher` ..> `Place order` with {
        label(keyword("extend"), 0.5, -25)
    }

    `Place order` ..> Authenticate with {
        label(keyword("include"), 0.5, -25)
    }
}
```

The condition of an `«extend»` and the extension point it applies to are written in a
[comment](./class.md#comment) attached to the connection.

### Generalization

An actor may specialize another actor, and a use case another use case.
Both are the ordinary generalization, so the `extends` operator is used for them:

```hylimo
useCaseDiagram {
    actor("Customer")

    actor("Registered customer") layout {
        pos = apos(0, 300)
    }

    `Registered customer` extends Customer with {
        over = start(Position.Top).line(end(Position.Bottom))
    }
}
```

### Further connections

For additional connection types, refer to the [class diagram documentation](class.md).

## Config properties

The following config properties are available for use case diagrams:

| Variable             | Meaning                                                             | Default value | Comment                                                                      |
| -------------------- | ------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `abstractAsProperty` | Whether to show { abstract } after the name of abstract classifiers | false         | -                                                                            |
| `defaultLineType`    | How a connection without an explicit `over` is routed               | "line"        | `"axisAligned"` in every other diagram type, see [connections](#connections) |

## Example

The following example shows a small shop, using all of the elements described above:

<DiagramExample id="usecase" />

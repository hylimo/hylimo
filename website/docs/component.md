---
outline: deep
---

# UML Component Diagram

To create a UML component diagram, use the `componentDiagram` function with component elements:

```
componentDiagram {
    // define elements
}
```

All elements described below are also available in the [general UML diagram](./uml.md).

## Elements

### `component`

Creates a new component element, supporting features similar to classes:

```hylimo
componentDiagram {
    component("MyComponent") {
        public {
            property1 : String
            method1() : void
        }
        private {
            secretMethod() : int
        }
    }
}
```

#### Class Features

For details, see [UML Class Diagram](./class.md#class)

- **Properties and Methods:** Define public, private, protected, package, or default sections for properties and methods, just like in class diagrams.
- **Abstract & Keywords:** Use `abstract = true` to mark a component as abstract, and `keywords = list("stereotype")` to add stereotypes or keywords in guillemets (`« »`).

#### Nesting

Components can contain other components, classes, or interfaces, allowing for hierarchical organization:

```hylimo
componentDiagram {
    component("Outer") {
        component("Inner") {
            // ...
        }
    }
}
```

#### Ports

Components can have ports, which are connection points for interfaces or other elements. Ports can be defined inside the component block or using dot notation outside:

```hylimo
componentDiagram {
    component("Comp") {
        port()
    }
    Comp.port(0.5)
}
```

Ports can also have interfaces (see below).

#### Required and Provided Interfaces

Components can declare required and provided interfaces using the `provides` and `requires` functions. These can be placed inside the component or attached to ports:

```hylimo
componentDiagram {
    component("Service") {
        provides("REST")
        requires("gRPC", 0.5)
    }
}
```

- **Syntax:**
  - `provides([name], pos, [target], dist = dist, namePos = [x, y])`
  - `requires([name], pos, [target], dist = dist, namePos = [x, y])`
  - All arguments are optional.
  - `name` is the interface name (can be omitted).
  - `pos` is the relative position on the component outline (0 = right, 0.25 = bottom, 0.5 = left, 0.75 = top).
  - `target` can be used for directly connected notation.
  - `dist` controls the distance of the interface symbol from the component.
  - `namePos` can adjust the label position.

Example for directly connected notation:

```hylimo
componentDiagram {
    component("Service A")

    component("Service B") layout {
        pos = apos(0, 250)
    }

    `Service B`.provides("REST", 0.75, namePos = [52, -9])

    `Service A`.requires(0.25, REST)
}
```

Interfaces can also be attached to ports:

```hylimo
componentDiagram {
    component("Comp") {
        // inside
        port(0.25).provides("API", 0.25)
    }

    // or outside
    Comp.port(0.75).requires(0.75)
}
```

## Connections / Associations

### `dependsOn`

Instead of directly connecting a `required` to a `provided` interface, a `dependsOn` dashed arrow can be used:

```hylimo
componentDiagram {
    component("Service A")

    component("Service B") layout {
        pos = apos(0, 350)
    }

    `Service B`.provides("REST", 0.75, namePos = [52, -9])

    required = `Service A`.requires(0.25)

    required dependsOn REST
}
```

::: warning

This connection operator is only supported for connecting `required` to `provided` interfaces, the layout will be incorrect for all other uses.
Also, do not use the `..>` operator for this use case.

:::

### Further Connections

For additional connection types (associations, aggregations, etc.), refer to the [class diagram documentation](class.md).

## Config properties

The following config properties are available for component diagrams:

| Variable               | Meaning                                                           | Default value (in pixels) | Comment |
| ---------------------- | ----------------------------------------------------------------- | ------------------------- | ------- |
| `abstractAsProperty`   | Whether to show { abstract } after the name of abstract classes   | false                     | -       |
| `providesDistance`     | Default distance of provided interfaces to the classifier outline | 100                       | -       |
| `requiresDistance`     | Default distance of required interfaces to the classifier outline | 100                       | -       |
| `showComponentKeyword` | Whether to show the component keyword                             | true                      | -       |
| `showComponentSymbol`  | Whether to show the component symbol                              | true                      | -       |

## Styling

The following [style variables](./diagram.md#style-variables) are used by the component diagram elements:

| Variable                | Meaning                                        | Default value (in pixels) |
| ----------------------- | ---------------------------------------------- | ------------------------- |
| `componentIconSize`     | Size of the component symbol in the title      | 25                        |
| `providedInterfaceSize` | Diameter of the circle of a provided interface | 30                        |
| `requiredInterfaceSize` | Size of the socket of a required interface     | 45                        |

## Example

The following example shows the architecture of a small shop, using most of the elements described above:

```hylimo
componentDiagram {
    component("Shop", keywords = list("subsystem")) {
        component("Catalog")

        component("Cart") layout {
            pos = apos(0, 240)
        }

        Cart ..> Catalog with {
            over = start(Position.Top).line(end(Position.Bottom))
        }
    } layout {
        pos = apos(0, 0)
    }

    Shop.port(0.75).provides("Web", 0.75)

    component("PaymentService") {
        public {
            authorize(amount : Money) : Token
        }
    } layout {
        pos = apos(0, 380)
    }

    PaymentService.provides("Payment", 0.75, dist = 60, namePos = [60, -9])
    Shop.requires(0.25, Payment)

    component("Warehouse") layout {
        pos = apos(800, 0)
    }

    Warehouse.provides("Stock", 0.5, namePos = [0, -34])
    stockRequired = Shop.requires(0)
    stockRequired dependsOn Stock

    note = comment("The shop is deployed as a single container") layout {
        pos = apos(-600, 0)
    }
    Shop .. note with {
        over = start(0.5).line(end(0))
    }
}
```

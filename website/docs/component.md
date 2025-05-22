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
  - `requires(pos, [target])`
  - All arguments are optional.  
  - `name` is the interface name (can be omitted).  
  - `pos` is the relative position on the component outline (0 = top, 0.5 = right, etc.).  
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

### Connections / Associations

#### `dependsOn`

Instead of directly connecting a `required` to a `provided` interface, a `dependsOn`dashed arrow can be used:

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

#### Further Connections

For additional connection types (associations, aggregations, etc.), refer to the [class diagram documentation](class.md).

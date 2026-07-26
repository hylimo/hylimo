---
outline: deep
---

# UML Diagram

To create a general UML diagram, one uses the `umlDiagram` diagram function:

```
umlDiagram {
    // define elements
}
```

The general UML diagram provides the elements of all other UML diagram types except the sequence diagram, so it can be used for diagrams which do not fit exactly one diagram type, or which mix several of them.
Each element behaves exactly like in the diagram type it belongs to, therefore this page only gives one example per element and links to the diagram type documenting it in detail.

::: tip

If your diagram is a class, component or activity diagram, prefer the respective diagram type: it offers the same elements, but its toolbox and its generated edits are tailored to that diagram type.
Sequence diagrams are not part of the general UML diagram at all, as their participants require the [sequence diagram specific layouting](./sequence.md#positioning) - use `sequenceDiagram` for them.

:::

## Classifiers

Classifiers are the box-shaped elements with a title and optional compartments.
They all register themselves in the diagram scope under their name, so they can be referenced later on.

### `class`

Creates a class, see [UML Class Diagram](./class.md#class):

```hylimo
umlDiagram {
    class("Order") {
        public {
            id : String
            total() : Money
        }
    }
}
```

### `interface`

Creates an interface, a class with the `«interface»` keyword, see [UML Class Diagram](./class.md#interface):

```hylimo
umlDiagram {
    interface("Payable") {
        public {
            pay(amount : Money) : void
        }
    }
}
```

### `enum`

Creates an enumeration, see [UML Class Diagram](./class.md#enum):

```hylimo
umlDiagram {
    enum("OrderState") {
        entries {
            NEW
            PAID
        }
    }
}
```

### `component`

Creates a component, see [UML Component Diagram](./component.md#component):

```hylimo
umlDiagram {
    component("Shop")
}
```

### `instance`

Creates an instance, a classifier with an underlined title and optional values, see [UML Sequence Diagram](./sequence.md#instance):

```hylimo
umlDiagram {
    instance("order", "Order") {
        values {
            id = "4711"
            paid = true
        }
    }
}
```

### `actor`

Creates an actor, see [UML Sequence Diagram](./sequence.md#actor):

```hylimo
umlDiagram {
    actor("Customer")
}
```

### `package`

Creates a package, see [UML Class Diagram](./class.md#package):

```hylimo
umlDiagram {
    package("ordering") {
        class("Order")
    }
}
```

### `comment`

Creates a comment, see [UML Class Diagram](./class.md#comment):

```hylimo
umlDiagram {
    comment("Orders are archived after 10 years")
}
```

## Classifier content

The content of a classifier is defined by the function passed to it, and works the same for all classifiers.

### Properties and methods

Properties and methods are declared in a visibility block, one of `public`, `private`, `protected`, `package` and `default`, see [UML Class Diagram](./class.md#class):

```hylimo
umlDiagram {
    class("Order") {
        public {
            id : String
        }
        private(static = true) {
            counter : Int
        }
    }
}
```

### `section`

Adds an additional compartment with plain text entries, see [UML Class Diagram](./class.md#class):

```hylimo
umlDiagram {
    class("Order") {
        section("{ total = sum(items.price) }")
    }
}
```

### `entries`

Adds the entries of an enumeration, see [UML Class Diagram](./class.md#enum):

```hylimo
umlDiagram {
    enum("OrderState") {
        entries {
            NEW
            PAID
        }
    }
}
```

### `values`

Adds the values of an instance, see [UML Sequence Diagram](./sequence.md#instance):

```hylimo
umlDiagram {
    instance("order", "Order") {
        values {
            id = "4711"
        }
    }
}
```

### Nesting

Classifiers can contain other classifiers, which are then displayed inside of them, see [UML Class Diagram](./class.md#nesting):

```hylimo
umlDiagram {
    component("Shop") {
        component("Cart")
    }
}
```

### `port`

Adds a port, a connection point on the outline of a classifier, see [UML Component Diagram](./component.md#ports):

```hylimo
umlDiagram {
    component("Shop") {
        port()
    }

    Shop.port(0.5)
}
```

### `provides` and `requires`

Add a provided or required interface to a classifier or one of its ports, see [UML Component Diagram](./component.md#required-and-provided-interfaces):

```hylimo
umlDiagram {
    component("Shop") {
        provides("Web", 0.75)
        requires("Payment", 0.25)
    }
}
```

## Activity nodes

In contrast to classifiers, activity nodes have no compartments: each node is a single shape with its label centered inside.

### `action`

Creates an action, the primary node of an activity diagram, optionally with pins, see [UML Activity Diagram](./activity.md#action):

```hylimo
umlDiagram {
    action("Ship order") {
        pin(0.5, "order")
    }
}
```

### `object` and `signalObject`

Create an object node, respectively an object node for a signal, see [UML Activity Diagram](./activity.md#object):

```hylimo
umlDiagram {
    object("Order", state = "accepted")

    signalObject("Shipment") layout {
        pos = apos(250, 0)
    }
}
```

### `decision` and `merge`

Create a decision, respectively a merge node, see [UML Activity Diagram](./activity.md#decision-and-merge):

```hylimo
umlDiagram {
    decision("Order valid?")

    merge() layout {
        pos = apos(250, 0)
    }
}
```

### `fork` and `join`

Create a fork, respectively a join node, see [UML Activity Diagram](./activity.md#fork-and-join):

```hylimo
umlDiagram {
    fork()

    join(vertical = true) layout {
        pos = apos(300, 0)
    }
}
```

### `start`, `stop` and `end`

Create the nodes at which a flow begins and terminates, see [UML Activity Diagram](./activity.md#start-stop-and-end):

```hylimo
umlDiagram {
    start()

    stop() layout {
        pos = apos(100, 0)
    }

    end() layout {
        pos = apos(200, 0)
    }
}
```

### `sendSignal` and `acceptEvent`

Create the signal nodes, see [UML Activity Diagram](./activity.md#sendsignal-and-acceptevent):

```hylimo
umlDiagram {
    sendSignal("Order shipped")

    acceptEvent("Payment received") layout {
        pos = apos(250, 0)
    }
}
```

### `connector`

Creates a connector, used in pairs to split a long flow into multiple parts, see [UML Activity Diagram](./activity.md#connector):

```hylimo
umlDiagram {
    connector("A")
}
```

## Connections

All connection operators of the class diagram are available, see [UML Class Diagram](./class.md#connections-associations):

```hylimo
umlDiagram {
    class("Order")

    class("OrderItem") layout {
        pos = apos(400, 0)
    }

    Order *--> OrderItem with {
        label("1..*", 0.85, -12)
    }
}
```

The `-->` operator is also used for the control and object flows of an activity, see [UML Activity Diagram](./activity.md#connections-flows), and `dependsOn` connects a required to a provided interface, see [UML Component Diagram](./component.md#dependson).

## Config properties

The following config properties are available for general UML diagrams:

| Variable               | Meaning                                                           | Default value (in pixels) | Comment |
| ---------------------- | ----------------------------------------------------------------- | ------------------------- | ------- |
| `abstractAsProperty`   | Whether to show { abstract } after the name of abstract classes   | false                     | -       |
| `providesDistance`     | Default distance of provided interfaces to the classifier outline | 100                       | -       |
| `requiresDistance`     | Default distance of required interfaces to the classifier outline | 100                       | -       |
| `showComponentKeyword` | Whether to show the component keyword                             | true                      | -       |
| `showComponentSymbol`  | Whether to show the component symbol                              | true                      | -       |

## Styling

The following [style variables](./diagram.md#style-variables) are used by the general UML diagram elements:

| Variable                | Meaning                                         | Default value (in pixels) |
| ----------------------- | ----------------------------------------------- | ------------------------- |
| `componentIconSize`     | Size of the component symbol in the title       | 25                        |
| `providedInterfaceSize` | Diameter of the circle of a provided interface  | 30                        |
| `requiredInterfaceSize` | Size of the socket of a required interface      | 45                        |
| `commentTriangleSize`   | Size of the folded corner of a comment          | 20                        |
| `barLength`             | Length of a fork / join bar                     | 200                       |
| `barThickness`          | Thickness of a fork / join bar                  | 10                        |
| `terminalNodeSize`      | Diameter of the `start`, `stop` and `end` nodes | 30                        |
| `pinSize`               | Edge length of a pin                            | 20                        |
| `pinLabelDistance`      | Distance of a pin label to the pin              | 8                         |

## Example

The following example mixes the elements of several UML diagram types in one diagram:
the `Shop` component, the classes it operates on, and the activity it performs.

```hylimo
umlDiagram {
    component("Shop") {
        public {
            checkout(cart : Cart) : Order
        }
    } layout {
        pos = apos(0, 0)
    }

    Shop.provides("Web", 0.75)

    class("Order") {
        public {
            id : String
            state : OrderState
        }
    } layout {
        pos = apos(-620, 260)
    }

    enum("OrderState") {
        entries {
            NEW
            PAID
        }
    } layout {
        pos = apos(-620, 560)
    }

    instance("order", "Order") {
        values {
            id = "4711"
        }
    } layout {
        pos = apos(-180, 560)
    }

    actor("Customer") layout {
        pos = apos(-300, -100)
    }

    Shop ..> Order with {
        over = start(0.5).axisAligned(-0.5, end(0.75))
    }

    Order --> OrderState with {
        over = start(0.25).line(end(0.75))
        label("+state", 0.5, -12)
    }

    order ..> Order with {
        over = start(0.75).line(end(0.19))
    }

    Customer --> Shop with {
        over = start(0).line(end(0.5))
        label("uses", 0.5, -12)
    }

    start("begin") layout {
        pos = apos(500, 40)
    }
    action("Receive order") layout {
        pos = apos(500, 140)
    }
    decision("Order valid?") layout {
        pos = apos(500, 280)
    }
    action("Reject order") layout {
        pos = apos(840, 280)
    }
    end("rejected") layout {
        pos = apos(840, 450)
    }
    action("Ship order") layout {
        pos = apos(500, 450)
    }
    stop("done") layout {
        pos = apos(500, 590)
    }

    begin --> `Receive order` with {
        over = start(0.25).line(end(0.75))
    }
    `Receive order` --> `Order valid?` with {
        over = start(0.25).line(end(0.75))
    }
    `Order valid?` --> `Ship order` with {
        over = start(0.25).line(end(0.75))
        label("[yes]", 0.5, -20)
    }
    `Order valid?` --> `Reject order` with {
        label("[no]", 0.5, -20)
    }
    `Reject order` --> rejected with {
        over = start(0.25).line(end(0.75))
    }
    `Ship order` --> done with {
        over = start(0.25).line(end(0.75))
    }

    note = comment("The activity is performed by the shop") layout {
        pos = apos(0, 300)
    }
    Shop .. note with {
        over = start(0.25).line(end(0.75))
    }
}
```

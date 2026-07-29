---
outline: deep
---

# UML Activity Diagram

To create a UML activity diagram, one uses the `activityDiagram` diagram function:

```hyl
activityDiagram {
    // define elements
}
```

Every node of an activity diagram is a regular element, positioned like a class in a class diagram, and every flow is a regular [connection](./diagram.md#with-operator).
There is no separate control flow syntax: what you write is what is placed on the canvas, so nodes can be moved and connections rerouted in the graphical editor just like in the other diagram types.
All elements described below are also available in the [general UML diagram](./uml.md).

## Elements

In contrast to classifiers like classes and components, activity nodes have no compartments: each node is a single shape with its label centered inside.
All nodes share the `activity-node-element` class and additionally carry a class named after their type, e.g. `action-element` or `decision-element`, while the shape inside a node carries the `activity-node` class and its type name.

Nodes which render a text register themselves in the diagram scope under that text, exactly like a class does:

```hylimo
activityDiagram {
    action("Ship order")

    // is equivalent to
    `Ship order` = action("Ship order")
}
```

Nodes which render no text at all - `start`, `stop`, `end`, `fork` and `join` - instead take an optional name as their first argument, which is only used to register them:

```hylimo
activityDiagram {
    start("begin")

    action("Ship order") layout {
        pos = apos(150, 0)
    }

    begin --> `Ship order`
}
```

The nodes which have no content of their own get their default size from a [style variable](#styling).
Each of them can be resized individually, either by dragging it in the graphical editor or by setting `width` and `height` in its `layout` block:

```hylimo
activityDiagram {
    end()

    end() layout {
        pos = apos(80, 0)
        width = 60
        height = 60
    }

    fork() layout {
        pos = apos(0, 80)
        width = 200
        height = 20
    }
}
```

### `action`

Creates an action, the rounded rectangle which is the primary node of an activity diagram:

```hylimo
activityDiagram {
    action("Receive order")
}
```

#### Keywords

The `keywords` named argument adds keywords or stereotypes in guillemets (`«` and `»`) above the name:

```hylimo
activityDiagram {
    action("Process order", keywords = list("subactivity"))
}
```

#### Pins

Actions can have pins, the small squares representing their input and output parameters.
A pin is placed completely outside of the outline of the action, at a relative position on it: `0` is the right, `0.25` the bottom, `0.5` the left and `0.75` the top of the node.

Pins can be defined inside the action block, or using dot notation outside of it:

```hylimo
activityDiagram {
    action("Ship order") {
        pin(0.5, "order")
    }

    `Ship order`.pin(0, "shipment")
}
```

If a name is provided, it is rendered as a label next to the pin, and the pin is registered in the diagram scope under that name, so a flow can be connected directly to it.
The position of the label can be adjusted with the `namePos` named argument, which takes the x and y offset relative to its default position:

```hylimo
activityDiagram {
    action("Ship order") {
        pin(0.75, "order", namePos = [60, 10])
    }
}
```

### `object`

Creates an object node, a rectangle holding the name of the object which flows between two actions:

```hylimo
activityDiagram {
    object("Order")
}
```

The optional `state` named argument adds the state of the object in brackets, and `keywords` works just like for actions, which is how data stores and central buffers are expressed:

```hylimo
activityDiagram {
    object("Order", state = "accepted")

    object("Orders", keywords = list("datastore")) layout {
        pos = apos(250, 0)
    }
}
```

### `signalObject`

Creates a signal object node: an object node for tokens whose type is a signal.
It takes the same arguments as `object`, but is rendered with a point on the right and a matching notch on the left, so it interlocks with the [signal nodes](#sendsignal-and-acceptevent) it sits between:

```hylimo
activityDiagram {
    sendSignal("Order shipped")

    signalObject("Shipment") layout {
        pos = apos(230, 0)
    }

    acceptEvent("Shipment received") layout {
        pos = apos(460, 0)
    }
}
```

### `decision` and `merge`

Both are rendered as a diamond.
If a text is given, it is rendered inside the diamond, otherwise the plain diamond is drawn:

```hylimo
activityDiagram {
    decision()

    decision("Order valid?") layout {
        pos = apos(150, 0)
    }

    merge() layout {
        pos = apos(400, 0)
    }
}
```

The guards of the outgoing flows of a decision node are usually written as labels on the connections, see [Guards](#guards).

### `fork` and `join`

Both are rendered as a filled bar, `fork` splitting one flow into several concurrent ones, and `join` synchronizing them again.
By default the bar is horizontal, meaning it splits a flow running from top to bottom.
With the `vertical` named argument, the bar is rotated for a flow running from left to right:

```hylimo
activityDiagram {
    fork()

    join(vertical = true) layout {
        pos = apos(300, 0)
    }
}
```

### `start`, `stop` and `end`

The nodes at which a flow begins and terminates:

- `start` is the initial node, the filled circle a flow starts at
- `stop` is the activity final node, which terminates the whole activity
- `end` is the flow final node, which terminates only the flow reaching it

```hylimo
activityDiagram {
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

The signal nodes: `sendSignal` is drawn with a point on the right, `acceptEvent` with a matching notch on the left, so that a send/accept pair interlocks:

```hylimo
activityDiagram {
    sendSignal("Order shipped")

    acceptEvent("Payment received") layout {
        pos = apos(250, 0)
    }
}
```

The signal travelling between such a pair is an [object node](#signalobject) carrying both the point and the notch.

### `connector`

Creates a connector, a small circle holding a label.
Connectors are used in pairs to split a long flow into multiple parts: the flow entering the first one continues at the second one carrying the same label.

```hylimo
activityDiagram {
    action("Ship order")

    connector("A") layout {
        pos = apos(250, 0)
    }

    `Ship order` --> A
}
```

### `comment`

Comments work just like in [class diagrams](class.md#comment):

```hylimo
activityDiagram {
    action("Ship order")

    note = comment("Only if the order was paid") layout {
        pos = apos(250, 0)
    }

    `Ship order` .. note
}
```

## Connections / Flows

Control flows and object flows are created with the same operator syntax as the associations of a class diagram, using `-->` for a flow:

```hylimo
activityDiagram {
    action("Receive order")

    action("Ship order") layout {
        pos = apos(300, 0)
    }

    `Receive order` --> `Ship order`
}
```

All [connection operators](class.md#connections-associations) are available, so `..>` can for example be used for a dependency to a comment.

### Guards

A guard is a regular connection label, created with the `label` function of the `with` operator, which takes the text, the relative position on the connection and the distance to it:

```hylimo
activityDiagram {
    decision("Order valid?")

    action("Ship order") layout {
        pos = apos(350, 0)
    }

    `Order valid?` --> `Ship order` with {
        label("[valid]", 0.5, -20)
    }
}
```

### Flow direction

By default a connection starts at the right (`0`) of its source and ends at the left (`0.5`) of its target, which fits an activity flowing from left to right.
For the more common top to bottom flow, route the connection from the bottom (`0.25`) of the source to the top (`0.75`) of the target:

```hylimo
activityDiagram {
    action("Receive order")

    action("Ship order") layout {
        pos = apos(0, 150)
    }

    `Receive order` --> `Ship order` with {
        over = start(0.25).line(end(0.75))
    }
}
```

To route around other nodes, use `axisAligned` instead of `line`, where a negative position starts the segment horizontally and a positive one vertically:

```hylimo
activityDiagram {
    fork("split")

    action("Ship order") layout {
        pos = apos(-130, 150)
    }

    action("Send invoice") layout {
        pos = apos(130, 150)
    }

    split --> `Ship order` with {
        over = start(0.3).axisAligned(-0.5, end(0.75))
    }
    split --> `Send invoice` with {
        over = start(0.2).axisAligned(-0.5, end(0.75))
    }
}
```

The two flows leave the bar at different points instead of both starting in its middle.
On a bar, `0.25` is the middle of its bottom edge and `0.75` the middle of its top edge, and `0.125` more or less walks from there all the way to a corner, so `0.2` and `0.3` are 40% of the way to the right and to the left end.

## Config properties

The activity diagram does not provide any config properties.

## Styling

The following [style variables](./diagram.md#style-variables) are used by the activity diagram elements:

| Variable           | Meaning                                         | Default value (in pixels) |
| ------------------ | ----------------------------------------------- | ------------------------- |
| `barLength`        | Length of a fork / join bar                     | 200                       |
| `barThickness`     | Thickness of a fork / join bar                  | 10                        |
| `terminalNodeSize` | Diameter of the `start`, `stop` and `end` nodes | 30                        |
| `pinSize`          | Edge length of a pin                            | 20                        |
| `pinLabelDistance` | Distance of a pin label to the pin              | 8                         |

## Example

The following example shows the handling of an order, using most of the elements described above:

<DiagramExample id="activity" />

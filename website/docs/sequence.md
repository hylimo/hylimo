---
outline: deep
---

# UML Sequence Diagram

To create a UML sequence diagram, one uses the `sequenceDiagram` diagram function:

```
sequenceDiagram {
    // define elements
}
```

In contrast to the other diagram types, the elements of a sequence diagram are not positioned by hand.
Since a sequence diagram models **when** (and where) something happens, it is defined in the order in which it happens: participants are placed on the x axis in the order in which they are declared, and everything else is placed on the y axis in the order in which it is declared.
In other words: order matters.
The diagram always knows only the currently available information and nothing on top, which is what makes sequence diagrams defined in HyLiMo maintainable: inserting an interaction moves everything after it down, without having to touch a single coordinate.

## Terminology

In a sequence diagram, we have the following concepts:

- Participant: a component that "participates" in the diagram, so something/someone whose behavior should be modeled.
  It can be a [`participant`](#participant), an [`instance`](#instance), an [`actor`](#actor) or a [`component`](#component)
- Lifeline: the entire duration a participant is alive, symbolized by the dotted line downwards
- Activity indicator: the time a participant is active, visualized by a white rectangle on the lifeline
- Message: arrow between two participants at specific y positions with a semantic meaning
- Frame: a box around a section of the diagram. Can optionally contain a name (i.e. `if`, `while`), and sub compartments (fragments)

## Elements

All participants are declared first, in the order in which they should appear from left to right:

```hylimo
sequenceDiagram {
    participant("Bob")
    instance("Shop")
    actor("Admin")
    component("Shop-Frontend")
}
```

Participant names are registered as variables if they did not exist already.
In case they existed already, the existing name takes precedence.
If their name is already used by something else, you can assign the result of these functions to a variable of your own choosing:

```hylimo
sequenceDiagram {
    Bob = true
    user = participant("Bob")
    participant("Charlie")
    user --> Charlie
}
```

### `participant`

Creates a participant, which is an abstract concept of someone who participates in the diagram.
The name is not underlined, and it can be given a class name, which is rendered as `name:Class`:

```hylimo
sequenceDiagram {
    participant("User")
    participant("bob", "User")
}
```

**params**:

- 0: the optional name of the participant, if not given, the second parameter must be provided
- 1: the optional class name of this participant
- 2: the callback function of this participant
- `keywords`: the keywords of the participant
- `below`: the optional participant below which this participant should be placed. If set, this participant will have the same x coordinate as the given value and the y coordinate of the current position
- `at`: the absolute y position where to create the participant. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `margin`: horizontal margin between this and the previous participant. Defaults to `participantMargin`

**returns**: The created participant

With `at` and `after`, the creation of a participant can be postponed, which is how object creation is expressed:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B", after = 20)
    delay(20)
}
```

### `instance`

Creates an instance, a participant with an underlined name and support for values:

```hylimo
sequenceDiagram {
    instance("cart", "Cart") {
        values {
            items = 3
            total = 42.5
        }
    }
}
```

**params**:

- 0: the optional name of the instance, if not given, the second parameter must be provided
- 1: the optional class name of this instance
- 2: the callback function of this instance
- `keywords`: the keywords of the instance
- `below`: the optional participant below which this instance should be placed. If set, this instance will have the same x coordinate as the given value and the y coordinate of the current position
- `at`: the absolute y position where to create the instance. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `margin`: horizontal margin between this and the previous instance. Defaults to `participantMargin`

**returns**: The created instance

### `actor`

Creates a stickman figure symbolizing a user:

```hylimo
sequenceDiagram {
    actor("Admin")
}
```

**params**:

- 0: the name of the actor
- 1: the optional class name of this actor, or a function that sets the instance values of this actor, making this actor instanced
- 2: the callback function of this actor
- `keywords`: the keywords of the actor
- `below`: the optional participant below which this actor should be placed. If set, this actor will have the same x coordinate as the given value and the y coordinate of the current position
- `at`: the absolute y position where to create the actor. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `margin`: horizontal margin between this and the previous actor. Defaults to `participantMargin`

**returns**: The created actor

#### Instanced actors

An actor can be seen as an `instance` too if you need it to.
In this case, the actor is an `instance` with a stickman on top.
To build an instanced actor, pass the function declaring the instance values as second parameter:

```hylimo
sequenceDiagram {
    user = actor("user") {
        values {
            age = 30
            isGrownUp = true
        }
    }

    instance("other")
    activate(user)
    activate(other)
    user.after(10) -->> other
    deactivate(user, after = 10)
    deactivate(other)
}
```

The stickman can then be styled/layouted using `actor-element`.
To access the created instance, use `<return value>.instance`.

### `component`

Creates a component as a participant, see [UML Component Diagram](./component.md#component):

```hylimo
sequenceDiagram {
    component("Shop-Frontend")
}
```

### `comment`

Creates a comment, see [UML Class Diagram](./class.md#comment).
As a comment is not part of the sequence itself, it is positioned manually:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    activate(A)
    A --> B
    deactivate(A, after = 25)

    comment("Only called for new orders") layout {
        pos = apos(360, 40)
    }
}
```

### `frame`

Creates a frame, a rectangle containing a section of the diagram, optionally with a text naming it and a subtext for further explanation.
To declare a frame, you provide a callback function that contains the interactions within the frame.
The frame automatically determines its height based on the current position after the callback executes.

The frame also **automatically determines its width** by detecting which participants are used within it (through activations, messages, subframes, etc.).
You can optionally override this by explicitly specifying `left` and `right`.

```hylimo
sequenceDiagram {
    participant("Alice")
    participant("Bob")
    participant("Charlie")

    frame("while", subtext = "condition") {
        Alice --> Bob
    }
}
```

The frame automatically includes Alice and Bob based on the interactions within it.

**params**:

- 0: The text to display in the upper-left corner
- 1: A function generating all fragments (additional compartments within the frame)
- `subtext`: The text to display right of the main text, i.e. a condition for an if or while
- `at`: The absolute y position marking the upper border of the frame. If set, takes priority over `after`
- `after`: The relative y offset from the current position for the top border. Only used if `at` is not set
- `right`: The participant marking the right border of the frame. The border will be extended by `marginRight` to the right. Optional if a callback is provided
- `left`: The participant marking the left border of the frame. The border will be extended by `marginLeft` to the left. Optional if a callback is provided
- `marginLeft`: How much margin to use on the left. Defaults to the config `frameMarginX`
- `marginRight`: How much margin to use on the right. Defaults to the config `frameMarginX`
- `marginBottom`: How much margin to use on the bottom. Defaults to the config `frameMarginBottom`
- `subtextMargin`: the horizontal margin for the subtext label. Defaults to the config `frameSubtextMargin`

**returns**: The created frame

If no callback is provided, you must specify the bottom of the frame with `bottomAt` or `bottomAfter`, and its width with `left` and `right`.

#### `fragment`

A frame can contain multiple fragments.
A fragment is a separate section inside the frame, i.e. an `else` for an `if` or different parallel branches.
Fragments are created by calling the `fragment` function within the frame's callback, and are only available there:

```hylimo
sequenceDiagram {
    participant("Shop")
    participant("Payment")

    frame("alt", subtext = "cart not empty") {
        Shop -->> Payment
        fragment("else", after = 25)
        delay(15)
        Payment --> Shop
    }
}
```

**params**:

- 0: The text to display right of the main text, i.e. a condition for an else if
- `at`: the absolute y position where to start the fragment. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `subtextMargin`: the horizontal margin for the subtext label. Defaults to the config `frameSubtextMargin`

**returns**: The created fragment

#### Nested frames

You can nest frames by simply placing one frame inside another's callback function.
Both frames will automatically detect their width based on the participants used:

```hylimo
sequenceDiagram {
    participant("alice")
    participant("bob")
    actor("Dave")
    participant("last")

    frame("outer", marginRight = 40) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob, after = 40)
        alice --> Cat

        frame("if", marginRight = 10, marginBottom = 12.4, subtext = "finished") {
            Dave <<-- last with {
                label("notify", 0.5)
            }
        }

        deactivate(alice)
        deactivate(last)
    }
}
```

#### Manual frame width specification

If you need precise control over which participants are included in a frame, you can manually specify `left` and `right`.
This is useful when you want to include participants that aren't directly interacted with:

```hylimo
sequenceDiagram {
    participant("Alice")
    participant("Bob")
    participant("Charlie")
    participant("Dave")

    // Frame will span from Alice to Dave, even though only Bob is used
    frame("note", left = Alice, right = Dave, subtext = "Manual width control") {
        activate(Bob)
        deactivate(Bob, after = 25)
    }
}
```

#### Frames as per the UML standard

The UML specification recommends the following frames, all of which are created by passing their name as the first argument:

- `alt`: alternatives, one fragment per branch, of which the one whose condition holds is executed. Represents an `if` / `else if` / `else`
- `opt`: an optional section, which is only executed if its condition holds. Represents an `if` without an `else`
- `loop`: a section which is executed as long as its condition holds. Represents a loop, which can be left early with a nested `break` frame
- `par`: a frame whose fragments are executed in parallel
- `ref`: a reference to another sequence diagram, or to another part of this one. Represents a method call

```hylimo
sequenceDiagram {
    participant("Shop")
    participant("Payment")

    frame("opt", subtext = "customer subscribed") {
        Shop -->> Payment
    }
}
```

A `loop` frame with a nested `break` frame, which leaves the loop when its condition holds:

```hylimo
sequenceDiagram {
    participant("Shop")
    participant("Cart")
    participant("Stock")

    frame("loop", subtext = "item in cart") {
        Shop -->> Cart with {
            label("check", 0.5)
        }

        frame("break", subtext = "item unavailable", left = Shop, right = Stock, after = 15)

        delay(20)
        Shop -->> Stock with {
            label("reserve", 0.5)
        }
    }
}
```

A `par` frame, whose fragments are executed in parallel:

```hylimo
sequenceDiagram {
    participant("Shop")
    participant("Warehouse")
    participant("Mail")

    frame("par") {
        Shop --> Warehouse
        fragment(after = 25)
        Shop --> Mail
    }
}
```

A `ref` frame, which refers to another sequence diagram:

```hylimo
sequenceDiagram {
    participant("Shop")
    participant("Payment")

    frame("ref", subtext = "fraud check", left = Shop, right = Payment) {
        delay(60)
    }
}
```

## Positioning

The `y` axis is managed automatically by HyLiMo as you add interactions to your diagram.
Each interaction (like `activate`, message sending, or frame creation) has a margin that determines its vertical spacing:

- By default, each element uses a **configurable margin** that is applied _after_ the element (see [Config properties](#config-properties) for available margin settings)
- The actual margin depends on the next declared element - different elements cause different margins to be used
- Use `at` to specify an **absolute y position**, completely overriding the automatic margin calculation
- Use `after` to specify a **relative offset** that is **added to** the default margin

### `delay` and `moveTo`

`delay` moves the current position down by a relative offset, `moveTo` moves it to an absolute y position:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    A --> B
    delay(60)
    A --> B
    moveTo(200)
    A --> B
}
```

**params**:

- 0: the relative y offset from the current position (`delay`), respectively the absolute y position to move to (`moveTo`)

**returns**: void

### `participant.at` and `participant.after`

Sometimes, you want to send messages at specific positions or with time delays.
`participant.at(position)` creates a virtual participant at an absolute y position, and `participant.after(offset)` creates one at a relative offset from the current position.
Both can be used to create messages to arbitrary points in time:

```hylimo
sequenceDiagram {
    participant("Bob")
    Bob --> Bob.after(50) with {
        over = start().axisAligned(-1, apos(46, 36), 0, end(0.5))
    }
}
```

**params**:

- 0: the absolute y position where to pinpoint the participant (`at`), respectively the offset from the current position (`after`). If `at` is called without a position, the participant itself is used, positioned at its declaring position

**returns**: the new virtual participant to use for i.e. messages

## Activity indicators

An activity indicator is the white rectangle on a lifeline marking the time a participant is active.
HyLiMo automatically infers where to place the arrow between participants sending/receiving a message: in general, a sent message is sent on the right and a received message is received on the left side of the activity indicator.

### `activate`

Activates an activity indicator at a calculated position:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    activate(A)
    deactivate(A, after = 25)
}
```

**params**:

- 0: the participant (instance or actor) to activate
- 1: optional callback function to execute within this activation. After execution, deactivate is called automatically
- `at`: the absolute y position where to activate. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `xShift`: an optional shift on the x-axis when using multiple activity indicators simultaneously on the same participant. Defaults to `activityShift`

**returns**: The created activity indicator

You can activate multiple indicators simultaneously for the same participant, using `after` to add spacing between the activations:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    activate(A)
    activate(A, after = 5)
    deactivate(A, after = 10)
    deactivate(A, after = 20)
}
```

With the callback function, the indicator is deactivated automatically once the callback has been executed:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    activate(A, after = 25) {
        activate(B)
        A --> B
        B --> A
        deactivate(B)
    }
}
```

### `deactivate`

Deactivates the most recent activity indicator of a participant at a calculated position.

**params**:

- 0: the participant to deactivate
- `at`: the absolute y position where to deactivate. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set

**returns**: nothing

## Destroying participants

### `destroy`

Destroys a participant at a calculated position, which ends its lifeline with a cross:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    destroy(A)
}
```

**params**:

- 0: the participant to destroy
- `at`: the absolute y position where to destroy. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `crossSize`: the size of the cross to draw. Defaults to `destroyingCrossSize`

**returns**: the created cross

A destroyed participant can be reanimated by creating a new participant below it:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    destroy(A)
    participant("A²", below = A, after = 40)
    delay(20)
}
```

## Messages

The following messages are available within sequence diagrams (in both directions, of course):

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    A -- B // asynchronous undirected message
    delay(25)
    A --> B // asynchronous directed message, object creation message
    delay(25)
    A -->> B // synchronous directed message
    delay(25)
    A <.. B // asynchronous return message
    delay(25)
    A <<.. B // synchronous return message
    delay(25)
    A --! B // destroy message
    delay(25)
    A ..! B // destroy return message
}
```

### Labels

Oftentimes, you want to display text on a message.
To do this in HyLiMo you can use the following construct (not exclusive to sequence diagrams, works in every other diagram as well):

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    A --> B with {
        label("text") // positioned at the beginning - 0% of the length
    }
    A --> B with {
        label("text", 0.5) // positioned in the middle - 50% of the length
    }
    A --> B with {
        label("text", 0.75, 10) // positioned near the end - 75% of the length, 10 pixels upwards, negative values are possible to shift downward
    }
}
```

### `lostMessage` and `foundMessage`

A lost message is one you sent to a participant not included within the diagram, a found message is one you received from such a participant.
Both are exactly the same, the meaning comes from the direction in which you declare the message, and both should always be used inline:

```hylimo
sequenceDiagram {
    participant("Bob")
    Bob -->> lostMessage()
    delay(25)
    foundMessage() -->> Bob
}
```

**params**:

- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageMargin`

**returns**: The created lost / found message to be used with a message operator

## Config properties

The following config properties are available for sequence diagrams:

| Variable                  | Meaning                                                                                                        | Default value (in pixels) | Comment                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `activityShift`           | How far on the x axis subsequent simultaneously active activity indicators on the same participant are shifted | 3                         | -                                                                                                                    |
| `activityWidth`           | How wide an activity indicator should be                                                                       | 10                        | -                                                                                                                    |
| `minActivityHeight`       | Minimum height of an activity indicator                                                                        | 10                        | -                                                                                                                    |
| `strokeMargin`            | Margin for strokes                                                                                             | 1                         | -                                                                                                                    |
| `connectionMargin`        | Default distance required after a connection between participants                                              | 20                        | -                                                                                                                    |
| `deactivateMargin`        | Default distance required after a deactivation                                                                 | 10                        | -                                                                                                                    |
| `destroyingCrossSize`     | The width and height of a participant-destruction cross                                                        | 20                        | -                                                                                                                    |
| `externalMessageDiameter` | Width and height of the circle of lost and found messages                                                      | 20                        | -                                                                                                                    |
| `frameMargin`             | Default distance required after a frame                                                                        | 20                        | -                                                                                                                    |
| `fragmentMargin`          | Default distance required after a fragment                                                                     | 20                        | -                                                                                                                    |
| `externalMessageMargin`   | How far away on the x axis a lost or found message should be drawn                                             | 95                        | 100-(0.5\*activityWidth), chosen so that it aligns on the grid when sending a message against one activity indicator |
| `frameMarginX`            | Default margin to apply on the left and right side of frames                                                   | 15                        | -                                                                                                                    |
| `frameMarginTop`          | Default margin to apply on the top of frames                                                                   | 30                        | -                                                                                                                    |
| `frameMarginBottom`       | Default margin to apply on the bottom of frames                                                                | 5                         | -                                                                                                                    |
| `frameSubtextMargin`      | Default horizontal margin for frame subtexts                                                                   | 10                        | -                                                                                                                    |
| `eventDefaultMargin`      | Default margin for events on a participant when no other margin is specified                                   | 5                         | -                                                                                                                    |
| `participantMargin`       | How far apart subsequent participants should be                                                                | 200                       | Multiple of `100` to align participants on the grid                                                                  |
| `initialMargin`           | Default distance required after a new participant                                                              | 20                        | -                                                                                                                    |

## Styling

The following [style variables](./diagram.md#style-variables) are used by the sequence diagram elements:

| Variable              | Meaning                                | Default value (in pixels) |
| --------------------- | -------------------------------------- | ------------------------- |
| `commentTriangleSize` | Size of the folded corner of a comment | 20                        |

## Available class names

The following class names are available for styling/layout purposes within sequence diagrams:

- `activity-indicator-element` to layout activity indicator elements
- `activity-indicator` to style activity indicators
- `actor-element` to layout actors
- `actor` to style actors
- `destroy-cross-path-element` to layout the cross of a destroyed participant
- `destroy-cross-path` to style the cross of a destroyed participant
- `found-message-element` to layout found message elements
- `found-message` to style found messages
- `fragment-name-border` to style the border around fragment names
- `fragment-name-element` to layout both the border and name of fragments
- `fragment-name` to style the text display of fragment names
- `fragment-subtext-element` to layout the subtext of fragments
- `fragment-subtext` to style the subtext of fragments
- `frame-element` to layout the subtext of frames
- `frame` to style frames
- `instance-element` to layout instances
- `instance` to style instances
- `lost-message-element` to layout lost message elements
- `lost-message` to style lost messages
- `non-top-level-participant-element` to style any participant created after the position has moved, so its `y` is not `0`
- `participant-element` to layout participants
- `participant` to style participants
- `top-level-participant-element` to style any participant created at the initial position, so its `y` is `0`

## Example

Here is an example for a webshop order, using most of the features described above:

```hylimo
sequenceDiagram {
    user = actor("user") {
        values {
            loggedIn = true
        }
    }
    participant("ourShop", "Shop")
    instance("Cart")
    component("Payment")

    activate(user, after = 25)
    activate(ourShop)
    user --> ourShop with {
        label("checkout()", 0.5)
    }

    activate(Cart, after = 25)
    ourShop -->> Cart with {
        label("getItems()", 0.5)
    }

    activate(ourShop, after = 25)
    ourShop <<.. Cart with {
        label("items", 0.5, -8)
    }
    deactivate(Cart)

    frame("alt", subtext = "cart not empty", after = 20) {
        activate(Payment, after = 50)
        ourShop -->> Payment with {
            label("pay(total)", 0.5)
        }

        frame("ref", subtext = "fraud check", left = ourShop, right = Payment, after = 15) {
            delay(40)
        }

        ourShop <<.. Payment with {
            label("receipt", 0.5, -8)
        }
        deactivate(Payment)

        fragment("else", after = 40)
        ourShop -->> lostMessage(distance = 150) with {
            label("logEmpty()", 0.5)
        }
    }

    delay(15)
    user <.. ourShop with {
        label("confirmation", 0.5)
    }
    deactivate(ourShop)
    deactivate(ourShop)
    destroy(Cart)
    deactivate(user, after = 25)
}
```

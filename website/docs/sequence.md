---
outline: deep
---

# UML Sequence Diagram

Hylimo is able to efficiently draw sequence diagrams.
On top of that, it is the most efficient tool we know to draw any typical sequence diagram:
Sequence diagrams defined in Hylimo are the most maintainable sequence diagrams you will have ever created.

## Basic principle

Since sequence diagrams model **when** (and where) something happens, it should be modeled in a way that shows the **when** at a glance.\
In other words: Order matters!\
The sequence diagram always knows only the currently available information and nothing on top.

## Terminology

In a sequence diagram, we have the following concepts:

- Participant: A component that "participates" in the diagram, so something/someone whose behavior should be modeled.
  It can be one of the following:
  - `participant`
    - general participant, without a name (`User`) or with a name (`Bob:User`)
    - name is not underlined
  - `instance`
    - instance, similar to participant, but with support for values
    - name is underlined
  - `actor`
    - stickman symbolizing a user, without a nanme (`User`) or with a name (`Bob:User`)
    - can have values like `instance`, in this case the stickman is shown above the instance
  - `component`diagram.
    - see [component](./component.md#component)
- Lifeline: the entire duration a participant is alive, symbolized by the dotted line downwards
- Message: arrow between two participants at specific y positions with a semantic meaning
- Activity: the time a participant is active, visualized by a white rectangle on the lifeline
- Frame: A box around a section of the diagram. Can optionally contain a name (i.e. `if`, `while`), and sub compartments (fragments)## Order matters

Below, you`ll find the order in which you should declare things so that they work as expected.\
Hylimo walks through the diagram from left to right, and then from top to bottom.

First, declare all participants (`participant`, `instance`, `actor`, `component`) in the order you want to display them as they will be positioned on the x axis in this order:

```hylimo
sequenceDiagram {
    participant("Bob")
    instance("Shop")
    actor("Admin")
    component("Shop-Frontend")
}
```

This example creates three participants, reading from left to right as `Bob`, `Shop` and lastly a user called `Admin`.

Now that we`ve populated our `x` axis, let`s move on with the `y` axis.

The `y` axis is managed automatically by Hylimo as you add interactions to your diagram.\
Each interaction (like `activate`, message sending, or frame creation) has a margin that determines its vertical spacing:

- By default, each element uses a **configurable margin** that is applied _after_ the element (see [Config properties](#config-properties) for available margin settings)
- The actual margin depends on the next declared element - different elements cause different margins to be used
- Use `at` to specify an **absolute y position**, completely overriding the automatic margin calculation
- Use `after` to specify a **relative offset** that is **added to** the default margin

For example:

```hylimo
sequenceDiagram {
    participant("Bob")
    participant("Alice")
    Bob --> Alice
}
```

Participant names will be registered as variables if they didn`t exist already.
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

Sometimes, you want to send messages at specific positions or with time delays.\
You can use the `participant.at(position)` function to position a participant at an absolute y coordinate, or `participant.after(offset)` to position it relative to the current position:

```hylimo
sequenceDiagram {
    participant("Bob")
    Bob --> Bob.after(50) with {
        over = start().axisAligned(-1, apos(46, 36), 0, end(0.5))
    }
}
```

- `participant.at(position)` - Creates a virtual participant at an absolute y position. If no position is provided, uses the participant at its declaring position.
- `participant.after(offset)` - Creates a virtual participant at a relative offset from the current position.

Now, we have the basic knowledge to go on with the remaining features.

## Interacting with participants

There is a bunch of things you can do with participants:

- you can postpone the creation of a participant:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B", after = 20)
    delay(20)
}
```

- You can destroy a participant:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    destroy(A)
}
```

- You can reanimate a dead participant:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    destroy(A)
    participant("A²", below = A, after = 40)
    delay(20)
}
```

- You can activate and deactivate a participant, meaning that it is actively working on something:

```hylimo
sequenceDiagram {
    participant("A")
    participant("B")
    activate(A)
    deactivate(A, after = 25)
}
```

Hylimo automatically infers where to place the arrow between participants sending/receiving a message: In general, a sent message is sent on the right and a received message is received on the left side of the activity indicator.

- You can activate multiple indicators simultaneously:

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

As you can see in this example, you can use the `after` parameter to add spacing between activations.

- You can also use a callback function with `activate` that automatically deactivates when done:

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

## Labels

Oftentimes, you want to display text on a message.\
To do this in Hylimo you can use the following construct (not exclusive to sequence diagrams, works in every other diagrams as well):

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

## Config properties

The following config properties are available for sequence diagrams:
|Variable|Meaning|Default value (in pixels)|Comment|
|--------|-------|-------------------------|-------|
|`activityShift`| How far on the x axis subsequent simultaneously active activity indicators on the same participant are shifted | 3 |-|
|`activityWidth`| How wide an activity indicator should be | 10|-|
|`minActivityHeight`| Minimum height of an activity indicator | 10 |-|
|`strokeMargin`| Margin for strokes | 1 |-|
|`connectionMargin`| Default distance required after a connection between participants | 20 |-|
|`deactivateMargin`| Default distance required after a deactivation | 10 |-|
|`destroyingCrossSize`| The width and height of a participant-destruction cross | 20 |-|
|`externalMessageDiameter`| Width and height of the circle of lost and found messages | 20 |-|
|`frameMargin`| Default distance required after a frame | 20 |-|
|`fragmentMargin`| Default distance required after a fragment | 20 |-|
|`externalMessageMargin`| How far away on the x axis a lost or found message should be drawn | 95 | 100-(0.5\*activityWidth), chosen so that it aligns on the grid when sending a message against one activity indicator |
|`frameMarginX`| Default margin to apply on the left and right side of frames | 15 |-|
|`frameMarginTop`| Default margin to apply on the top of frames | 30 |-|
|`frameMarginBottom`| Default margin to apply on the bottom of frames | 5 |-|
|`frameSubtextMargin`| Default horizontal margin for frame subtexts | 10 |-|
|`eventDefaultMargin`| Default margin for events on a participant when no other margin is specified | 5 |-|
|`participantMargin`| How far apart subsequent participants should be | 200 | Multiple of `100` to align participants on the grid |
|`initialMargin`| Default distance required after a new participant | 20 |-|

## Precise method documentation

### activate

Activates an activity indicator at a calculated position. Activity indicators are ranges of time during which a participant is active. You can activate an activity indicator multiple times simultaneously for the same participant. If a callback is provided, it will be executed and the indicator will be automatically deactivated afterwards.

**params**:

- 0: the participant (instance or actor) to activate
- 1: optional callback function to execute within this activation. After execution, deactivate is called automatically
- `at`: the absolute y position where to activate. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `xShift`: an optional shift on the x-axis when using multiple activity indicators simultaneously on the same participant. Defaults to `activityShift`

**returns**: The created activity indicator

### actor

Creates a stickman figure symbolising a user.\
An actor can optionally be instanced, meaning that they possess certain attributes.\
An instanced actor is an actor that has a stickman on top and an `instance` below it.

**params**:

- 0: the name of the actor
- 1: the optional class name of this actor, or a function that sets the instance values of this actor, making this actor instanced.
- `keywords`: the keywords of the actor
- `below`: the optional participant below which this actor should be placed. If set, this actor will have the same x coordinate as the given value and the y coordinate of the current position
- `at`: the absolute y position where to create the actor. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `margin`: horizontal margin between this and the previous actor. Defaults to `participantMargin`

**returns**: The created actor

**Note**: When parameter 1 is a function (callback), the actor becomes instanced - the stickman will be placed on top of a newly created `instance`. The stickman can then be styled/layouted using `actor-element`. To access the created instance, use `<return value>.instance`

### deactivate

Deactivates the most recent activity indicator at a calculated position.

**params**:

- 0: the participant to deactivate
- `at`: the absolute y position where to deactivate. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set

**returns**: nothing

### delay

Delays the current position by a relative offset.

**params**:

- 0: the relative y offset from the current position

**returns**: void

### moveTo

Moves to an absolute y position.

**params**:

- 0: the absolute y position to move to

**returns**: void

### destroy

Destroys a participant at a calculated position.

**params**:

- 0: the participant to destroy
- `at`: the absolute y position where to destroy. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `crossSize`: the size of the cross to draw. Defaults to `destroyingCrossSize`

**returns**: the created cross

### foundMessage

Creates a found message. A found message is one you received from an external participant not included within the diagram.
Should always be used inline as a message from something else:

```hylimo
sequenceDiagram {
    participant("Bob")
    foundMessage() -->> Bob
}
```

Is exactly the same as `lostMessage`, the meaning comes from the direction in which you declare the message.

**params**:

- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageMargin`

**returns**: The created found message to be used with a message operator

### fragment

Only available within the function of a `frame`.
Creates a new fragment inside this frame. A fragment is a separate section within the frame, optionally with name and subtext.

**params**:

- 0: The text to display right of the main text, i.e. a condition for an else if
- `at`: the absolute y position where to start the fragment. If set, takes priority over `after`
- `after`: the relative y offset from the current position. Only used if `at` is not set
- `subtextMargin`: the horizontal margin for the subtext label. Defaults to the config `frameSubtextMargin`

**returns**: The created fragment

### frame

Creates a frame. If a callback function is provided, it will be executed and the frame`s bottom will be set to the current position after execution. Otherwise, you must specify bottomAt or bottomAfter.

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

### instance

Creates an instance which is an abstract concept of someone who participates in the diagram.

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

### lostMessage

Creates a lost message. A lost message is one you sent to an external participant not included within the diagram.
Should always be used inline as a message to something else:

```hylimo
sequenceDiagram {
    participant("Bob")
    Bob -->> lostMessage()
}
```

Is exactly the same as `foundMessage`, the meaning comes from the direction in which you declare the message.

**params**:

- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageMargin`

**returns**: The created lost message to be used with a message operator

### participant

Creates a participant which is an abstract concept of someone who participates in the diagram.

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

### participant.at

Creates a virtual participant positioned at a specific position. If no position is provided, the participant itself will be used (positioned at its declaring position). Can be used to create messages to arbitrary points in time.

**params**:

- 0: the absolute y position where to pinpoint the participant. If not provided, uses the participant itself

**returns**: the new virtual participant to use for i.e. messages

### participant.after

Creates a virtual participant positioned at an offset from the current position. Can be used to create messages to arbitrary points in time.

**params**:

- 0: the offset from the current position where to pinpoint the participant

**returns**: the new virtual participant to use for i.e. messages

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

## Advanced functionality

Sequence diagrams offer many features that are rather intended for experienced users.

### Frames

A `frame` is a rectangle containing a section of the diagram, optionally with a text naming it and a subtext for further explanation.\
To declare a frame, you provide a callback function that contains the interactions within the frame.\
The frame automatically determines its height based on the current position after the callback executes.

The frame also **automatically determines its width** by detecting which participants are used within it (through activations, messages, subframes, etc.).\
You can optionally override this by explicitly specifying `left` and `right` participants.

The first parameter is the text to display in the upper-left corner (e.g., `if`, `loop`, `while`).\
The second parameter is a callback function containing the frame`s content.

Additionally, there are several optional parameters:

- `subtext`: Additional text next to the main text, i.e. a condition for an if or while
- `at`/`after`: Control the starting y position of the frame
- `left`/`right`: Manually specify the participants marking the left and right borders. If omitted, the frame automatically detects the leftmost and rightmost participants used within it
- `marginLeft`: Left margin in pixels. Defaults to `frameMarginX`
- `marginRight`: Right margin in pixels. Defaults to `frameMarginX`
- `marginBottom`: Bottom margin in pixels. Defaults to `frameMarginBottom`
- `subtextMargin`: Horizontal margin for the subtext label. Defaults to `frameSubtextMargin`

Here`s an example frame that automatically detects which participants to include:

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

### Nested Frames

You can nest frames by simply placing one frame inside another`s callback function.\
Both frames will automatically detect their width based on the participants used:

```hylimo
sequenceDiagram {
    alice = participant("alice")
    bob = participant("bob")
    Dave = actor("Dave")
    last = participant("last")

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

### Manual Frame Width Specification

If you need precise control over which participants are included in a frame, you can manually specify `left` and `right`.\
This is useful when you want to include participants that aren`t directly interacted with:

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

### Frames with fragments

A frame can contain multiple fragments.\
A fragment is a separate section inside the frame, i.e. an `else` for an `if` or different parallel branches.\
Fragments are created by calling the `fragment` function within the frame`s callback.

The `fragment` function takes the subtext as its first parameter (e.g., a condition for an `else if`), and supports optional parameters:

- `at`/`after`: Control the y position where the fragment starts
- `subtextMargin`: Horizontal margin for the subtext label

```hylimo
sequenceDiagram {
    alice = participant("alice")
    bob = participant("bob")
    Dave = actor("Dave")
    last = participant("last")

    frame("if", subtext = "work to do", marginRight = 40) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob, after = 40)
        alice --> Cat

        fragment("environment variable set", after = 50)
        Dave <<-- last with {
            label("notify", 0.5)
        }

        fragment("else", after = 25)
        deactivate(alice)
        deactivate(last)
    }
}
```

### Instanced actors

An actor can be seen as an `instance` too if you need it to.
In this case, the actor is an `instance` with a stickman on top.
To build an instanced actor, pass the second parameter to `actor`, the function declaring instance variables:

```hylimo
sequenceDiagram {
    user = actor("user") {
        values {
            age = 30
            isGrownUp = true
        }
    }

    other = instance("other")
    activate(user)
    activate(other)
    user.after(10) -->> other
    deactivate(user, after = 10)
    deactivate(other)
}
```

### Frames as per the UML standard

Use the following code snippets to create frames that are explicitly recommended according to the UML specification:

#### alt-frame

An `alt` frame only executes the given code only if the condition applies.\
It represents an `if (else)` in the code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    alice = participant("alice")
    bob = participant("bob")
    Dave = actor("Dave")
    last = participant("last")

    frame("alt", subtext = "work to do", marginRight = 40) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob, after = 40)
        alice --> Cat

        fragment("environment variable set", after = 50)
        Dave <<-- last with {
            label("notify", 0.5)
        }

        fragment("else", after = 25)
        deactivate(alice)
        deactivate(last)
    }
}
```

#### opt-frame

An `opt` frame only executes the fragment where the condition is true.\
It represents a `switch` in the code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    alice = participant("alice")
    bob = participant("bob")
    Dave = actor("Dave")
    last = participant("last")

    frame("opt", subtext = "status == pending", marginRight = 40) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob, after = 40)
        alice --> Cat

        fragment("status == executing", after = 50)
        Dave <<-- last with {
            label("notify", 0.5)
        }

        fragment("status == terminated", after = 25)
        deactivate(alice)
        deactivate(last)
    }
}
```

#### loop-frame

A `loop` frame executes the code within the frame as long as the condition is true.\
It represents a loop in the code.\
You can optionally stop executing early using a nested `break` frame.
When the `break` frame is encountered and its condition (the subtext) is true, the loop is exited.

It can be used for example as follows:

```hylimo
sequenceDiagram {
    participant("Alice")
    participant("Bob")
    participant("Charlie")

    frame("loop", subtext = "message in messages") {
        Alice --> Bob with {
            label("Ping", 0.25, -5)
        }

        frame("break", subtext = "all messages have been sent", left = Alice, right = Charlie, after = 15)

        Alice -->> Charlie with {
            label("sendMessage", 0.25)
        }
    }
}
```

#### par-frame

A `par` frame executes its fragments simultaneously.\
It represents parallel execution in code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    participant("Alice")
    participant("Bob")
    participant("Charlie")

    frame("par") {
        activate(Alice, after = 25)
        Alice --> Bob with {
            label("Ping", 0.25, -5)
        }

        fragment(after = 25)
        Alice <-- Bob with {
            label("Ping", 0.25, -5)
        }

        fragment(after = 25)
        Bob --> Charlie
        deactivate(Alice)
    }
}
```

#### ref-frame

A `ref` frame signifies that another part of this diagram/ another sequence diagram should be executed for the components contained inside of it.\
It represents a method call in code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    participant("Alice")
    participant("Bob")
    participant("Charlie")

    activate(Alice, after = 25)
    Alice --> Bob with {
        label("Ping", 0.25, -5)
    }

    frame("ref", subtext = "handle errors", right = Bob, after = 10) {
        activate(Alice, after = 25)
        deactivate(Alice)
    }
    deactivate(Alice)
}
```

## Example

Here is an example for a webshop order:

```hylimo
sequenceDiagram {
    user = participant("user")
    ourShop = participant("ourShop", "Shop")
    Cart = participant("Cart")
    Payment = participant("Payment")

    activate(user, after = 25)
    activate(ourShop)
    user --> ourShop

    activate(Cart, after = 25)
    ourShop --> Cart

    activate(ourShop, after = 25)
    ourShop <.. Cart
    deactivate(Cart)

    frame("if", subtext = "response successful") {
        activate(Payment, after = 50)
        ourShop ..> Payment
        deactivate(Payment)

        fragment("nothing was done", after = 40)
    }

    user <.. ourShop
    deactivate(ourShop)
    deactivate(ourShop)
    deactivate(user)
}
```

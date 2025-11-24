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

Below, you'll find the order in which you should declare things so that they work as expected.\
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

Now that we've populated our `x` axis, let's move on with the `y` axis.

The `y` axis is managed automatically by Hylimo as you add interactions to your diagram.\
Each interaction (like `activate`, message sending, or frame creation) can specify its position using either:
- `at` - an absolute y position
- `after` - a relative offset from the current position
- If neither is specified, a default margin is used

To illustrate this, we've enabled the debugging mode here and below that visualizes exactly where Hylimo places the given coordinates.\
You can enable the debugging mode yourself by setting `enableDebugging = true`, or disabling it by omitting it/setting it to `false`.\
This is the precise purpose of it: It should help you understand what action will lead to what outcome.\
Of course, once you want to finish your diagram, we recommend to turn it off again to not confuse your diagram readers.

```hylimo
sequenceDiagram(enableDebugging = true) {
    participant("Bob")
    participant("Alice")
    Bob --> Alice
}
```

Participant names will be registered as variables if they didn't exist already.
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
sequenceDiagram(enableDebugging = true) {
    participant("Bob")
    Bob --> Bob.after(50) with {
        over = start().axisAligned(-1, apos(46, 36), 0, end(0.5))
    }
}
```

- `participant.at(position)` - Creates a virtual participant at an absolute y position. If no position is provided, uses the participant at its declaring position.
- `participant.after(offset)` - Creates a virtual participant at a relative offset from the current position.

Now, we have the basic knowledge to go on with the remaining features.## Interacting with participants

There is a bunch of things you can do with participants:

- you can postpone the creation of a participant by first activating another participant:

```hylimo
sequenceDiagram(enableDebugging = true) {
    participant("A")
    activate(A, after = 25)
    participant("B")
    deactivate(A)
}
```

- You can destroy a participant:

```hylimo
sequenceDiagram(enableDebugging = true) {
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
}
```

- You can activate and deactivate a participant, meaning that it is actively working on something:

```hylimo
sequenceDiagram(enableDebugging = true) {
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
|`activateDistance`| Default distance to move downward on the y axis when activating a participant | -1 |Negative value moves backward, typically used to align activation with message arrival|
|`activityShift`| How far on the x axis subsequent simultaneously active activity indicators on the same participant are shifted | 3 |-|
|`activityWidth`| How wide an activity indicator should be | 10|-|
|`connectionDistance`| Default distance to move downward on the y axis when creating a connection between participants | 20 |Used when both start and end are plain participants without explicit positioning|
|`deactivateDistance`| Default distance to move downward on the y axis when deactivating a participant | 1 |Small positive value to add spacing after deactivation|
|`destroyingCrossSize`| The width and height of a participant-destruction cross | 20 |-|
|`enableDebugging`| Toggles the debugging mode for sequence diagrams printing additional info | false |Rarely useful|
|`externalMessageDiameter`| Width and height of the circle of lost and found messages | 20 |-|
|`externalMessageDistance`| How far away on the x axis a lost or found message should be drawn | 95 | 100-(0.5\*activityWidth), chosen so that it aligns on the grid when sending a message against one activity indicator |
|`frameDistance`| Default distance to move downward on the y axis when creating a frame | 20 |Used when topAt/topAfter are not specified|
|`frameMarginX`| Default margin to apply on the left and right side of frames | 20 |-|
|`frameMarginY`| Default margin to apply on the top and bottom of frames | 5 | Visual margin around frame content |
|`margin`| Margin to add to almost any interaction, i.e. to activity indicator endings |5| A non-`0` value makes the diagram slightly inaccurate but more visually appealing |
|`participantDistance`| How far apart subsequent participants should be | 200 | Multiple of `100` to align participants on the grid |
|`subframeDistance`| Default distance to move downward on the y axis when creating a subframe/fragment | 20 |Used when at/after are not specified for fragments|

## Precise method documentation

### activate

Activates a participant at a calculated y position.
The same participant can be activated multiple times simultaneously.
If a callback function is provided as the second parameter, it will be executed and the participant will be automatically deactivated afterwards.

**params**:

- 0: the participant (instance or actor) to activate
- 1: optional callback function to execute within this activation. After execution, deactivate is called automatically
- `at`: the absolute y position where to activate. If set, takes priority over 'after'
- `after`: the relative y offset from the current position. Only used if 'at' is not set
- `defaultMargin`: the default margin to use if neither 'at' nor 'after' is set. Defaults to config.activateDistance
- `xShift`: an optional shift on the x-axis when using multiple activity indicators simultaneously on the same instance. Defaults to `activityShift`

**returns**: the created indicator

### actor

Creates a stickman figure symbolising a user.\
An actor can optionally be instanced, meaning that they possess certain attributes.\
An instanced actor is an actor that has a stickman on top and an `instance` below it.

**params**:

- 0: the optional name of the user. Defaults to `User`
- 1: A function that sets the instance values of this actor, making this actor instanced.\
  If this function is set, the stickman will be placed on top of a newly created `instance`\
  The stickman specifically can then be styled/layouted using `instanced-actor(-element)`.\
  To access the created instance, use `<return value>.instance`
- `below`: the optional participant below which this actor should be placed. If set, this actor will have the same x coordinate as the given value and the y coordinate of the current position

**returns**: the created stickman

### deactivate

Deactivates the most recent indicator of the given participant

**params**:

- 0: the participant to deactivate
- `at`: the absolute y position where to deactivate. If set, takes priority over 'after'
- `after`: the relative y offset from the current position. Only used if 'at' is not set
- `defaultMargin`: the default margin to use if neither 'at' nor 'after' is set. Defaults to config.deactivateDistance

### destroy

Destroys the given participant.

**params**:

- 0: the participant to destroy
- `crossSize`: The width and height of the cross to draw. Defaults to `destroyingCrossSize`

**returns**: the created cross



### foundMessage

Creates the dot signaling a message from an external source.
Should always be used inline as a message from something else:

```hylimo
sequenceDiagram {
    participant("Bob")
    foundMessage() -->> Bob
}
```

Is exactly the same as `lostMessage`, the meaning comes from the direction in which you declare the message

**params**:

- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageDistance`
- `diameter`: the optional diameter of the dot. Defaults to `externalMessageDiameter`

**returns**: the created dot

### fragment

Only available within the function of a `frame`.
Adds a new fragment to this frame.
A fragment is the following:

- An optional line on top separating the previous fragment,
- An optional name of this fragment (i.e. `if`, `else`, `while`, …)
- An optional border around the name
- An optional subtext, i.e. a condition

**params**:

- 0: The name of this fragment
- `at`: the absolute y position where to start the fragment. If set, takes priority over 'after'
- `after`: the relative y offset from the current position. Only used if 'at' is not set
- `defaultMargin`: the default margin to use if neither 'at' nor 'after' is set. Defaults to config.margin
- `subtext`: The optional subtext of this fragment
- `hasLine`: Whether to draw the line on top. Defaults to `true`

**returns**: A data object containing all this data plus the newly created elements

### frame

Creates a new frame. If a callback function is provided, it will be executed and the frame's bottom will be set to the current position after execution.

**params**:

- 0: The name of this frame, i.e. `if` or `while`
- 1: A function generating all fragments (additional compartments within the frame)
- `subtext`: The optional subtext of this fragment, i.e. a condition
- `topAt`: The absolute y position marking the upper border of the frame. If set, takes priority over 'topAfter'
- `topAfter`: The relative y offset from the current position for the top border. Only used if 'topAt' is not set
- `topDefaultMargin`: The default margin to use for the top if neither 'topAt' nor 'topAfter' is set. Defaults to frameMarginY
- `right`: The participant marking the right border of the frame. The border will be extended by 'frameMarginX' to the right
- `left`: The participant marking the left border of the frame. The border will be extended by 'frameMarginX' to the left
- `marginX`: How much margin to use both left and right. Defaults to 'frameMarginX'
- `marginY`: How much margin to use both on the top and bottom. Defaults to 'frameMarginY'
- `marginLeft`: How much margin to use on the left. Defaults to 'marginX'
- `marginTop`: How much margin to use on the top. Defaults to 'marginY'
- `marginRight`: How much margin to use on the right. Defaults to 'marginX'
- `marginBottom`: How much margin to use on the bottom. Defaults to 'marginY'

**returns**: The created frame

### instance

Creates an instance which is an abstract concept of someone who participates in the diagram.

**params**:

- 0: the optional name of the instance. If the next argument is missing, this will be treated as the class name of the instance
- 1: the optional class name of the instance
- 2: A function determining the content of the instance
- `below`: the optional participant below which this instance should be placed. If set, this instance will have the same x coordinate as the given value and the y coordinate of the current position

**returns**: the created instance

### lostMessage

Creates the dot signaling a message to an external source.
Should always be used inline as a message to something else:

```hylimo
sequenceDiagram {
    participant("Bob")
    Bob -->> lostMessage()
}
```

Is exactly the same as `foundMessage`, the meaning comes from the direction in which you declare the message

**params**:

- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageDistance`
- `diameter`: the optional diameter of the dot. Defaults to `externalMessageDiameter`

**returns**: the created dot

### participant

Creates an participant which is an abstract concept of someone who participates in the diagram.

**params**:

- 0: the optional name of the participant. If the next argument is missing, this will be treated as the class name of the participant
- 1: the optional class name of the participant
- 2: A function determining the content of the participant
- `below`: the optional participant below which this participant should be placed. If set, this participant will have the same x coordinate as the given value and the y coordinate of the current position

**returns**: the created participant

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
The frame automatically determines its height based on the current position after the callback executes.\
You must also specify the left and right participants to determine the frame's width.

Additionally, there are a couple of optional attributes:

- `text`: the small text in the upper-left corner of the frame describing the type of frame, i.e. `if`, `loop`, or whatever else you want
- `subtext`: Additional text next to the categorisation, i.e. a condition for the conditional or loop
- `hasIcon`: Overrides if the border on the upper-left is shown. By default, it is `false` if `text` hasn't been set, and `true` if it is set
- `topAt`/`topAfter`: Control the starting y position of the frame
- `margin`: Sets the margin in pixels to all sides
- `margin(X,Y)`: Sets the margin in pixels on both sides of this axis. Overrides `margin`. 
- `margin(Top,Left,Bottom,Right)`: Sets the margin in pixels individually on this side. Overrides all other margins

Here's an example frame:

```hylimo
sequenceDiagram {
    participant("Alice")
    participant("Bob")
    participant("Charlie")

    frame("while", left = Alice, right = Charlie, subtext = "[condition]") {
        activate(Alice, after = 25)
        Alice --> Bob with {
            label("Ping", 0.25, -5)
        }
        deactivate(Alice)
    }
}
```

### Nested Frames

You can nest frames by simply placing one frame inside another's callback function:

```hylimo
sequenceDiagram {
    alice = participant("alice")
    bob = participant("bob")
    Dave = actor("Dave")
    last = participant("last")

    frame("outer", left = alice, right = last, marginRight = 40, marginTop = 25) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob)
        alice --> Cat
        
        frame("if", left = Dave, right = last, marginRight = 10, marginY = 12.4, subtext = "[finished]") {
            activate(Dave, after = 25)
            Dave <<-- last with {
                label("notify", 0.5)
            }
            deactivate(Dave)
        }
        
        deactivate(alice)
        deactivate(last)
    }
}
```

### Frames with fragments

A frame can contain multiple fragments.\
A fragment is a separate section inside the frame, i.e. an `else if` for an `if`.\
Fragments are created by calling the `fragment` function within the frame's callback:

```hylimo
sequenceDiagram {
    alice = participant("alice")
    bob = participant("bob")
    Dave = actor("Dave")
    last = participant("last")

    frame("if", left = alice, right = last, subtext = "[work to do]", marginRight = 40, marginTop = 25) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob)
        alice --> Cat
        
        fragment("else if", after = 50, subtext = "[environment variable set]")
        activate(Dave, after = 25)
        Dave <<-- last with {
            label("notify", 0.5)
        }
        deactivate(Dave)
        
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
    activate(user, after = 25)
    activate(other)
    user -->> other
    deactivate(user)
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

    frame("alt", left = alice, right = last, subtext = "[work to do]", marginRight = 40, marginTop = 25) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob)
        alice --> Cat
        
        fragment("[alt]", after = 50, subtext = "[environment variable set]")
        activate(Dave, after = 25)
        Dave <<-- last with {
            label("notify", 0.5)
        }
        deactivate(Dave)
        
        fragment("[alt]", after = 25, subtext = "[else]")
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

    frame("opt", left = alice, right = last, subtext = "[status == pending]", marginRight = 40, marginTop = 25) {
        activate(alice, after = 25)
        activate(last, after = 25)
        destroy(bob)
        Cat = participant("Cat", below = bob)
        alice --> Cat
        
        fragment("[opt]", after = 50, subtext = "[status == executing]")
        activate(Dave, after = 25)
        Dave <<-- last with {
            label("notify", 0.5)
        }
        deactivate(Dave)
        
        fragment("[opt]", after = 25, subtext = "[status == terminated]")
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

    frame("loop", left = Alice, right = Charlie, subtext = "[message in messages]") {
        activate(Alice, after = 25)
        Alice --> Bob with {
            label("Ping", 0.25, -5)
        }
        
        frame("break", left = Alice, right = Charlie, subtext = "[all messages have been sent]", marginX = 5) {
            activate(Alice, after = 15)
            deactivate(Alice)
        }
        
        activate(Alice, after = 25)
        Alice -->> Charlie with {
            label("sendMessage", 0.25)
        }
        deactivate(Alice)
        deactivate(Alice)
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

    frame("par", left = Alice, right = Charlie) {
        activate(Alice, after = 25)
        Alice --> Bob with {
            label("Ping", 0.25, -5)
        }
        
        fragment("[par]", after = 25)
        Alice <-- Bob with {
            label("Ping", 0.25, -5)
        }
        
        fragment("[par]", after = 25)
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
    
    frame("ref", left = Alice, right = Bob, subtext = "handle errors") {
        activate(Alice, after = 25)
        deactivate(Alice)
    }
    deactivate(Alice)
}
```

## Example

Here is an example for a webshop order:

```hylimo
sequenceDiagram(enableDebugging = true) {
    user = participant("user")
    ourShop = participant("ourShop", "Shop")
    Cart = participant("Cart")
    Payment = participant("Payment")

    activate(user, after = 25)
    activate(ourShop)
    user --> ourShop
    deactivate(user)

    activate(Cart, after = 25)
    ourShop --> Cart

    activate(ourShop, after = 25)
    ourShop <.. Cart
    deactivate(Cart)

    frame("if", left = user, right = ourShop, subtext = "[response successful]", margin=30) {
        activate(Payment, after = 50)
        ourShop ..> Payment
        deactivate(Payment)
        
        fragment("else", after = 40, subtext = "[nothing was done]")
    }

    activate(user, after = 30)
    user <.. ourShop
    deactivate(ourShop)
    deactivate(ourShop)
    deactivate(user)
}
```

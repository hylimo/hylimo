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

- Participant: A component that "participates" in the diagram, so something/someone whose behavior should be modeled.\
  It can be one of the following:
  - an `instance` without a name (`User`)
  - an `instance` with a name (`Bob: User`)
  - an `actor` (a stickman symbolizing a user), optionally with a name
- Lifeline: the entire duration a participant is alive, symbolized by the dotted line downwards
- Event: an x/y coordinate linking a point in time to a participant, accessed by using the syntax `event.participant`, so i.e. `startPayment.User`.\
- Message: arrow between two `event`s with a semantic meaning
- Activity: the time a participant is active
- Frame: A box around some events. Can optionally contain a name (i.e. `if`, `while`), and sub compartments

## Order matters

Below, you'll find the order in which you should declare things so that they work as expected.\
Hylimo walks through the diagram from left to right, and then from top to bottom.

First, declare all participants (`instance`, `actor`) in the order you want to display them as they will be positioned on the x axis in this order:

```hylimo
sequenceDiagram {
    instance("Bob")
    instance("Shop")
    actor("Admin")
}
```

This example creates three participants, reading from left to right as `Bob`, `Shop` and lastly a user called `Admin`.

Now that we've populated our `x` axis, let's move on with the `y` axis.

The main way to move forward on the `y` axis in a sequence diagram is through `events`.\
An `event` needs a name to refer to it later on and automatically moves downward on the y axis.\
To illustrate this, we've enabled the debugging mode here and below that visualizes exactly where Hylimo places the given coordinates.\
You can enable the debugging mode yourself by setting `enableDebugging = true`, or disabling it by omitting it/setting it to `false`.\
This is the precise purpose of it: It should help you understand what action will lead to what outcome.\
Of course, once you want to finish your diagram, we recommend to turn it off again to not confuse your diagram readers.

```hylimo
sequenceDiagram(enableDebugging = true) {
    instance("Bob")
    event("startPayment")
    event("stopPayment")
}
```

As you can see above, the name should be understandable for you to know exactly which action is symbolized by this event.
This name will never be shown anywhere.

For most cases, the default value for how far away the next event will be good-enough.
Nevertheless, in cases where you want an explicit distance to the predecessor, you are free to do so:

```hylimo
sequenceDiagram(enableDebugging = true) {
    instance("Bob")
    event("startPayment")
    event("stopPayment", 100)
}
```

This positions the event `50` pixels below its predecessor.
Note that while negative values are allowed here, they won't make any sense:
Instead, you can also move the previous event up by that amount and invert their meanings.

Both `event` and `participant` names will be registered as variables if they didn't exist already.
In case they existed already, the existing name takes precedence.
If their name is already used by something else, you can assign the result of these functions to a variable of your own choosing:

```hylimo
sequenceDiagram {
    Bob = true
    user = instance("Bob")
    instance("Charlie")
    event("buy")
    user --> Charlie
}
```

Sometimes, you want to send messages where some time delta happens in between.\
However, the normal Hylimo behavior for `A --> B` is to use the most recent event as y coordinate, not any y coordinate.\
To achieve the time delta in spite of these inherent limitations, use the notation `participant.on(event)` which forces Hylimo to use the participant at the specified point in time:

```hylimo
sequenceDiagram(enableDebugging = true) {
    instance("Bob")
    event("buy")
    event("stop")
    Bob.on(buy) --> Bob.on(stop) with {
        over = start(0).axisAligned(1, apos(0, 25), 1, apos(25, 25), 0, end(0.5))
    }
}
```

Now, we have the basic knowledge to go on with the remaining features that are all relative to the latest event.

## Interacting with participants

There is a bunch of things you can do with participants, depending on if there is a latest defined event:

- you can postpone the creation of a participant by defining it after an event:

```hylimo
sequenceDiagram(enableDebugging = true) {
    instance("A")
    event("smth")
    instance("B")
}
```

- You can destroy a participant:

```hylimo
sequenceDiagram(enableDebugging = true) {
    instance("A")
    instance("B")
    event("E1")
    destroy(A)
    event("E2")
}
```

- You can reanimate a dead participant:

```hylimo
sequenceDiagram {
    instance("A")
    instance("B")
    event("E1")
    destroy(A)
    event("E2")
    event("E3")
    instance("A²", below = A)
}
```

- You can activate and deactivate a participant, meaning that it is actively working on something:

```hylimo
sequenceDiagram(enableDebugging = true) {
    instance("A")
    instance("B")
    event("E1")
    activate(A)
    event("E2")
    deactivate(A)
}
```

Note as well that there are three dots when an event meets an activity indicator, except for the initial event. This has the following reason:\
Hylimo automatically infers where to place the arrow between participants sending/receiving a message: In general, a sent message is sent on the right and a received message is received on the left side of the indicator (this is a simplified, slightly incorrect explanation for the sake of brevity). These `left` and `right` coordinates show exactly the points where a message will be send/received from.\
The third point, the `center` shows where the event would have been located originally. It is "missing" when creating a new indicator as it is located behind the indicator (remember: Hylimo only knows what is currently available, and the indicator does not yet exist when it creates the points)

- Even multiple times simultaneously:

```hylimo
sequenceDiagram {
    instance("A")
    instance("B")
    event("E1")
    activate(A)
    event("E1margin", 5)
    activate(A)
    deactivate(A)
    event("E2")
    deactivate(A)
}
```

As you can see in this example, you can also use events to simulate margins, as we explicitly defined a pseudo-event whose only purpose is to add 5 pixels on the y-axis between the first indicator and the second one.

**important**: Since Hylimo only has access to the currently known state, we recommend the following order of execution:\
`activate` operations are the first operations after defining an event.\
Messages are sent after `activate` operations.\
`deactivate` operations are the last operations for this event.

## Messages

The following messages are available within sequence diagrams (in both directions, of course):

```hylimo
sequenceDiagram {
    instance("A")
    instance("B")
    event("E1")
    A -- B // asynchronous undirected message
    event("E2")
    A --> B // asynchronous directed message, object creation message
    event("E3")
    A -->> B // synchronous directed message
    event("E4")
    A <.. B // asynchronous return message
    event("E5")
    A <<.. B // synchronous return message
    event("E6")
    A --! B // destroy message
    event("E7")
    A ..! B // destroy return message
}
```

## Labels

Oftentimes, you want to display text on a message.\
To do this in Hylimo you can use the following construct (not exclusive to sequence diagrams, works in every other diagrams as well):

```hylimo
sequenceDiagram {
    instance("A")
    instance("B")
    event("E1")
    A --> B with {
        label("text") // positioned at the beginning - 0% of the length
    }
    event("E2")
    A --> B with {
        label("text", 0.5) // positioned in the middle - 50% of the length
    }
    event("E3")
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
|`destroyingCrossSize`| The width and height of a participant-destruction cross | 20 |-|
|`enableDebugging`| Toggles the debugging mode for sequence diagrams printing additional info | false |Rarely useful|
|`eventDistance`| How far to move downward on the y axis with the next event | 25 |Do not use a multiple of 10 for your own sake|
|`externalMessageDiameter`| Width and height of the circle of lost and found messages | 20 |-|
|`externalMessageDistance`| How far away on the x axis a lost or found message should be drawn | 95 | 100-(0.5\*activityWidth), chosen so that it aligns on the grid when sending a message against one activity indicator |
|`frameMarginX`| Default margin to apply on the left and right side of frames | 20 |-|
|`frameMarginY`| Default margin to apply on the top and bottom of frames | 5 | `margin`, we recommend keeping them in sync |
|`margin`| Margin to add to almost any interaction, i.e. to activity indicator endings |5| A non-`0` value makes the diagram slightly inaccurate but more visually appealing |
|`participantDistance`| How far apart subsequent participants should be | 200 | Multiple of `100` to align participants on the grid |

## Precise method documentation

### activate

Activates a participant at the y coordinate (minus `margin`) of the most recent event.
The same participant can be activated multiple times simultaneously.

**params**:

- 0: the participant (instance or actor) to activate
- `xShift`: an optional shift on the x-axis when using multiple activity indicators simultaneously on the same instance. Defaults to `activityShift`
- `yOffset`: an optional offset on the y-axis where to start being active. Defaults to `margin`

**returms**: the created indicator

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
- `below`: the optional participant below which this actor should be placed. If set, this actor will have the same x coordinate as the given value and the y coordinate of the current event

**returns**: the created stickman. If this actor is instanced, you can access the instance using `<return value>.instance`

### deactivate

Deactivates the most recent indicator of the given participant

**params**:

- 0: the participant to deactivate

### destroy

Destroys the given participant.

**params**:

- 0: the participant to destroy
- `crossSize`: The width and height of the cross to draw. Defaults to `destroyingCrossSize`

**returns**: the created cross

### event

Creates a new event.
**params**:

- 0: the name of the event. Can be used as variable afterward if not already declared
- 1: an optional distance on the y-axis to the previous event. Defaults to `eventDistance`

**returns**: the created event

### foundMessage

Creates the dot signaling a message from an external source.
Should always be used inline as a message from something else:

```hylimo
sequenceDiagram {
    instance("Bob")
    event("E")
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

- 0: the event or y axis coordinate to use for the top line, so the uppermost y coordinate of this frame
- `text`: The optional name of this fragment
- `subtext`: The optional subtext of this fragment
- `hasLine`: Whether to draw the line on top. Defaults to `true`
- `hasIcon`: Whether to draw the border around the name. Defaults to `text != null`

**returns**: A data object containing all this data plus the newly created elements

### frame

Creates a new frame around the given coordinates.

**params**:

- `topLeft`: The top left coordinate (event) to draw the frame around. The border will be extended by `frameMarginX` to the left and `frameMarginY` to the top by default
- `bottomRight`: The bottom right coordinate (event) to draw the frame around. The border will be extended by `frameMarginX` to the right and `frameMarginY` at the bottom by default
- `text`: The optional name of this frame, i.e. `if` or `while`
- `subtext`: The optional subtext of this fragment, i.e. a condition
- `hasIcon`: Whether to draw the border around the name. Defaults to `text != null`
- `marginRight`: An optional margin to use on the right side
- `marginBelow`: An optional margin to use on the bottom
- `marginLeft`: An optional margin to use on the left side
- `marginTop`: An optional margin to use on the top

**returns**: The created frame

### instance

Creates an instance which is an abstract concept of someone who participates in the diagram.

**params**:

- 0: the optional name of the instance. If the next argument is missing, this will be treated as the class name of the instance
- 1: the optional class name of the instance
- 2: A function determining the content of the instance
- `below`: the optional participant below which this instance should be placed. If set, this instance will have the same x coordinate as the given value and the y coordinate of the current event

**returns**: the created actor

### lostMessage

Creates the dot signaling a message to an external source.
Should always be used inline as a message to something else:

```hylimo
sequenceDiagram {
    instance("Bob")
    event("E")
    Bob -->> lostMessage()
}
```

Is exactly the same as `foundMessage`, the meaning comes from the direction in which you declare the message

**params**:

- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageDistance`
- `diameter`: the optional diameter of the dot. Defaults to `externalMessageDiameter`

**returns**: the created dot

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
- `instanced-actor-element` to layout the stickman of instanced actors
- `instanced-actor` to style the stickman of instanced actors
- `lost-message-element` to layout lost message elements
- `lost-message` to style lost messages
- `non-top-level-participant-element` to style any participant after an event was declared, so its `y` is not `0`
- `top-level-participant-element` to style any participant before any event was declared, so its `y` is `0`

## Advanced functionality

Sequence diagrams offer many features that are rather intended for experienced users.

### Frames

A `frame` is a rectangle containing a bunch of events, optionally with a text naming it and a subtext for further explanation.\
To declare a frame, you have to supply four mandatory attributes:\
Its top, left, bottom, and right side.\
The top and bottom side should be `event`s as their main purpose is being a y-coordinate.\
The left and right side should be participants such as `actor`s or `instance`s, as those have the x-coordinate information.\
Due to having to know these coordinates, you can only declare the frame after both events have been declared.

Additionally, there are a couple of optional attributes:

- `text`: the small text in the upper-left corner of the frame describing the type of frame, i.e. `if`, `loop`, or whatever else you want
- `subtext`: Additional text next to the categorisation, i.e. a condition for the conditional or loop
- `hasIcon`: Overrides if the border on the upper-left is shown. By default, it is `false` if `text` hasn't been set, and `true` if it is set
- `margin`: Sets the margin in pixels to all sides
- `margin(X,Y)`: Sets the margin in pixels on both sides of this axis. Overrides `margin`.\
- `margin(Top,Left,Bottom,Right)`: Sets the margin in pixels individually on this side. Overrides all other margins

Here's an example frame:

```hylimo
sequenceDiagram {
    instance("Alice")
    instance("Bob")
    instance("Charlie")

    event("start")
    event("communicate")
    Alice --> Bob with {
        label("Ping", 0.25, -5)
    }
    event("end")

    frame(top = start, left = Alice, bottom = end, right = Charlie, text = "while", subtext = "[condition]")
}
```

Unfortunately, as the frame must be declared last, frames will always need to be the most recent component and thus hide any underlying element from being selected in the UI.\
We haven't found a way around that yet.\
If you want to graphically edit i.e. a message inside a frame, please comment out the frame and then edit the message for the time being.

### Nested Frames

You can nest frames arbitrarily if you have enough events and participants.\
Simply declare a frame containing a subset of events/participants after the first one, and your subframe:

```hylimo
sequenceDiagram {
    y = instance("alice")
    a = instance("bob")
    actor("Dave")

    event("hi")
    event("hi2")
    instance("last")

    destroy(bob)
    event("hi3", 120)
    activate(last)
    z = instance("Cat", below = bob)
    alice --> z
    event("hi4")
    event("hi5")
    Dave <<-- last with {
        label("notify", 0.5)
    }
    event("hi6")
    event("hi7")

    frame(top = hi2, left = alice, bottom = hi7, right = last, text = "outer", marginRight = 40, marginTop = 25)
    frame(top = hi4, left = Dave, bottom = hi6, right = last, marginRight = 10, marginY = 12.4, text = "if", subtext = "[finished]")
}
```

### Frames with fragments

A frame can receive a number of fragments.\
A fragment is a separate section inside the frame, i.e. a `else if` for an `if`.\
In other words, a frame can have an optional line on the top to separate it from its predecessor, and text/subtext just like the frame.\
To declare a fragment, pass a function behind the frame where you can use the `fragment` function:

```hylimo
sequenceDiagram {
    y = instance("alice")
    a = instance("bob")
    actor("Dave")

    event("hi")
    event("hi2")
    instance("last")

    destroy(bob)
    event("hi3", 120)
    activate(last)
    z = instance("Cat", below = bob)
    alice --> z
    event("hi4")
    event("hi5")
    Dave <<-- last with {
        label("notify", 0.5)
    }
    event("hi6")
    event("hi7")

    frame(top = hi2, left = alice, bottom = hi7, right = last, text = "if", subtext = "[work to do]", marginRight = 40, marginTop = 25) {
        fragment(hi3, text = "else if", subtext = "[environment variable set]")
        fragment(hi5, text = "else")
    }
}

```

### Instanced actors

An actor can be seen as an `instance` too if you need it to.
In this case, the actor is an `instance` with a stickman on top.
To build an instanced actor, pass the second parameter to `actor`, the function declaring instance variables:

```hylimo
sequenceDiagram {
    actor("user") {
        values {
            age = 30
            isGrownUp = true
        }
    }

    instance("other")
    event("start")
    activate(user)
    activate(other)
    user -->> other
    deactivate(user)
    deactivate(other)
    event("end")
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
    y = instance("alice")
    a = instance("bob")
    actor("Dave")

    event("hi")
    event("hi2")
    instance("last")

    destroy(bob)
    event("hi3", 120)
    activate(last)
    z = instance("Cat", below = bob)
    alice --> z
    event("hi4")
    event("hi5")
    Dave <<-- last with {
        label("notify", 0.5)
    }
    event("hi6")
    event("hi7")

    frame(top = hi2, left = alice, bottom = hi7, right = last, text = "alt", subtext = "[work to do]", marginRight = 40, marginTop = 25) {
        fragment(hi3, subtext = "[environment variable set]")
        fragment(hi5, subtext = "[else]")
    }
}
```

#### opt-frame

An `opt` frame only executes the fragment where the condition is true.\
It represents a `switch` in the code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    y = instance("alice")
    a = instance("bob")
    actor("Dave")

    event("hi")
    event("hi2")
    instance("last")

    destroy(bob)
    event("hi3", 120)
    activate(last)
    z = instance("Cat", below = bob)
    alice --> z
    event("hi4")
    event("hi5")
    Dave <<-- last with {
        label("notify", 0.5)
    }
    event("hi6")
    event("hi7")

    frame(top = hi2, left = alice, bottom = hi7, right = last, text = "opt", subtext = "[status == pending]", marginRight = 40, marginTop = 25) {
        fragment(hi3, subtext = "[status == executing]")
        fragment(hi5, subtext = "[status == terminated]")
    }
}
```

#### loop-frame

A `loop` frame executes the code within the frame as long as the condition is true.\
It represents a `switch` in the code.\
You can optionally stop executing early using a nested `break` frame.
When the `break` frame is encountered and its condition (the subtext) is true, the loop is exited.

It can be used for example as follows:

```hylimo
sequenceDiagram {
    instance("Alice")
    instance("Bob")
    instance("Charlie")

    event("start")
    event("communicate")
    Alice --> Bob with {
        label("Ping", 0.25, -5)
    }
    event("breakStart", 40)
    event("breakEnd")
    event("sendMessage")
    Alice -->> Charlie with {
        label("sendMessage", 0.25)
    }
    event("end")

    frame(top = start, left = Alice, bottom = end, right = Charlie, text = "loop", subtext = "[message in messages]")
    frame(top = breakStart, left = Alice, bottom = breakEnd, right = Charlie, text = "break", subtext = "[all messages have been sent]", marginX = 5)
}
```

#### par-frame

A `par` frame executes its fragments simultaneously.\
It represents parallel execution in code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    instance("Alice")
    instance("Bob")
    instance("Charlie")

    event("start")
    event("communicateA")
    Alice --> Bob with {
        label("Ping", 0.25, -5)
    }
    event("communicateB", 50)
    Alice <-- Bob with {
        label("Ping", 0.25, -5)
    }
    event("communicateC", 50)
    Bob --> Charlie
    event("end")

    frame(top = start, left = Alice, bottom = end, right = Charlie, text = "par") {
        fragment(communicateB)
        fragment(communicateC)
    }
}
```

#### ref-frame

A `ref` frame signifies that another part of this diagram/ another sequence diagram should be executed for the components contained inside of it.\
It represents a method call in code.\
It can be used for example as follows:

```hylimo
sequenceDiagram {
    instance("Alice")
    instance("Bob")
    instance("Charlie")

    event("start")
    event("communicate")
    Alice --> Bob with {
        label("Ping", 0.25, -5)
    }
    event("handleErrorsStart", 50)
    event("handleErrorsEnd")
    event("end")

    frame(top = handleErrorsStart, left = Alice, bottom = handleErrorsEnd, right = Bob, text = "ref", subtext = "handle errors")
}
```

## Example

Here is an example for a webshop order:

```hylimo
sequenceDiagram(enableDebugging = true) {
    bob = instance("user")
    instance("ourShop", "Shop")
    instance("Cart")
    instance("Payment")

    event("initialRequest")
    activate(bob)
    activate(ourShop)
    user --> ourShop
    deactivate(bob)

    activate(Cart)
    event("cartRequest")
    ourShop --> Cart

    event("cartResponse")
    ourShop <.. Cart
    deactivate(Cart)

    activate(Payment)
    event("startPayment", 140)
    ourShop ..> Payment
    deactivate(Payment)

    event("notifyUser", 70)
    user <.. ourShop
    deactivate(ourShop)

    frame(top = cartResponse, left = user, bottom = notifyUser, right = ourShop, text = "if", subtext = "[response successful]", margin=30) {
        fragment(startPayment, text = "else", subtext = "[nothing was done]")
    }
}
```

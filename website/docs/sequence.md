---
hidden: true
---
# Sequence Diagrams

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
instance("Bob")
instance("Shop")
actor("Admin")
```
This example creates three participants, reading from left to right as `Bob`, `Shop` and lastly a user called `Admin`.

Now that we've populated our `x` axis, let's move on with the `y` axis.

The main way to move forward on the `y` axis in a sequence diagram is through `events`.\
An `event` needs a name to refer to it later on and automatically moves downward on the y axis:
```hylimo
event("startPayment")
```
As you can see above, the name should be understandable for you to know exactly which action is symbolized by this event.
This name will never be shown anywhere.

For most cases, the  default value for how far away the next event will be good-enough.
Nevertheless, in cases where you want an explicit distance to the predecessor, you are free to do so:
```hylimo
event("startPayment", 50)
```

This positions the event `50` pixels below its predecessor.
Note that while negative values are allowed here, they won't make any sense:
Instead, you can also move the previous event up by that amount and invert their meanings.

Both `event` and `participant` names will be registered as variables if they didn't exist already.
In case they existed already, the existing name takes precedence.
If their name is already used by something else, you can assign the result of these functions to a variable of your own choosing:
```hylimo
Bob = true
user = instance("Bob")
event("buy")
event("stop")
buy.Bob --> stop.Bob
```
In this example, we also see that to refer to a specific xy-coordinate, we can always use `eventname.participant`.

Now, we have the basic knowledge to go on with the remaining features that are all relative to the latest event.

## Interacting with participants

There is a bunch of things you can do with participants, depending on if there is a latest defined event:
- you can postpone the creation of a participant by defining it after an event:
```hylimo
instance("A")
event("smth")
instance("B")
```
- You can destroy a participant:
```hylimo
instance("A")
instance("B")
event("E1")
destroy(A)
event("E2")
```
- You can reanimate a dead participant:
```hylimo
instance("A")
instance("B")
event("E1")
destroy(A)
event("E2")
event("E3")
instance("A²", below = A)
```
- You can activate and deactivate a participant, meaning that it is actively working on something:
```hylimo
instance("A")
instance("B")
event("E1")
activate(A)
event("E2")
deactivate(A)
```
- Even multiple times simultaneously:
```hylimo
instance("A")
instance("B")
event("E1")
activate(A)
event("E1margin", 5)
activate(A)
deactivate(A)
event("E2")
deactivate(A)
```
As you can see in this example, you can also use events to simulate margins, as we explicitly defined a pseudo-event whose only purpose is to add 5 pixels on the y-axis between the first indicator and the second one.

**important**: Since Hylimo only has access to the currently known state, we recommend the following order of execution:\
`activate` operations are the first operations after defining an event.\
Messages are sent after `activate` operations.\
`deactivate` operations are the last operations for this event.

## Messages

The following messages are available within sequence diagrams (in both directions, of course):
```hylimo
instance("A")
instance("B")
event("E1")
E1.A -- E1.B // asynchronous undirected message
event("E2")
E2.A --> E2.B // asynchronous directed message, object creation message
event("E3")
E3.A -->> E3.B // synchronous directed message
event("E4")
E4.A <.. E4.B // asynchronous return message
event("E5")
E5.A <<.. E5.B // synchronous return message
event("E6")
E6.A --! E6.B // destroy message
event("E7")
E7.A ..! E7.B // destroy return message
```

## Global variables within sequence diagrams

The following global variables are available and modifiable within sequence diagrams:
|Variable|Meaning|Default value (in pixels)|Comment|
|--------|-------|-------------------------|-------|
|`activityShift`| How far on the x axis subsequent simultaneously active activity indicators on the same participant are shifted | 3 |-|
|`activityWidth`| How wide an activity indicator should be | 10|-|
|`destroyingCrossSize`| The width and height of a participant-destruction cross | 20 |-|
|`enableDebugging`| Toggles the debugging mode for sequence diagrams printing additional info | false |Rarely useful|
|`eventDistance`| How far to move downward on the y axis with the next event | 25 |Do not use a multiple of 10 for your own sake|
|`externalMessageDiameter`| Width and height of the circle of lost and found messages | 20 |-|
|`externalMessageDistance`| How far away on the x axis a lost or found message should be drawn | 95 | 100-(0.5*activityWidth), chosen so that it aligns on the grid when sending a message against one activity indicator |
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
- `xshift`: an optional shift on the x-axis when using multiple activity indicators simultaneously on the same instance. Defaults to `activityShift`
- `yoffset`: an optional offset on the y-axis where to start being active. Defaults to `margin`

**returms**: the created indicator

### actor

Creates a stickman figure symbolising a user.

**params**:
- 0: the optional name of the user. Defaults to `User`
- `below`: the optional participant below which this actor should be placed. If set, this actor will have the same x coordinate as the given value and the y coordinate of the current event

**returns**: the created actor

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
instance("Bob")
event("E")
foundMessage() -->> E.Bob
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
- `text`: the optional name of this fragment
- `subtext`: the optional subtext of this fragment
- `hasLine`: Whether to draw the line on top. Defaults to `true`
- `hasIcon`: Whether to draw the border around the name. Defaults to `text != null`

**returns**: a data object containing all this data plus the newly created elements

### frame

Creates a new frame around the given coordinates.

**params**:
- `topLeft`: The top left coordinate (event) to draw the frame around. The border will be extended by `frameMarginX` to the left and `frameMarginY` to the top by default
- `bottomRight`: The bottom right coordinate (event) to draw the frame around. The border will be extended by `frameMarginX` to the right and `frameMarginY` at the bottom by default
- `text`: the optional name of this frame, i.e. `if` or `while`
- `subtext`: the optional subtext of this fragment, i.e. a condition
- `hasIcon`: Whether to draw the border around the name. Defaults to `text != null`
- `marginRight`: An optional margin to use on the right side
- `marginBelow`: An optional margin to use on the bottom
- `marginLeft`: An optional margin to use on the left side
- `marginTop`: An optional margin to use on the top

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
instance("Bob")
event("E")
E.Bob -->> lostMessage()
```
Is exactly the same as `foundMessage`, the meaning comes from the direction in which you declare the message

**params**:
- `distance`: the optional distance of the message on the x axis. Defaults to `externalMessageDistance`
- `diameter`: the optional diameter of the dot. Defaults to `externalMessageDiameter`

**returns**: the created dot

## Available class names

The following class names are available for styling/layout purposes within sequence diagrams:
- `activity-indicator` to style activity indicators
- `activity-indicator-element` to layout activity indicator elements
- `lost-message` to style lost messages
- `lost-message-element` to layout lost message elements
- `found-message` to style found messages
- `found-message-element` to layout found message elements
- `fragment-name-border` to style the border around fragment names
- `fragment-name` to style the text display of fragment names
- `fragment-name-element` to layout both the border and name of fragments
- `fragment-subtext` to style the subtext of fragments
- `fragment-subtext-element` to layout the subtext of fragments
- `frame` to style frames
- `frame-element` to layout the subtext of frames
- `top-level-participant-element` to style any participant before any event was declared, so its `y` is `0`
- `non-top-level-participant-element` to style any participant after an event was declared, so its `y` is not `0`
- `destroy-cross-path` to style the cross of a destroyed participant
- `destroy-cross-path-element` to layout the cross of a destroyed participant
- `actor` to style actors
- `actor-element` to layout actors
- `instance` to style instances
- `instance-element` to layout instances

## Example
Here is an example for a webshop order:

```hylimo
sequenceDiagram {
  bob = instance("user")
  instance("ourShop", "Shop")
  instance("Cart")
  instance("Payment")

  activate(bob)
  activate(ourShop)
  event("initialRequest")
  initialRequest.User --> initialRequest.Shop
  deactivate(bob)

  activate(Cart)
  event("cartRequest")
  cartRequest.Shop --> cartRequest.Cart

  event("cartResponse")
  cartResponse.Shop <.. cartResponse.Cart
  deactivate(Cart)

  activate(Payment)
  event("startPayment")
  startPayment.Shop ..> startPayment.Payment
  deactivate(Payment)

  event("notifyUser", 30)
  notifyUser.User <.. notifyUser.Shop
  deactivate(Shop)

  frame(contained = list(cartResponse.Shop, cartResponse.Cart, notifyUser.User, notifyUser.Shop), name = "if", condition = "[response successful]", margin=30)
}
```


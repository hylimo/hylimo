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
The sequence diagram has always only the currently available information and no additional information.


## Terminology

In a sequence diagram, we have the following concepts:
- Participant: A component that "participates" in the diagram, so whose behavior should be modeled.\
  It can be one of the following:
  - an `instance` without a name (`User`)
  - an `instance` with a name (`Bob: User`)
  - an `actor` (a stickman symbolizing a user), optionally with a name
- Lifeline: the entire duration a participant is alive, symbolized by the dotted line downwards
- Event: an x/y coordinate linking a point in time to a participant, accessed by using the syntax `event.participant`, so i.e. `startPayment.User`.\
- Message: arrow between two `event`s with a semantic meaning
- Activity: the time a participant is active
- Frame: Box around some events. Can optionally contain a name (i.e. `if`, `while`), and sub compartments

## Example
Here is an example for a webshop order:

```hyl
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

  event("notifyUser")
  notifyUser.User <.. notifyUser.Shop
  deactivate(Shop)

   frame(contained = list(cartResponse.Shop, cartResponse.Cart, notifyUser.User, notifyUser.Shop), name = "if", condition = "[response successful]", margin=30)
}
```

## Order matters

Below, you'll find the order in which you should declare things so that they work as expected.\
Hylimo walks through the diagram from left to right, and then from top to bottom.\
The main way to move forward on the `y` axis in a sequence diagram is through `events`:\
An `event` 

First, declare all participants (`instance`, `actor`) in the order you want to display them as they will be positioned on the x axis in this order.
Then, you can continue with the event-specific logic <TODO>

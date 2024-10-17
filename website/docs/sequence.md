---
hidden: true
---
# Sequence Diagrams

Hylimo is able to efficiently draw sequence diagrams.
On top of that, it is the most efficient tool we know to draw any typical sequence diagram:
If you do not use any "advanced" sequence diagram feature we don't know of, sequence diagrams defined in Hylimo are the easiest diagrams you ever created.

## Terminology

In a sequence diagram, we have the following concepts:
- Actor: one component whose behavior should be included in the diagram. Contains either a name (`User`), or a UML variable declaration (`Bob: User`)
- Lifeline: Duration during which a given actor is actively working on this problem. An actor can have multiple lifelines. More than one lifeline means that a process has parts that are fully asynchronous from one another.
- Timeline: One-dimensional representation of your diagram that only stores the abstract instants when events happen (timeline points), without knowing where they occurred
- Timeline point: A point in time at which \<something\> happens. There is no meaning behind this point in this definition, we simply know that **something** will happen here. A point is unique per timeline, so you know that if timeline point `A` == timelinepoint `B`, then we are at the same point in time and vice versa, if you construct a new point it is not equal to an existing one
- Event: Combination between a timeline point and an actor (not necessarily its lifelines as for example messaging is possible where you receive the message prior to processing it) or a custom point.\
  Note that each combination is unique and maps to one two dimensional point in the diagram - event to actor.
- Frame: Box around a bunch of events. Can optionally contain a name (i.e. `if`, `while`), and sub compartments
- Connection: Connects two events in the typical hylimo fashion

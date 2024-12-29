# Protocol research meeting 2024-11-05

## Component diagrams

- It should be possible to connect two inner/outer ports
- C4 diagram? Different layers of views. Somewhat requested - possible, but hard
- The component icon should be hideable, at best even globally
  - -> best option: `styles` instead of an extra `noIcon` parameter
- `<<component>>` text should be optional, just like the icon - not having either should be supported
- interface naming
  - should be equal to icon hiding: i.e. either both a parameter, or both a style
  - option 1: always display it below, position is modifiable. problem: setting to `null` is not possible
  - general consensus: it should be easy to write
  - consensus: it is a more common usecase to have the names than it is to not have them
  - consensus: the names should always be shown
  - consensus: when you don't want it to be shown, pass an empty string to `requires`, and assign the result to a variable to call it instead

## Toolbox

- Options:
  - GLSP (Sprotty based) - has only text elements, no icons
  - draw.io - has an icon button
- how to align them?
  - one per row - eternal vertical scrolling
  - multiple
- required: a search box
- preferred: icon, at best with description (tooltip?, preview on hover?)
- how to create associations?
  - draw.io way - drag an association into the editor: Not possible in Hylimo
  - eclipse way - first select a start, and then an end
    - Hated. Do not use.
  - gropius way - click on a component, and then you have a popup where you can select to draw a line until an end
  - draw.io way2 - virtual waypoints on the component around its border where you can start drawing an error
  - preferred: draw.io way2

## Sequence diagrams

- Builtin frames for every type of common frame:
  - ifframe
  - optframe
  - …
- correct arrow head
  - sync (-->>)
  - async (-->)
  - reply (..>> or ..>)
- lifeline is not activity indicator -> fix terminology
- instance is not the general term, the general term is `participant`
- lifelines must be destroyable
- multiple participants per x coordinate must be possible (but different y-coordinate)

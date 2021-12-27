# Why?

The idea of this application born when I found myself frustrated with [Fritzing](https://fritzing.org/).
I was missing many UX features, e.g. shifting a breadboard wiring by few positions and,
what's more important, verification that resulting scheme is what I wanted to have logically.
It would be nice to have an automated way to verify the correctness of the wiring.

The main idea is that one will have two views: logical and physical that are connected on a logical level.
App will be able to verify that e.g. all pins of one chip is connected to the same pins on the other chip
on logical scheme. There is no 1:1 correspondence of course, some part that are present on a physical scheme
might naturally missing on a logical one.

Editor is a typescript js node js app that uses konva.js framework to draw. One of the main principles I would like to
have is to make it "event driven" - so the state can be fully recreated by replaying a history of "events" or "actions".
That makes undo-redo operations easy to implement and have an automated way to verify that undoing an action will return
to exactly the same state.

# Running the application

To start an app:
```
npm run dev
```

To run tests:
```
npx jest <--watch>
```
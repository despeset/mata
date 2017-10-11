# Mata

Mata is a library for building finite state automata, also known as state
machines. Mata's Automata derive their state computationally by applying 
functions to input data.

The majority of examples in this documentation are in plain JavaScript. However, 
Mata is implemented in [TypeScript](http://www.typescriptlang.org/). There are
references to types throughout the [API documentation](/docs/api/README.md).

Mata is well under 1kb minified and gzipped.

## Quick example

For a more in-depth explanation, see the [Guide](/docs/Guide.md)

```js
import * as Mata from 'mata';
/**
 * This is a Schematic, it defines the set of states and rules which govern
 * the automata. 
 *
 * Each top level key in the initialization object represents a valid state, 
 * it's value is an object of second-level keys representing the valid states 
 * to which the top-level state can transition, each providing a function 
 * which checks the conditions necessary to make that transition.
 **/
const Water = new Mata.Schematic({
    solid: {
        liquid: ({ temp }) => temp > 0,
    },
    liquid: {
        solid:  ({ temp }) => temp <= 0,
    }
});

// This instantiates an Automaton given a valid starting state – this is the 
// stateful instance which will run the rules from the Schematic.
const water = Water.createAutomaton(Water.states.liquid);

// You can subscribe a function to execute whenever the automaton transitions
// between states.
water.subscribe((from, to) => console.log(`${from} --> ${to}`));

// The next method will check the conditions for transition from the current
// state against the input and transition if the conditions are satisfied.
water.next({ temp: -150 }); // liquid --> solid

// The current state is exposed on the state property
water.state === Water.states.solid;
```

## Installation

Add mata to your project via `npm`

```bash
npm install --save mata
```

## Motivation

Most state machine libraries use rule sets which map from state to state
with verbs which are invoked in some way to trigger transitions. 

For example:

```js
const fsm = new ExampleFakeFSM({
    red: { timer: 'green' },
    green: { timer: 'yellow' },
    yellow: { timer: 'red' },
});
// later
fsm.trigger('timer');
```

This is a useful way to model things which respond to incoming events, like
traffic lights. Mata is not generally as well suited to these tasks, though it 
can be used this way.

Mata is better suited for deriving state from data. The water example used
throughout this documentation is a fine and simple one.

For those familiar with [Redux](http://redux.js.org/), you can think of these
*verb-oriented* automata as useful for business logic driven by the stream of 
actions, and Mata's *data-oriented* automata for business logic derived from the 
state.

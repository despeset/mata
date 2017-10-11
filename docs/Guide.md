# Guide to using Mata

Mata is broken down into two distinct parts. The first is the
[`Schematic`][Schematic] which describes the state machine and returns a factory
for producing [`Automaton`][Automaton] instances. The [`Automaton`][Automaton] 
instances are finite state machines used to execute the instructions defined
in the [`Schematic`][Schematic].

## Definition

Mata's rule system is described as a map of maps. The first level of keys
represent valid states, which map to an object of target states and conditions
for that transition. For example:

```js
const Water = new Mata.Schematic({
    liquid: {
        solid: ({ temp }) => temp <= 0
    }
});
```
This defines two states, `liquid` and `solid` — and a single possible transition
event between `liquid` and `solid` when the condition `temp <= 0` is met.

Because there are no transitions defined for `solid`, it is a **terminal state**.
We can add a transition back to liquid like this:

```js
const Water = new Mata.Schematic({
    liquid: {
        solid: ({ temp }) => temp <= 0
    },
    solid: {
        liquid: ({ temp }) => temp > 0
    }
});
```

Now our state machine has **no terminal states**.

### Global Routes

In addition to the normal set of state keys, Mata provides `Symbols` and 
constants to provide special behaviors when defining a set of Route. All the
special rule constants are exported under the [`Route`][Route] namespace. Currently, 
there is only a single state `Symbol` supported, [`Route.FromAnyState`][FromAnyState], and two
condition constants [`Route.Continue`][Continue] and [`Route.Never`][Never].

To demonstrate, imagine we are defining a state machine to represent a game flow.

```js
const { Route } = Mata;
const GameNav = new Mata.Schematic({
    start: {
        stageOne: Route.Continue,
    },
    stageOne: {
        stageTwo: ({ score }) => score > 100,
    },
    stageTwo: {
        win: ({ score }) => score > 200,
    },
    win: {
        start: Route.Continue,
    },
});
```

[`Route.Continue`][Continue] is a constant that represents `() => true` — when 
[`next`][next] is called the condition will be met and the state transitioned 
regardless of input.

Right now, there's no way to lose our game — we want to go to the `lose` state
whenever the user has `0` lives left from anywhere in the flow. Here we can
use [`Route.FromAnyState`][FromAnyState]:

```js
const GameNav = new Mata.Schematic({
    [Route.FromAnyState]: {
        lose: ({ lives }) => lives === 0,
    },
    start: {
        stageOne: Route.Continue,
    },
    stageOne: {
        stageTwo: ({ score }) => score > 100,
    },
    stageTwo: {
        win: ({ score }) => score > 200,
    },
    win: {
        start: Route.Continue,
    },
    lose: {
        start: Route.Continue,
    }
});
```

Now our game can transition to the `lose` state from any other state.

### Route Priority

In our previous example we used [`Route.FromAnyState`][FromAnyState] to define 
a global route. What if we want to exclude a single state from that global 
route? Mata supports this through how it handles rule priority.

**The more specific rule governing a state -> state transition wins**

For example:

```js
const RulePriority = new Mata.Schematic({
    [Route.FromAnyState]: {
        lose: ({ lives }) => lives === 0,
    },
    start: {
        lose: Route.Never
    }
})
```

The opposite of [`Route.Continue`][Continue], [`Route.Never`][Never] is a 
constant that represents `() => false` — when [`next`][next] is called the 
condition will never be met regardless of input. It is primarily used for 
negating global routes.

**Note** in this example, given the state: `start`. the global route 
condition for `* -> lose` is *never evaluated*, as it is superceeded by the 
more specific `start -> lose` route.

What about multiple routes from a given state which may evaluate to true at the
same time? For example:

```js
const RoutePriority = Mata.Schematic({
    start: {
        choiceA: ({ a }) => a > 100,
        choiceB: ({ b }) => b > 100,
    }
});
```

In this example, imagine that input is `{ a: 200, b: 200 }` — which state will
be transitioned to when [`next`][next] is called? The answer is `choiceA`.

**Rules are evaluated in definition order** — the first one to match wins. As
with the global route priority example above, the `start -> choiceB` condition
will not be evaluated at all because the state machine short circuts to 
transition as soon as a viable path is found.

## Execution

Once a [`Schematic`][Schematic] has been defined, you can call 
[`createAutomaton`][createAutomaton] to produce an [`Automaton`][Automaton]
instance given and initial starting state.

```js
const Water = new Mata.Schematic({
    liquid: {
        solid: ({ temp }) => temp <= 0
    }
});

const water = Water.createAutomaton(Water.states.liquid);
```

You can retrieve the current state with the read-only [`state`][state] property:

```js
water.state === Water.states.liquid;
```

When you want to step the state machine, call [`next`][next] with your input:

```js
water.next({ temp: 0 });
```

This will evaluate all the available conditions and transition to a new state
if a passing condition is found. If no new state is valid, no transition takes 
place and it is effectively a no-op.

If you wish to listen for transition events, you can attach a callback using
[`subscribe`][subscribe].

```js
water.subscribe(({ from, to, input }) => {
    console.log(`${from} --(${input.temp})--> ${to}`);
});
```

This will only be executed when a transition between valid states takes place.

If you wish to manually transition to a state without regard for the routes or
conditions, you can call [`force`][force].

```js
water.force(Water.states.liquid);
```

The argument must be a state defined in the original Routeet but no other 
restrictions exist. Subscribed listeners will be executed as normal, though 
`event.input` will be `undefined`.

## Devtool

Coming soon

[Schematic]: ./api/Schematic.md
[createAutomaton]: ./api/Schematic.md#createAutomaton

[Automaton]: ./api/Automaton.md
[next]: ./api/Automaton.md#next
[subscribe]: ./api/Automaton.md#subscribe
[force]: ./api/Automaton.md#force

[Route]: ./api/Route.md
[FromAnyState]: ./api/Route.md#FromAnyState
[Continue]: ./api/Route.md#Continue
[Never]: ./api/Route.md#Never

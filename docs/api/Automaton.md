# `Automaton`

Discrete finite state automaton instantiated via 
[`Schematic#createAutomaton`](./Schematic.md#createAutomaton). Execute the
state machine following the rules defined by the [`Schematic`][Schematic].
Execution is controlled by the [`next(input)`](#next) method.

```js
// Instantiated from a Schematic createAutomaton method call
const water = Water.createAutomaton(Water.states.liquid);

// Evaluate the ruleset for a given input
water.next({ temp: 50 });
// If no conditions are satisfied, remain in the same state
water.state === Water.states.liquid;
water.next({ temp: -10 });
// When a condition is satisfied, transition to a new state
water.state === Water.states.solid;

// Transitions can be listened to
water.subscribe((from, to, input) => {
    console.log(`${from} –-(${input.temp})--> ${to}`)
});
water.next({ temp: 50 });
// Logs "solid --(50)--> liquid"
```

### Constructor

The `Automaton` class is not designed to be instantiated directly. 
Always instantiate instances via 
[`Schematic#createAutomaton`](./Schematic.md#createAutomaton). The class is 
exported only for use in type annotation.

## Instance Methods & Properties

-----------------------------------------------------------------------------
#### <a id='next'></a>[`next(input: T)`](#next)

Evaluates the rules in the [`RuleSet`][RuleSet] which are available from the
current state, transitions to the next state if a valid one is found for the 
provided [`input`][T].

```js
water.next({ temp: 50 }) === Water.states.liquid;
```

**Argument** [`input: T`][T] the input to evaluate functions in the 
[`RuleSet`][RuleSet] against.

**Return** `State` the next state after evaluating the [`RuleSet`][RuleSet]

-----------------------------------------------------------------------------
#### <a id='force'></a>[`force(state: ValidState)`](#force)

Transitions to the provided [`state`][ValidState] without regard for the [`RuleSet`][RuleSet].
The `state` must be present in the initial [`RuleSet`][RuleSet], and therefor
a [`ValidState`][ValidState], but no other restrictions apply.

```js
water.force(Water.states.liquid);
```

**Argument** [`state: ValidState`][ValidState] the state to transition to.

**Return** `State` the state after transitioning.

**Throws** `AutomatonException` if the `state` is not valid (present in the `RuleSet`).

-----------------------------------------------------------------------------
#### <a id='subscribe'></a>[`subscribe(listener: Function)`](#subscribe)

Register a listener to be executed when the `Automaton` transitions from 
one state to another.

```js
const unsubscribe = water.subscribe(({ from, to, input}) => {
    console.log(`${from} --(${input.temp})--> ${to}`);
});
// later...
unsubscribe();
```

**Argument** `listener: Function` the signature is `(event: TransitionEvent) => void`. `TransitionEvent` contains three keys: `from`, `to`, and `input`.

**Return** `unsubscribe: Function` a [thunk](https://stackoverflow.com/a/925538), execute to unregister the `listener`.

-----------------------------------------------------------------------------
#### <a id='state'></a>[`state: ValidState`](#state)

The current state of the `Automaton`.

```js
water.state === Water.states.liquid;
```

**Read Only** can only be changed by [`next`][#next] or [`force`][#force].

-----------------------------------------------------------------------------
#### <a id='states'></a>[`states: ValidStates`](#states)

Lookup table for every [`ValidState`][ValidState]. Pointer to 
[`Schematic.states`][./Schematic.md#states].

```js
water.states === Water.states;
```

-----------------------------------------------------------------------------
#### <a id='schematic'></a>[`schematic: Schematic`](#schematic)

The [`Schematic`][Schematic] used to construct this `Automaton`.

```js
water.schematic === Water;
```

[Schematic]: ./Schematic.md
[RuleSet]: ./Types.md#RuleSet
[ValidState]: ./Types.md#ValidState
[State]: ./Types.md#State
[T]: ./Types.md#T
[Definition]: ../guide/Definition.md

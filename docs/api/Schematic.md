# `Schematic(rules: RuleSet)`

Class for configuring a finite state automata, acts as a factory to create 
discrete [`Automaton`][Automaton] instances via 
[`createAutomaton`](#createAutomaton).

For more information on Mata's rule system, see the 
[Definition Guide][Definition]

```js
import { Schematic } from 'mata';
// Define a new machine type with the given rules
const Water = new Schematic({
    liquid: {
        solid: ({ temp }) => temp <= 0
    }
});
// The states property is a lookup table for each valid state in the rules
Object.keys(Water.states) === ["liquid", "solid"];
// The rules property exposes the underlying ruleset passed in originally
typeof Water.rules.liquid.solid === 'function';
// createAutomaton(initialState) returns an `Automaton` in the provided state.
const water = Water.createAutomaton(Water.states.liquid);
```

## TypeScript

In TypeScript you should type `Schematic<T>` to your input data:

```typescript
interface Particle { temp: number }
const Water = new Schematic<Particle>({ // ...
```

### Constructor arguments

1. (*RuleSet*) The [`RuleSet`][RuleSet] to define the state machine.

## Instance Methods & Properties

-----------------------------------------------------------------------------
#### <a id='createAutomaton'></a>[`createAutomaton(initialState: ValidState)`](#createAutomaton)

**Argument** `initialState: ValidState` the state to start the [`Automaton`][Automaton] in.

**Returns** a new [`Automaton`][Automaton] instance with the starting state of `initialState`.

**Throws** `AutomatonException` if `initialState` is not valid (present in the `RuleSet`).

-----------------------------------------------------------------------------
#### <a id='states'></a>[`states: ValidStates`](#states)

A dictionary of every [`State`][State] defined in the [`RuleSet`][RuleSet].

-----------------------------------------------------------------------------
#### <a id='rules'></a>[`rules: RuleSet`](#rules)

The [`RuleSet`][RuleSet] used to construct this `Schematic`.

[Automaton]: ./Automaton.md
[RuleSet]: ./Types.md#RuleSet
[State]: ./Types.md#State
[Definition]: ../guide/Definition.md
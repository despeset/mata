# Types

Mata is written in TypeScript — the primary mechanism for type safety is to
provide a concrete input data type to [`Schematic<T>`][Schematic]

```typescript
interface Particle { temp: number };
const Water = new Mata.Schematic<Particle>({
    liquid: {
        solid: ({ temp }) => temp <= 0
    }
});
```

-----------------------------------------------------------------------------
#### <a id='State'></a>[`State`](#State)

```typescript
type State = string;
```

Represents a valid state — states are dirived from the [`RuleSet`](#RuleSet) 
keys and are plain strings.

```js
Water.states.liquid === 'liquid';
```

-----------------------------------------------------------------------------
#### <a id='ValidStates'></a>[`ValidStates`](#ValidStates)

```typescript
type ValidStates = { [state: string]: State };
```

The type of the generated lookup table for referencing states — exposed by
both the [`Schematic`][Schematic] and [`Automaton`][Automaton] as a `states` 
property.

```js
Water.states === { liquid: 'liquid' };
```

-----------------------------------------------------------------------------
#### <a id='Condition'></a>[`Condition<T>`](#Condition)

```typescript
type Condition<T> = (input: T) => boolean;
```

The function signature for conditions used in [`RuleSet`](#RuleSet). At runtime,
a candidate route is followed if the condition returns `true` given the 
`input: T`.

-----------------------------------------------------------------------------
#### <a id='RuleSet'></a>[`RuleSet<T>`](#RuleSet)

```typescript
type RuleSet<T> = { 
    [from: string]: { 
        [to: string]: Condition<T> 
    }
};
```

The argument type for defining a [`Schematic`][Schematic]. For a detailed guide 
on rules, see the [Definition Guide][Definition].

-----------------------------------------------------------------------------
#### <a id='Listener'></a>[`Listener<T>`](#Listener)

```typescript
type Listener<T> = (event: TransitionEvent<T>) => void;
```

Function signature for callbacks registered with the [`Automaton`][Automaton] 
[`subscribe`][subscribe] method.

-----------------------------------------------------------------------------
#### <a id='Unsubscribe'></a>[`Unsubscribe`](#Unsubscribe)

```typescript
type Unsubscribe = () => void;
```

Thunk, returned from the [`Automaton`][Automaton] [`subscribe`][subscribe] 
method.

-----------------------------------------------------------------------------
#### <a id='TransitionEvent'></a>[`TransitionEvent<T>`](#TransitionEvent)

```typescript
interface TransitionEvent<T> {
    from: State
    to: State
    input?: T
}
```

Input argument to the [`Listener<T>`](#Listener) - provides data about the 
transition between states. `input` is `undefined` if the transition was caused 
by a call to [`force`][force].

[Schematic]: ./Schematic.md
[createAutomaton]: ./Schematic.md#createAutomaton

[Automaton]: ./Automaton.md
[next]: ./Automaton.md#next
[subscribe]: ./Automaton.md#subscribe
[force]: ./Automaton.md#force

[Route]: ./Route.md
[FromAnyState]: ./Route.md#FromAnyState
[Continue]: ./Route.md#Continue
[Never]: ./Route.md#Never

[Definition]: ../Guide.md#definition
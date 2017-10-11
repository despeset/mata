# API Reference

## [`Schematic`](./Schematic.md)

Primary class, used to define the behavior of the finite state automata.

* [`TypeScript`](./Schematic.md#typescript)
* [`createAutomaton`(initialState)](./Schematic.md#createAutomaton)
* [`states`](./Schematic.md#states)
* [`rules`](./Schematic.md#rules)

## [`Automaton`](./Automaton.md)

Runtime class, returned by 
[`createAutomaton`(initialState)](./Schematic.md#createAutomaton) and used to
execute the state machine.

* [`next(input)`](./Automaton.md#next)
* [`force(state)`](./Automaton.md#force)
* [`subscribe(listener)`](./Automaton.md#subscribe)
* [`state`](./Automaton.md#state)
* [`states`](./Automaton.md#states)
* [`schematic`](./Automaton.md#schematic)

## [`Route`](./Route.md)

Constants that can be used when defining a [`Schematic`](./Schematic.md)

* [`FromAnyState`](./Route.md#FromAnyState)
* [`Continue`](./Route.md#Continue)
* [`Never`](./Route.md#Never)

## [Types](./Types.md)

The exported set of [TypeScript](http://www.typescriptlang.org/) types.

* [`State`](./Types.md#State)
* [`ValidStates`](./Types.md#ValidStates)
* [`Condition<T>`](./Types.md#Condition)
* [`RuleSet<T>`](./Types.md#RuleSet)
* [`Listener<T>`](./Types.md#Listener)
* [`Unsubscribe`](./Types.md#Unsubscribe)
* [`TransitionEvent<T>`](./Types.md#TransitionEvent)
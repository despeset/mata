# `Route`

Constants to be used when defining a [`Schematic`](./Schematic.md). `Symbols`
are used to represent special states, and constant functions represent
common conditions.

```js
const { Route } = Mata;
const Water = new Mata.Schematic({
    [Route.FromAnyState]: {
        end: ({ lives }) => lives === 0,
    },
    start: {
        screenOne: Route.Continue
    }
})
```

## Instance Methods & Properties

-----------------------------------------------------------------------------
#### <a id='FromAnyState'></a>[`FromAnyState`](#FromAnyState)

A `Symbol` which represents any valid state. Used to define 
[Global Routes](../Guide.md#global-routes).

```js
const Water = new Mata.Schematic({
    [Route.FromAnyState]: {
        gameOver: ({ lives }) => lives === 0
    },
    // ...
});
```

-----------------------------------------------------------------------------
#### <a id='Continue'></a>[`Continue`](#Continue)

A constant function which is `() => true` — a route which should always be 
followed regardless of input.

```js
const Water = new Mata.Schematic({
    start: {
        screenOne: Route.Continue
    },
    // ...
});
```
-----------------------------------------------------------------------------
#### <a id='Continue'></a>[`Never`](#Continue)

A constant function which is `() => false` — a route which should never be 
followed regardless of input. Used primarily to negate
[Global Routes](../Guide.md#global-routes).

```js
const Water = new Mata.Schematic({
    [Route.FromAnyState]: {
        gameOver: ({ lives }) => lives === 0
    },
    start: {
        gameOver: Route.Never,
    }
});
```
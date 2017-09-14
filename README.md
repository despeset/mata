# Mata

**This is an early work in progress, consider this a speculative draft**

A small finite-state automata framework for JS, built with first-class
TypeScript support.

For example, let's say we want to represent a login flow for a user in a web 
application. Our application state has a `User` object:

```.ts
interface User {
    admin: boolean
    authed: boolean
}

let user: User = {
    admin: false,
    authed: false,
};
```

## Defining a state machine

We can define a state machine for our `User` type which will represent the
navigation flow for logging in.

```.ts
const fsm = new mata.Machine<User>({
```

The `Machine` constructor takes a single `Initializer` object which has two
required keys `machine` and `config`. The `machine` key is the definition
of the state machine. It is of the form: `{ from: { to: condition } }`:

```.ts
    machine: {
        signIn: {
            adminView: (u) => u.admin,
            userView: (u) => u.authed && !u.admin
        },
        adminView: {
            signOut: (u) => !u.authed
        },
        userView: {
            signOut: (u) => !u.authed        
        },
        signOut: {
            signIn: mata.Continue 
        }
    },
```

So if the machine is in the state `adminView`, it will transition to the state
`signOut` if the `user.authed` property is `false`.

The other part of the `Initialization` argument is `config`. It requires an
`init` argument of the form `(states: ValidStates) => State`. The `states`
argument is a lookup table of every known state.

```.ts
    config: {
        init: (states) => states.signIn
    }
});
```

## Running a state machine

At runtime, the `state` property represents the current `state`. The `states`
property is a lookup table / constants for all valid states. 

```.ts
fsm.state === fsm.states.signIn; // initial state
```

The `next(input)` method causes the state machine to transition to the next
valid state with a condition that returns `true` for `input`.

```.ts
user.authed = true;
fsm.next(user);
fsm.state === fsm.states.userView;
```

`next` doesn't always cause a state change – if no condition is satisfied then
the state remains the same.

```.ts
fsm.next(user);
fsm.state === fsm.states.userView;
```

## Observing a state machine

The `subscribe` method registers a listener function that is executed every 
time the state transitions. The `Listener` is of the type 
`(e: TransitionEvent) => void`. The `TransitionEvent` includes `from`, `to` and
`input` keys. NOTE: The `input` will be null if `transition` is invoked manually.

```.ts
fsm.subscribe(({ from, to, input }) => {
    console.log(`Transition: ${from} --> ${to} for ${input}`);
});
user.authed = false;
fsm.next(user);
// Transition: userView --> signOut for { authed: false, admin: false }
```

If you wish to detach your `Listener`, store the return value of
`subscribe`, it is a function which will unsubscribe your new listener when
executed:

```.ts
const unsubscribe = fsm.subscribe(({ from, to, input }) => { });
// ... later
unsubscribe(); // listener will no longer execute
```

## Visualizing a state machine

`mata/visualizers` provides some functions for turning a state machine into
a graph description. Currently [Mermaid](https://mermaidjs.github.io/) and 
[Dot](http://www.graphviz.org/doc/info/lang.html) are supported. The example
state machine from this readme looks like:

`toMermaid`:

![Diagram visualizing the example state machine](docs/images/mermaid.svg?raw=true "Mermaid Diagram")

`toDot`:

![Diagram visualizing the example state machine](docs/images/graphviz.svg?raw=true "GraphViz (Dot) Diagram")
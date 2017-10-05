# Mata

Mata is a library for building finite state automata, also known as state
machines. A state machine transitions between a predetermined number of states 
based on rules applied to input.

```.js
const Water = new Mata.Machine({
    solid: {
        liquid: ({ temp }) => temp > 0
    },
    liquid: {
        solid: ({ temp }) => temp <= 0,
        gas: ({ temp }) => temp >= 100,
    },
    gas: {
        liquid: ({ temp }) => temp < 100,
    }
});

const water = Water.init(Water.states.liquid);
water.subscribe((from, to) => console.log(`${from} --> ${to}`));
water.next({ temp: 150 });
water.next({ temp: 50 });
water.next({ temp: -150 });
/*
liquid --> gas
gas --> liquid
liquid --> solid
*/
water.state === Water.states.solid;
```

## Typescript support

Mata has first class typescript support – `Machine` is a generic class which 
should be typed on the input.

```.ts
interface Particle {
    temp: number
}

const Water = new Mata.Machine<Particle>({
    solid: {
        liquid: ({ temp }) => temp > 0
    },
    // ...
});
```
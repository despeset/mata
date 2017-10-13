import * as Mata from 'mata';
import { Inspector } from '@mata/devtool';

interface Particle {
    temp: number
}

const Water = new Mata.Schematic<Particle>({
    solid: {
        liquid: ({ temp }) => temp > 0,
    },
    liquid: {
        solid: ({ temp }) => temp <= 0,
        gas: ({ temp }) => temp >= 100,
    },
    gas: {
        liquid: ({ temp }) => temp < 100,
    }
});

const water = Water.createAutomaton(Water.states.liquid);

const p = { temp: -100 };
let delta = 1;
setInterval(() => {
    p.temp += delta;
    if (p.temp > 200 || p.temp < -100) {
        delta = -delta;
    }
    water.next(p);
}, 16);

new Inspector(document.body, water);
import * as Mata from 'mata';
import { Inspector } from '@mata/devtool';

const { Route } = Mata;

interface SinkControls {
    tap: number
    waterVolume: number
    capacity: number
    drainable: boolean
};

const Sink = new Mata.Schematic<SinkControls>({
    [Route.FromAnyState]: {
        running: (s) => s.tap > 0,                    
    },
    empty: {},
    running: {
        full: (s) => s.tap === 0 && !s.drainable,
        draining: (s) => s.tap === 0 && s.drainable,
    },
    full: {
        draining: (s) => s.drainable,
    },
    draining: {
        empty: Route.Continue
    },
});

const sink = Sink.createAutomaton(Sink.states.empty);

const controls: SinkControls = {
    tap: 0,
    waterVolume: 0,
    capacity: 0,
    drainable: true,    
};

const queue: SinkControls[] = [];
const enqueue = (input: SinkControls) => queue.push(Object.assign({}, input))

controls.tap = 1;
enqueue(controls);
enqueue(controls);

controls.tap = 0;
enqueue(controls);
enqueue(controls);

controls.drainable = false;
controls.tap = 1;
enqueue(controls);
controls.tap = 0;
enqueue(controls);
controls.drainable = true;
enqueue(controls);

let i = 0;
setInterval(() => {
    sink.next(queue[i]);
    i++;
    if (i === queue.length) {
        sink.force('full');
        i=0;
    }
}, 900);

new Inspector(document.body, sink);

// interface Particle {
//     temp: number
// }

// const Water = new Mata.Schematic<Particle>({
//     solid: {
//         liquid: ({ temp }) => temp > 0,
//     },
//     liquid: {
//         solid: ({ temp }) => temp <= 0,
//         gas: ({ temp }) => temp >= 100,
//     },
//     gas: {
//         liquid: ({ temp }) => temp < 100,
//     }
// });

// const water = Water.createAutomaton(Water.states.liquid);

// const p = { temp: -100 };
// let delta = 1;
// setInterval(() => {
//     p.temp += delta;
//     if (p.temp > 200 || p.temp < -100) {
//         delta = -delta;
//     }
//     water.next(p);
// }, 16);

// new Inspector(document.body, water);


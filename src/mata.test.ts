import * as mata from './mata';
import { toMermaid, toDot } from './visualizers';

interface User {
    admin: boolean
    authed: boolean
}

const fsm = new mata.Machine<User>({
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
    config: {
        init: (states) => states.signIn
    }
}); 

console.log(toMermaid(fsm));
console.log(toDot(fsm));

describe("nav-machine", () => {
    it("Initialization", () => {
        interface SinkControls {
            tap: number
            waterVolume: number
            capacity: number
            drainable: boolean
        };
        
        const sink = new mata.Machine<SinkControls>({
            config: {
                init: (states) => states.empty
            },
            machine: {
                [mata.FromAnyState]: {
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
                    empty: mata.Continue
                },
            }
        });

        const controls: SinkControls = {
            tap: 0,
            waterVolume: 0,
            capacity: 0,
            drainable: true,
        };

        const states = sink.states;
        const state = () => sink.state;
        expect(state()).toBe(states.empty);

        controls.tap = 1;
        sink.next(controls);
        expect(state()).toBe(states.running);
        sink.next(controls);
        expect(state()).toBe(states.running);

        controls.tap = 0;
        sink.next(controls);
        expect(state()).toBe(states.draining);
        sink.next(controls);
        expect(state()).toBe(states.empty);

        controls.drainable = false;
        controls.tap = 1;
        sink.next(controls);
        controls.tap = 0;
        sink.next(controls);
        expect(state()).toBe(states.full);
        controls.drainable = true;
        sink.next(controls);
        expect(state()).toBe(states.draining);
        
        console.log(toMermaid(sink, { collapseWildcards: true }));
    })

    it("Transitions between states based on input (kitchen sink test)", () => {

        interface UserState {
            authed: boolean,
            gamesPlayed: number,
        }
    
        interface GameState {
            finished: boolean,
            dead: boolean,
        }
    
        interface State {
            user: UserState,
            game: GameState,
            forceTutorial: boolean,
            signOut: boolean
        };
    
        const state: State = {
            user: {
                authed: false,
                gamesPlayed: 0
            },
            game: {
                finished: false,
                dead: false,
            },
            forceTutorial: false,
            signOut: false
        };
    
        const nav = new mata.Machine<State>({
            config: {
                init: (states) => states.welcome
            },
            machine: {
                welcome: {
                    tutorial: (s) => s.user.gamesPlayed < 1,
                    game: (s) => s.user.gamesPlayed > 0,
                },
                tutorial: {
                    game: (s) => s.user.gamesPlayed > 0 && !s.forceTutorial,
                },
                game: {
                    stageOne: mata.Continue,
                },
                stageOne: {
                    stageTwo: mata.Continue,
                },
                stageTwo: {
                    stageThree: mata.Continue,
                },
                stageThree: {
                    view: (s) => s.game.finished,
                },
                view: {
                    game: (s) => !s.game.finished,
                },
                gameOver: {
                    game: (s) => !s.game.finished && !s.game.dead,
                },
                [mata.FromAnyState]: {
                    tutorial: (s) => s.forceTutorial,
                    signOut: (s) => s.signOut,
                    gameOver: (s) => s.game.dead,
                }
            }
        });
        
        expect(nav.state).toBe(nav.states.welcome);
        nav.next(state);
        expect(nav.state).toBe(nav.states.tutorial);
        state.user.gamesPlayed = 1;
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);
        nav.next(state);
        expect(nav.state).toBe(nav.states.stageOne);
        nav.next(state);
        expect(nav.state).toBe(nav.states.stageTwo);
        nav.next(state);
        expect(nav.state).toBe(nav.states.stageThree);
        state.game.finished = true;
        nav.next(state);
        expect(nav.state).toBe(nav.states.view);
        state.game.finished = false;
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);
        state.game.dead = true;
        nav.next(state);
        expect(nav.state).toBe(nav.states.gameOver);
        state.game.dead = false;
        
        nav.transition('welcome');
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);
        state.forceTutorial = true;
        nav.next(state);
        expect(nav.state).toBe(nav.states.tutorial);
        state.forceTutorial = false;
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);

        console.log(toDot(nav,  { collapseWildcards: true }));
        console.log(toMermaid(nav, { collapseWildcards: true }));
    });
})



import Nav from './nav-machine';
import { toMermaid, toDot } from './visualizers';

const Mech = Nav;

describe("nav-machine", () => {
    it("Initialization", () => {
        interface SinkControls {
            tap: number
            waterVolume: number
            capacity: number
            drainable: boolean
        };
        const sink = new Mech<SinkControls>({
            config: {
                init: (states) => states.empty
            },
            states: {
                [Mech.FromAnyState]: {
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
                    empty: Mech.Continue
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
    
        const nav = new Nav<State>({
            config: {
                init: (states) => states.welcome
            },
            states: {
                welcome: {
                    tutorial: (s) => s.user.gamesPlayed < 1,
                    game: (s) => s.user.gamesPlayed > 0,
                },
                tutorial: {
                    game: (s) => s.user.gamesPlayed > 0 && !s.forceTutorial,
                },
                game: {
                    stageOne: Nav.Continue,
                },
                stageOne: {
                    stageTwo: Nav.Continue,
                },
                stageTwo: {
                    stageThree: Nav.Continue,
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
                [Nav.FromAnyState]: {
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
        
        nav.to('welcome');
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);
        state.forceTutorial = true;
        nav.next(state);
        expect(nav.state).toBe(nav.states.tutorial);
        state.forceTutorial = false;
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);

        console.log(toDot(nav));
        console.log(toMermaid(nav, { collapseWildcards: true }));
    });
})



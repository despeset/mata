import * as Mata from './mata';

const { Route } = Mata;

describe("Verbose examples", () => {

    it("Automata to control a sink", () => {

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
        
    });

    it("Gamestate Automata with global Route", () => {

        interface Player {
            lives: number
            score: number
        };

        const GameState = new Mata.Schematic<Player>({
            start: {
                stageOne: Route.Continue,
                lost: Route.Never,
            },
            stageOne: {
                stageTwo: ({ score }) => score > 100
            },
            stageTwo: {
                won: ({ score }) => score > 200,
            },
            won: {
                start: Route.Continue,
                lost: Route.Never,
            },
            lost: {
                start: Route.Continue
            },
            [Route.FromAnyState]: {
                lost: ({ lives }) => lives === 0
            },
        });

        const S = GameState.states;
        const game = GameState.createAutomaton(S.start);

        expect(game.next({ lives: 10, score: 0 })).toBe(S.stageOne);
        expect(game.next({ lives: 0, score: 0 })).toBe(S.lost);
        
        game.force(S.start)
        expect(game.next({ lives: 0, score: 0 })).toBe(S.stageOne);

    });
        

    it("User flow navigation automata", () => {

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
    
        const Nav = new Mata.Schematic<State>({
            welcome: {
                tutorial: (s) => s.user.gamesPlayed < 1,
                game: (s) => s.user.gamesPlayed > 0,
            },
            tutorial: {
                game: (s) => s.user.gamesPlayed > 0 && !s.forceTutorial,
            },
            game: {
                stageOne: Route.Continue,
            },
            stageOne: {
                stageTwo: Route.Continue,
            },
            stageTwo: {
                stageThree: Route.Continue,
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
            [Route.FromAnyState]: {
                tutorial: (s) => s.forceTutorial,
                signOut: (s) => s.signOut,
                gameOver: (s) => s.game.dead,
            }
        });
        
        const nav = Nav.createAutomaton(Nav.states.welcome);

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
        
        nav.force('welcome');
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);
        state.forceTutorial = true;
        nav.next(state);
        expect(nav.state).toBe(nav.states.tutorial);
        state.forceTutorial = false;
        nav.next(state);
        expect(nav.state).toBe(nav.states.game);
    });

});

describe("Discrete behavior", () => {

    let ShouldNeverBeCalled = true;
    const MutliTerminal = new Mata.Schematic<any>({
        A: {
            B: Route.Continue,
            C: () => ShouldNeverBeCalled = false,
        },
        [Route.FromAnyState]: {
            D: Route.Never
        }
    });

    test('Supports terminal states which only appear at the second level', () => {
        expect(MutliTerminal.states.B).toBe('B');            
    })

    test('Supports terminal states which only appear as global routes', () => {
        expect(MutliTerminal.states.D).toBe('D');            
    })
        
    test('Transitions to the first matching state', () => {
        // Object property order is guarenteed for non-numeric keys in ES2015 (9.1.12.3)
        const fsm = MutliTerminal.createAutomaton(MutliTerminal.states.A);
        fsm.next(null)
        expect(fsm.state).toBe(MutliTerminal.states.B);        
        expect(ShouldNeverBeCalled).toBeTruthy();    
    });
})



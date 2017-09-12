import Nav from './nav-machine';

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

const nav = new Nav<State>('welcome', {
    welcome: {
        tutorial: (s) => s.user.gamesPlayed < 1,
        game: (s) => s.user.gamesPlayed > 0,
    },
    tutorial: {
        game: (s) => s.user.gamesPlayed > 0 && !s.forceTutorial,
    },
    game: {
        stageOne: Nav.continue,
    },
    stageOne: {
        stageTwo: Nav.continue,
    },
    stageTwo: {
        stageThree: Nav.continue,
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
    [Nav.any]: {
        tutorial: (s) => s.forceTutorial,
        signOut: (s) => s.signOut,
        gameOver: (s) => s.game.dead,
    }
});

describe("nav-machine", () => {
    it("Transitions between states based on input", () => {

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
    });
})



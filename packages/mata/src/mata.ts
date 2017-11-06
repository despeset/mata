export type State = string;
export type ValidStates = { [state: string]: State };
export type Condition<T> = (input: T) => boolean;
export type Ruleset<T> = { [from: string]: { [to: string]: Condition<T> }};

export type Listener<T> = (event: TransitionEvent<T>) => void;
export type Unsubscribe = () => void;

export interface TransitionEvent<T> {
    from: State
    to: State
    input?: T
}

export const Route = Object.freeze({
    FromAnyState: Symbol("Represents any valid state"),
    Continue: () => true,
    Never: () => false,
});

export class AutomatonException extends Error {
    state: State
    constructor(state: string, ...params: any[]) {
        super(...params);
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, AutomatonException);
        this.state = state;
    }
}

export class Automaton<T> {
    private _state: string;
    private subscribers: Listener<T>[] = [];
    private rules: Ruleset<T>;
    schematic: Schematic<T>;
    states: ValidStates;

    constructor(type: Schematic<T>, rules: Ruleset<T>, states: ValidStates, initialState: State) {
        this.schematic = type;
        this.rules = rules;
        this.states = states;
        this._state = 'UNINITIALIZED_STATE';
        this.transition(initialState);
    }

    get state(): State {
        return this._state;
    }

    private transition (state: string, input?: T): string {
        const from = this._state, to = state;
        if (!this.states[state]) {
            throw new AutomatonException(state, `Cannot transition to unknown state: "${state}" - valid states: [${Object.keys(this.states)}]`);            
        }
        this._state = state;
        this.subscribers.forEach(s => s({from, to, input}));      
        return state;
    }

    force (state: State): State {
        return this.transition(state);
    }

    next (input: T): string {
        const from = this._state.toString();
        for (let to in this.rules[Route.FromAnyState]) {
            if (this.rules[from][to]) {
                // defer to more specific condition
                continue;
            }
            if (this.rules[Route.FromAnyState][to](input)) {
                return this.transition(to, input);
            }
        }
        for (let to in this.rules[from]) {
            if (this.rules[from][to](input)) {
                return this.transition(to, input);
            }
        }
        return this._state;
    }

    subscribe (listener: Listener<T>): Unsubscribe {
        this.subscribers.push(listener);
        return () => {
            const subs = this.subscribers;
            const i = subs.indexOf(listener);
            this.subscribers = subs.slice(0, i).concat(subs.slice(i+1));
        }
    }
}

export class Schematic<T> {
    states: ValidStates;
    rules: Ruleset<T> = {};

    constructor (rules: Ruleset<T>) {
        this.rules = rules;
        this.states = Object.keys(this.rules)
            .reduce((lookup, state) => {
                lookup[state] = state;
                Object.keys(rules[state]).forEach(state => lookup[state] = state);
                return lookup;
            }, <ValidStates>{});
        this.states = Object.keys(this.rules[Route.FromAnyState])
            .reduce((lookup, state) => {
                lookup[state] = state;
                return lookup
            }, this.states);
        this.states = Object.freeze(this.states);
    }

    createAutomaton (state: State) {
        return new Automaton<T>(this, this.rules, this.states, state);        
    }

}
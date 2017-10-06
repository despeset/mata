export type State = string;
export type ValidStates = { [state: string]: State };
export type Condition<T> = (input: T) => boolean;
export type Ruleset<T> = { [from: string]: { [to: string]: Condition<T> }};

export type Listener<T> = (event: TransitionEvent<T>) => void;
export type Unsubscribe = () => void;

export interface TransitionEvent<T> {
    from: string
    to: string
    input?: T
}

export const FromAnyState = Symbol("Represents any valid state");
export const Config = Symbol("Stores configuration data");
export const Continue = () => true;
export const Never = () => false;

export class Automaton<T> {
    private _state: string;
    private subscribers: Listener<T>[] = [];
    private rules: Ruleset<T>;
    schematic: Schematic<T>;
    states: ValidStates;

    constructor(schematic: Schematic<T>, rules: Ruleset<T>, states: ValidStates, initialState: State) {
        this.schematic = schematic;
        this.rules = rules;
        this.states = states;
        this._state = initialState;
        if (!this.states[this._state]) {
            throw new Error(`Invalid initial state: "${this._state}" - known states: [${Object.keys(this.states)}]`);
        }
    }

    get state(): State {
        return this._state;
    }

    private transition (state: string, input?: T): string {
        const from = this._state, to = state;
        this._state = state;
        this.subscribers.forEach(s => s({from, to, input}));      
        return state;
    }

    getState (): State {
        return this._state;
    }

    force (state: State): State {
        return this.transition(state);
    }

    next (input: T): string {
        const from = this._state.toString();
        for (let to in this.rules[FromAnyState]) {
            if (this.rules[from][to]) {
                // defer to more specific condition
                continue;
            }
            if (this.rules[FromAnyState][to](input)) {
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
        this.states = Object.keys(this.rules).reduce((lookup, state) => {
            lookup[state] = state;
            return lookup;
        }, <ValidStates>{});
    }

    createAutomaton (state: State) {
        return new Automaton<T>(this, this.rules, this.states, state);        
    }

}
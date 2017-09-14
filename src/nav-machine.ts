type TransitionCondition<T> = (s: T) => boolean;
type NavigatorStates<T> = { [from: string]: { [to: string]: TransitionCondition<T> }};

type Listener<T> = (from?: string, to?: string, input?: T) => void;
type Unsubscribe = () => void;
type State = string;
type StateConstants = { [state: string]: State };

interface Configuration {
    init: (states: StateConstants) => State;
}

interface Initializer<T> {
    config: Configuration,
    states: NavigatorStates<T>
};

export default class Nav<T> {
    config: Configuration;
    state: string;
    states: StateConstants;
    machine: NavigatorStates<T> = {};
    private subscribers: Listener<T>[] = [];

    static FromAnyState = Symbol("Represents any valid state");
    static Config = Symbol("Stores configuration data");
    static Continue = () => true;

    constructor (initializer: Initializer<T>) {
        const states = initializer.states;
        this.config = initializer.config;
        this.machine = states;
        this.states = Object.keys(states).reduce((lookup, state) => {
            lookup[state] = state;
            return lookup;
        }, <StateConstants>{});
        this.state = this.config.init(this.states);
        if (!this.states[this.state]) {
            throw new Error(`Invalid initial state: "${this.state}" - known states: [${Object.keys(this.states)}]`);
        }
    }

    to (state: string, input?: T): string {
        const last = this.state;
        this.state = state;
        this.subscribers.forEach(s => s(last, state, input));        
        return state;
    }

    next (input: T): string {
        const from = this.state.toString();
        for (let to in this.machine[Nav.FromAnyState]) {
            if (this.machine[Nav.FromAnyState][to](input)) {
                return this.to(to, input);
            }
        }
        for (let to in this.machine[from]) {
            if (this.machine[from][to](input)) {
                return this.to(to, input);
            }
        }
        return this.state;
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
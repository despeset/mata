type TransitionCondition<T> = (s: T) => boolean;
type MachineSchema<T> = { [from: string]: { [to: string]: TransitionCondition<T> }};

type Listener<T> = (from?: string, to?: string, input?: T) => void;
type Unsubscribe = () => void;
type State = string;
type StateConstants = { [state: string]: State };

interface Configuration {
    init: (states: StateConstants) => State;
}

interface Initializer<T> {
    config: Configuration,
    machine: MachineSchema<T>
};

export default class Mech<T> {
    config: Configuration;
    state: string;
    states: StateConstants;
    machine: MachineSchema<T> = {};
    private subscribers: Listener<T>[] = [];

    static FromAnyState = Symbol("Represents any valid state");
    static Config = Symbol("Stores configuration data");
    static Continue = () => true;

    constructor (initializer: Initializer<T>) {
        this.config = initializer.config;
        this.machine = initializer.machine;
        this.states = Object.keys(initializer.machine).reduce((lookup, state) => {
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
        for (let to in this.machine[Mech.FromAnyState]) {
            if (this.machine[Mech.FromAnyState][to](input)) {
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
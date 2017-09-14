export type State = string;
export type ValidStates = { [state: string]: State };
export type Condition<T> = (input: T) => boolean;
export type MachineSchema<T> = { [from: string]: { [to: string]: Condition<T> }};

export type Listener<T> = (event: TransitionEvent<T>) => void;
export type Unsubscribe = () => void;

export interface Configuration {
    init: (states: ValidStates) => State;
}

export interface Initializer<T> {
    config: Configuration,
    machine: MachineSchema<T>
}

export interface TransitionEvent<T> {
    from: string
    to: string
    input?: T
}

export const FromAnyState = Symbol("Represents any valid state");
export const Config = Symbol("Stores configuration data");
export const Continue = () => true;

export class Machine<T> {
    config: Configuration;
    state: string;
    states: ValidStates;
    machine: MachineSchema<T> = {};
    private subscribers: Listener<T>[] = [];

    constructor (initializer: Initializer<T>) {
        this.config = initializer.config;
        this.machine = initializer.machine;
        this.states = Object.keys(initializer.machine).reduce((lookup, state) => {
            lookup[state] = state;
            return lookup;
        }, <ValidStates>{});
        this.state = this.config.init(this.states);
        if (!this.states[this.state]) {
            throw new Error(`Invalid initial state: "${this.state}" - known states: [${Object.keys(this.states)}]`);
        }
    }

    transition (state: string, input?: T): string {
        const from = this.state, to = state;
        this.state = state;
        this.subscribers.forEach(s => s({from, to, input}));      
        return state;
    }

    next (input: T): string {
        const from = this.state.toString();
        for (let to in this.machine[FromAnyState]) {
            if (this.machine[FromAnyState][to](input)) {
                return this.transition(to, input);
            }
        }
        for (let to in this.machine[from]) {
            if (this.machine[from][to](input)) {
                return this.transition(to, input);
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
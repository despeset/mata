export type State = string;
export type ValidStates = { [state: string]: State };
export type Condition<T> = (input: T) => boolean;
export type MachineSchema<T> = { [from: string]: { [to: string]: Condition<T> }};

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

export class Automata<T> {
    private _state: string;
    private subscribers: Listener<T>[] = [];
    private machine: MachineSchema<T>;
    type: Machine<T>;
    states: ValidStates;

    constructor(type: Machine<T>, schema: MachineSchema<T>, states: ValidStates, initialState: State) {
        this.type = type;
        this.machine = schema;
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

export class Machine<T> {
    states: ValidStates;
    machine: MachineSchema<T> = {};

    constructor (schema: MachineSchema<T>) {
        this.machine = schema;
        this.states = Object.keys(this.machine).reduce((lookup, state) => {
            lookup[state] = state;
            return lookup;
        }, <ValidStates>{});
    }

    init (state: State) {
        return new Automata<T>(this, this.machine, this.states, state);        
    }

}
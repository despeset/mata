type TransitionCondition<T> = (s: T) => boolean;
type NavigatorStates<T> = { [from: string]: { [to: string]: TransitionCondition<T> }};

export default class Nav<T> {
    state: string;
    states: { [key: string]: string };
    machine: NavigatorStates<T> = {};

    static any = Symbol("any valid state");
    static continue = () => true;

    constructor (initialState: string, states: NavigatorStates<T>) {
        this.state = initialState;
        this.machine = states;
        this.states = {};
        for (let state in states) {
            this.states[state] = state;
        }
    }

    to (state: string): string {
        console.log(`${this.state} --> ${state}`);
        this.state = state;
        return state;
    }

    next (data: T): string {
        const from = this.state.toString();
        for (let to in this.machine[Nav.any]) {
            if (this.machine[Nav.any][to](data)) {
                return this.to(to);
            }
        }
        for (let to in this.machine[from]) {
            if (this.machine[from][to](data)) {
                return this.to(to);
            }
        }
        return this.state;
    }

}
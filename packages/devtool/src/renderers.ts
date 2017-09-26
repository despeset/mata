import * as Mata from 'mata';
import { flatten } from './util';

export interface Config {
	collapseWildcards: boolean
};

const defaultConfig = {
	collapseWildcards: false,
}

export function toMermaid(nav: Mata.Automata<any>, options: Config = defaultConfig) {
	const config = Object.assign({}, defaultConfig, options);
	const machine = nav.type.machine;
	let edges = flatten<string>(Object.keys(machine).map(from => {
		return Object.keys(machine[from]).map(to => {
			const condition = machine[from][to];
			const f = nav.state === from ? 'active['+from+']' : from;
			const t = nav.state === to ? 'active['+to+']' : to;
			return `${f} --"${condition === Mata.Continue ? ' ' : condition.toString()}"--> ${t}`;
		});
	})).concat(flatten<string>(Object.keys(machine[Mata.FromAnyState] || {}).map(to => {
		if (config.collapseWildcards) {
			const t = nav.state === to ? 'active['+to+']' : to;			
			return [`=((*)) --"${machine[Mata.FromAnyState][to].toString()}"--> ${t}`];
		}
		return Object.keys(nav.states).map(from => {
			const f = nav.state === from ? 'active['+from+']' : from;
			const t = nav.state === to ? 'active['+to+']' : to;
			return from !== to ? `${f} -."${machine[Mata.FromAnyState][to].toString()}".-> ${t}` : '';
		});
	})));
	return `graph TD
	${edges.join('\n\t')}
	style active fill:#FFE46F
`;
}

export function toDot(nav: Mata.Automata<any>, options: Config = defaultConfig) {
	const config = Object.assign({}, defaultConfig, options);
	const machine = nav.type.machine;	
	let edges = flatten<string>(Object.keys(machine).map(from => {
		return Object.keys(machine[from]).map(to => {
			return `${from} -> ${to};`;
		});
	})).concat(flatten<string>(Object.keys(machine[Mata.FromAnyState] || {}).map(to => {
		if (config.collapseWildcards) {
			return [`"*" -> ${to}`];
		}
		return Object.keys(nav.states).map(from => {
			return from !== to ? `${from} -> ${to};` : '';
		});
	})));
	return `digraph workflow {
	${edges.join('\n\t')}
}`;
}
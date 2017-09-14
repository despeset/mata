import Mech from './mech';

function flatten<T>(arr: T[][]): T[] {
	return [].concat.apply([], arr);
}

interface Config {
	collapseWildcards: boolean
};

const defaultConfig = {
	collapseWildcards: false,
}

export function toMermaid(nav: Mech<any>, options: Config = defaultConfig) {
	const config = Object.assign({}, defaultConfig, options);
	let edges = flatten<string>(Object.keys(nav.machine).map(from => {
		return Object.keys(nav.machine[from]).map(to => {
			const condition = nav.machine[from][to];
			return `${from} --"${condition === Mech.Continue ? ' ' : condition.toString()}"--> ${to}`;
		});
	})).concat(flatten<string>(Object.keys(nav.machine[Mech.FromAnyState]).map(to => {
		if (config.collapseWildcards) {
			return [`=((*)) --"${nav.machine[Mech.FromAnyState][to].toString()}"--> ${to}`];
		}
		return Object.keys(nav.states).map(from => {
			return from !== to ? `${from} -."${nav.machine[Mech.FromAnyState][to].toString()}".-> ${to}` : '';
		});
	})));
	return `graph LR
	${edges.join('\n\t')}
`;
}

export function toDot(nav: Mech<any>, options: Config = defaultConfig) {
	const config = Object.assign({}, defaultConfig, options);
	let edges = flatten<string>(Object.keys(nav.machine).map(from => {
		return Object.keys(nav.machine[from]).map(to => {
			return `${from} -> ${to};`;
		});
	})).concat(flatten<string>(Object.keys(nav.machine[Mech.FromAnyState]).map(to => {
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
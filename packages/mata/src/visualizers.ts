import Nav from './nav-machine';

function flatten<T>(arr: T[][]): T[] {
	return [].concat.apply([], arr);
}

export function toMermaid(nav: Nav<any>) {
	let edges = flatten<string>(Object.keys(nav.machine).map(from => {
		return Object.keys(nav.machine[from]).map(to => {
			return `${from} --"${nav.machine[from][to].toString()}"--> ${to}`;
		});
	}));
	let anyedges = Object.keys(nav.machine[Nav.any]).map(to => {
		return `* --"${nav.machine[Nav.any][to].toString()}"--> ${to}`;
	});
	return `graph TD
	${edges.join('\n\t')}
	subgraph global
		${anyedges.join('\n\t\t')}
	end
`;
}

export function toDot(nav: Nav<any>) {
	let edges = flatten<string>(Object.keys(nav.machine).map(from => {
		return Object.keys(nav.machine[from]).map(to => {
			return `"${from}" -> "${to}";`; // [label="${nav.machine[from][to].toString()}"];`;
		});
	}));
	let anyedges = Object.keys(nav.machine[Nav.any]).map(to => {
		return `"*" -> "${to}";` // [label="${nav.machine[Nav.any][to].toString()}"];`;
	});
	return `digraph navflow {
	${anyedges.join('\n\t')}
	${edges.join('\n\t')}
}`;
}
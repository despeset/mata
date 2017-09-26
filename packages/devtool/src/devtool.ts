import * as Mata from 'mata';
import * as d3 from 'd3';
import { flatten } from './util';

interface Node {
	index: number
};

interface Link {
	source: number
	target: number
}

type Nodes = Node[];
type Links = Link[];

function initStaticForceLayout(svg: d3.Selection<SVGSVGElement, SVGSVGElement, null, undefined>, nodes: Nodes, links: Links, fsm: Mata.Automata<any>) {

	var width = +svg.attr("width"),
		height = +svg.attr("height"),
		g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

	var simulation = d3.forceSimulation(nodes)
		.force("charge", d3.forceManyBody().strength(-100))
		.force("link", d3.forceLink(links).distance(100).strength(1).iterations(10))
		.force("collide", d3.forceCollide().radius(50).strength(0.12))
		.force("x", d3.forceX())
		.force("y", d3.forceY(0).strength((n: any) => n.y < 0 ? 1 : 0 ))
		.stop();

	var loading = svg.append("text")
		.attr("dy", "0.35em")
		.attr("text-anchor", "middle")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10)
		.text("Simulating. One moment please…");

	// Use a timeout to allow the rest of the page to load first.
	d3.timeout(function() {
		loading.remove();
	
		// See https://github.com/d3/d3-force/blob/master/README.md#simulation_tick
		for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
			simulation.tick();
		}
	
		g.append("g")
			.attr("stroke", "#000")
			.attr("stroke-width", 1.5)
		.selectAll("line")
		.data(links)
		.enter().append("line")
			.attr("x1", function(d: any) { return d.source.x; })
			.attr("y1", function(d: any) { return d.source.y; })
			.attr("x2", function(d: any) { return d.target.x; })
			.attr("y2", function(d: any) { return d.target.y; });
	
		const rectContainer = g.append("g")
		.selectAll("rect")
		.data(nodes);

		const rects = rectContainer.enter().append("rect")
			.attr("width", 60)
			.attr("height", 40)
			.attr("x", (node: any) => node.x-30)
			.attr("y", (node: any) => node.y-20)
			.attr("rx", 5)
			.attr("ry", 5)
			.attr("stroke", "#fff")
			.attr("stroke-width", 1.5)
			.attr("fill", (node: any) => node.label === fsm.state ? '#FFE46F' : '#C7FFEA' )

		rectContainer.enter()
			.append("text")
			.attr("x", (node: any) => node.x-25)
			.attr("y", (node: any) => node.y-5)
			.attr("font-family", 'sans-serif')
			.attr('fill', '#777')
			.attr('font-size', '0.6em')
			.attr('font-weight', 'bold')
			.text((node: any) => node.label);

		fsm.subscribe(({ to }) => {
			rects
				.attr("fill", (node: any) => node.label === to ? '#FFE46F' : '#C7FFEA' )
				.attr("stroke", (node: any) => node.label === to ? '#F00' : '#FFF')
		})

	});
}

export class Inspector {
	fsm: Mata.Automata<any>;
	svg: string;
	$el: HTMLElement;
	private nodes: Nodes;
	private links: Links;

	constructor(parent: HTMLElement, fsm: Mata.Automata<any>) {
		this.fsm = fsm;
		fsm.subscribe(this.update);
		this.$el = document.createElement('div');
		parent.appendChild(this.$el);
		const machine = fsm.type.machine;
		const levelA = Object.keys(fsm.type.machine);
		
		const states = levelA.concat(flatten(levelA.map(k => Object.keys(machine[k]))))
			.reduce((p, c) => { 
				if (p.indexOf(c) === -1) {
					p.push(c);
				}
				return p;
			}, <string[]>[]);

		this.nodes = states.map((label, index) => 
			({ label, index }));

		this.links = flatten(levelA.map(state => {
			return Object.keys(machine[state]).map(to => {
				return {
					source: states.indexOf(state),
					target: states.indexOf(to)
				};
			});
		}));

		console.log(this.nodes);
		console.log(this.links);
		
		// const $svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
		// $svg.setAttribute('width', document.innerWidth);
		// $svg.setAttribute('height', '300');
		// this.$el.appendChild($svg);
		const svg =   d3.select(this.$el)
		.classed("svg-container", true) //container class to make it responsive
		.append("svg")
		//responsive SVG needs these 2 attributes and no width and height attr
		// .attr("preserveAspectRatio", "xMinYMin meet")
		// .attr("viewBox", "0 0 600 400")
		.attr("width", window.innerWidth)
		.attr("height", window.innerHeight)
		//class to make it responsive
		.classed("svg-content-responsive", true); 
		
		initStaticForceLayout(<d3.Selection<SVGSVGElement, SVGSVGElement, null, undefined>>svg, this.nodes, this.links, this.fsm);
	}

	private update(event: Mata.TransitionEvent<any>) {
		const { from, to, input } = event;
		console.log(from, to, input);
	}

}

export { toMermaid, toDot } from './renderers';
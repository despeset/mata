import * as Mata from 'mata';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import { flatten } from './util';

const { Route } = Mata;

export class Inspector {
	fsm: Mata.Automaton<any>;
	svg: d3.Selection<SVGSVGElement>;
	$el: HTMLElement;
	g: dagreD3.graphlib.Graph;
	render: dagreD3.Render;
	styles: { [k:string]: { [k:string]: string }};

	constructor(parent: HTMLElement, fsm: Mata.Automaton<any>) {
		this.fsm = fsm;
		fsm.subscribe(this.update.bind(this));
		this.$el = document.createElement('div');
		parent.appendChild(this.$el);
		const machine = fsm.schematic.rules;
		const levelA = Object.keys(fsm.schematic.rules);
		const g = this.g = new dagreD3.graphlib.Graph();
		const render = this.render = new dagreD3.render();
		
		const styles = this.styles = Object.freeze({
			activeEdge: { 
				arrowheadStyle: 'stroke: #000; fill: #000;',
				style: 'stroke: #000; fill: none; stroke-width: 1.5;',
			},
			strongEdge: {
				arrowheadStyle: 'stroke: #666; fill: #666;',
				style: 'stroke: #666; fill: none;',
			},
			weakEdge: {
				arrowheadStyle: 'stroke: #ccc; fill: #ccc;',
				style: 'stroke: #ccc; fill: none; stroke-dasharray: 5, 5;',
			}
		});

		g.setGraph({
			nodesep: 70,
			ranksep: 50,
			rankdir: "TD",
			marginx: 20,
			marginy: 20,
		});
		
		const states = levelA.concat(flatten(levelA.map(k => Object.keys(machine[k]))), Object.keys(machine[Route.FromAnyState] || {}))
			.reduce((p, c) => { 
				if (p.indexOf(c) === -1) {
					p.push(c);
				}
				return p;
			}, <string[]>[]);

		states.forEach(id => {
			g.setNode(id, {
				padding: 10,
				labelStyle: "font-family:sans-serif;"
			});
		});

		// if (machine[Route.FromAnyState]) {
		// 	g.setNode('*', {

		// 	})
		// }

		levelA.forEach(from => {
			Object.keys(machine[from]).forEach(to => {
				g.setEdge(from, to, {
					label: "", // machine[from][to].toString(),
					...styles.strongEdge
				});
				if (machine[Route.FromAnyState]) {
					for (let t in machine[Route.FromAnyState]) {
						if (from === t) continue;
						g.setEdge(from, t, {
							label: "", // machine[from][to].toString(),
							...styles.weakEdge
						})
					}
				}
			});
		});

		// const $svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
		// $svg.setAttribute('width', document.innerWidth);
		// $svg.setAttribute('height', '300');
		// this.$el.appendChild($svg);
		const draggable = d3.select(this.$el)
			.append("div")
			.classed("devtool-debugger-pane", true)
			.attr("draggable", true);
		draggable.append("div")
			.classed("devtool-draggable-toolbar", true);
		const svg = this.svg = draggable
		.append("div")
		.classed("svg-container", true) //container class to make it responsive
		.append("svg")
		//responsive SVG needs these 2 attributes and no width and height attr
		// .attr("preserveAspectRatio", "xMinYMin meet")
		// .attr("viewBox", "0 0 1200 800")
		.attr("width", 500)
		.attr("height", 480)
		//class to make it responsive
		.classed("svg-content-responsive", true); 

		// Set some general styles
		g.nodes().forEach(function(v) {
			var node = g.node(v);
			node.rx = node.ry = 5;
			node.style = "fill: #C7FFEA";
		});
		var zoom = d3.behavior.zoom().on("zoom", function() {
			svg.select("g")
			.attr(
				"transform", 
				"translate(" + (<any>d3.event).translate + ")" +
				"scale(" + (<any>d3.event).scale+ ")"
			);
		});
		svg.call(zoom);

		svg.call(render, g);
		
		// Center the dag
		var zoomScale = 1;
		// Get Dagre Graph dimensions
		var graphWidth = g.graph().width;
		var graphHeight = g.graph().height + 0;
		// Get SVG dimensions
		var width = parseInt(svg.style("width").replace(/px/, ""));
		var height = parseInt(svg.style("height").replace(/px/, ""));

		// Calculate applicable scale for zoom
		zoomScale = Math.max( Math.min(width / graphWidth, height / graphHeight), 0.5);

		var translate: [number, number] = [(width/2) - ((graphWidth*zoomScale)/2), 0];
		zoom.translate(translate);
		zoom.scale(zoomScale);
		zoom.event(svg.select('g'));

		// initStaticForceLayout(<d3.Selection<SVGSVGElement, SVGSVGElement, null, undefined>>svg, this.nodes, this.links, this.fsm);
	}

	private update(event: Mata.TransitionEvent<any>) {
		const { from, to, input } = event;
		const { styles, g } = this;
		g.node(from).style =  "fill: #C7FFEA";
		g.node(to).style = "fill: #FFE46F";
		g.edges().forEach((id) => {
			let e = g.edge(id);
			console.log(e);
			if (id.v === to) {
				g.setEdge(id.v, id.w, {
					label: e.label,
					...styles.activeEdge,
				});
			} else {
				g.setEdge(id.v, id.w, {
					label: e.label,					
					arrowheadStyle: e.arrowheadStyle === styles.weakEdge.arrowheadStyle ? styles.weakEdge.arrowheadStyle : styles.strongEdge.arrowheadStyle,
					style: e.style === styles.weakEdge.style ? styles.weakEdge.style : styles.strongEdge.style,
				});
			}
		})
		this.svg.call(this.render, g);
		console.log(from, to, input);
	}

}

export { toMermaid, toDot } from './renderers';
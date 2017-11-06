import * as Mata from 'mata';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import { flatten } from './util';

const { Route } = Mata;

export type StyleDeclaration = { [key: string]: string };
export type StyleLookup = { [key: string]: StyleDeclaration | StyleLookup };

// Returns an attrTween for translating along the specified path element.
function translateAlong(path: SVGPathElement) {
	var l = path.getTotalLength();
	return function() {
		return function(t: number): d3.Primitive {
		var p = path.getPointAtLength(t * l);
		return "translate(" + p.x + "," + p.y + ")";
		};
	};
}

const styles: StyleLookup = Object.freeze({
	edges: {
		Strong: {
			traversed: {
				arrowheadStyle: 'stroke: ; fill: #99ff94;',
				style: 'stroke: #99ff94; fill: none;',
			},
			active: { 
				arrowheadStyle: 'stroke: #090; fill: #090;',
				style: 'stroke: #090; fill: none; stroke-width: 1.3;',
			},
			idle: {
				arrowheadStyle: 'stroke: #666; fill: #666;',
				style: 'stroke: #666; fill: none;',
				// lineInterpolate: "basis",						
			},
		},
		Weak: {
			traversed: {
				arrowhead: 'vee',
				arrowheadStyle: 'stroke: #99ff94; fill: #99ff94;',
				style: 'stroke: #99ff94; fill: none; stroke-dasharray: 2, 5;',
			},
			active: { 
				arrowhead: 'vee',
				arrowheadStyle: 'stroke: #000; fill: #000;',
				style: 'stroke: #000; fill: none; stroke-width: 1.3; stroke-dasharray: 2, 5;',
			},
			idle: {
				arrowhead: 'vee',
				arrowheadStyle: 'stroke: #666; fill: #666;',
				style: 'stroke: #666; fill: none; stroke-dasharray: 2, 5;',
				// lineInterpolate: "basis",						
			}		
		}
	}
});

export interface Size { width: number, height: number };
export enum EdgeTypes { Strong, Weak };
export interface Edge { from: string, to: string, type: EdgeTypes };

export class Visualizer {
	fsm: Mata.Automaton<any>;
	svg: d3.Selection<SVGSVGElement>;
	$el: HTMLElement;
	$parent: HTMLElement;
	g: dagreD3.graphlib.Graph;
	render: dagreD3.Render;
	zoom: d3.behavior.Zoom<{}>;
	styles: StyleLookup;
	data: {
		nodes: string[],
		edges: Edge[],
	}
	activeColor: string;

	constructor($parent: HTMLElement, fsm: Mata.Automaton<any>) {
		this.fsm = fsm;
		this.$el = document.createElement('div');
		this.$parent = $parent;
		this.activeColor = '#99ff94';
		const g = this.initializeDagreGraph();
		const render = this.render = new dagreD3.render();
		const svg = this.svg = d3.select(this.$el)
			.append("svg")
			.attr("width", $parent.getBoundingClientRect().width)
			.attr("height", $parent.getBoundingClientRect().height)

		$parent.appendChild(this.$el);
		
		// initial positioning
		g.nodes().forEach(function(v) {
			var node = g.node(v);
			node.rx = node.ry = 5;
		});

		fsm.subscribe(this.update.bind(this));

		this.initZoom();
		svg.call(render, g);
		this.fixArrows();
		this.sizeSVG();
		this.zoomToFit();				
	}

	private initZoom() {
		const { svg } = this;
		var zoom = this.zoom = d3.behavior.zoom().on("zoom", () => {
			svg.select("g")
			.attr(
				"transform", 
				"translate(" + (<any>d3.event).translate + ")" +
				"scale(" + (<any>d3.event).scale+ ")"
			);
		});
		svg.call(zoom);
	}

	private initializeDagreGraph() {
		const { fsm } = this;
		const machine = fsm.schematic.rules;
		const rootStates = Object.keys(fsm.schematic.rules);

		const g = this.g = new dagreD3.graphlib.Graph();
		
		g.setGraph({
			nodesep: 70,
			ranksep: 50,
			rankdir: "TD",
			marginx: 20,
			marginy: 20,
		});
		
		const states = Object.keys(fsm.states);

		states.forEach(id => {
			g.setNode(id, {
				padding: 10,
				labelStyle: "font-family:sans-serif;",
				style: "fill: #C7FFEA",
			});
		});

		const strongEdges: Edge[] = flatten<Edge>(rootStates.map(from => {
			return Object.keys(machine[from]).reduce((e, to) => {
				if (machine[from][to] === Route.Never) {
					return e;
				}
				e.push({ 
					from,
					to,
					type: EdgeTypes.Strong
				});
				return e;
			}, <Edge[]>[]);
		}));

		const weakEdges: Edge[] = flatten<Edge>(rootStates.map(from => {
			return Object.keys(machine[Route.FromAnyState] || {}).reduce((e, to) => {
				if (machine[from][to] || from === to) {
					// nodes are only connected weakly
					// if a strong edge doesn't already exist.
					return e;
				}
				e.push({ 
					from,
					to,
					type: EdgeTypes.Weak
				});
				return e;
			}, <Edge[]>[]);
		}));

		this.data = {
			nodes: states,
			edges: strongEdges.concat(weakEdges),
		};

		strongEdges.forEach(({from, to}) => {
			g.setEdge(from, to, {
				label: "", // machine[from][to].toString(),
				...(<StyleLookup>styles.edges.Strong).idle
			});
		});

		weakEdges.forEach(({ from, to }) => {
			g.setEdge(from, to, {
				label: "", // machine[from][to].toString(),
				...(<StyleLookup>styles.edges.Weak).idle
			});
		});

		return g;
	}

	private fixArrows() {
		// This is a hack to fix the marker URL reference pathing
		// so that it works inside an iframe.
		this.g.edges().forEach((v) => {
			const edge = this.g.edge(v);
			this.svg.selectAll('.edgePath')
				.filter(d => d === v)
				.select('path')
				.attr('marker-end', 'url(#' + edge.arrowheadId + ')');
		});
	}

	findEdgeData(from: string, to: string) {
		return this.data.edges.filter(e => e.from === from && e.to === to)[0];
	}

	sizeSVG() {
		const { svg } = this;
		const { width, height } = this.$parent.getBoundingClientRect();
		svg.attr('width', width);
		svg.attr('height', height - 20);
	}

	center() {
		const { g, svg, zoom } = this;
		// Get Dagre Graph dimensions
		let graphWidth = g.graph().width;
		let graphHeight = g.graph().height + 0;

		// Get SVG dimensions
		const width = parseInt(svg.style("width").replace(/px/, ""));
		const height = parseInt(svg.style("height").replace(/px/, ""));

		let translate: [number, number] = [(width/2) - ((graphWidth*zoom.scale())/2),
										   (height/2) - ((graphHeight*zoom.scale())/2)];
		zoom.translate(translate);
		zoom.event(svg.select('g'));		
	}

	zoomToFit() {
		const { g, svg, zoom } = this;

		// Center the dag
		let zoomScale = 1;
		// Get Dagre Graph dimensions
		let graphWidth = g.graph().width;
		let graphHeight = g.graph().height + 0;

		let { width, height } = this.$parent.getBoundingClientRect();		
		// Get SVG dimensions
		width = parseInt(svg.style("width").replace(/px/, ""));
		height = parseInt(svg.style("height").replace(/px/, ""));

		// Calculate applicable scale for zoom
		zoomScale = Math.max( Math.min(width / graphWidth, height / graphHeight), 0.5);
		this.center();
		zoom.scale(zoomScale);
		zoom.event(svg.select('g'));
	}

	private update(event: Mata.TransitionEvent<any>) {
		const { from, to } = event;
		const { g } = this;
		if (from === to) {
			return;
		}
		d3.select(g.node(from).elem)
			.select("rect")
			.style("stroke", "none");		
		
		const edge = g.edge({ v: from, w: to });
		if (!!edge) {
			this.animateEdgeTransition(edge);
		}
		this.animateNodeTransition(event, edge);

	}

	private animateEdgeTransition(graphEdge: any) {
		const { svg } = this;
		const dot = svg.select('g').append("circle");
		const edge = d3.select(graphEdge.elem);
		const translator = translateAlong(<SVGPathElement>edge.select('path').node());

		edge.selectAll('path').style('stroke', this.activeColor)
			.transition()
			.delay(100)
			.duration(500)
			.style('stroke', '#99ff94');

		const arrow = svg.select('#' + edge.select('marker').attr('id'))
			.select('path');

		arrow.style('stroke', this.activeColor)
			.style('fill', this.activeColor)
			.transition()
			.delay(100)
			.duration(500)
			.style('stroke', '#99ff94')
			.style('fill', '#99ff94');

		dot.attr('r', 2)
			.attr('fill', this.activeColor)
			.attr('transform', translator()(0))
			.transition()
			.delay(100)
			.duration(500)		
			.attrTween('transform', translator)
			.attrTween('r', () => (t: number) => 2 + (10 * (t > 0.5 ? 0.5-(t-0.5) : t)))
			.attr('fill', '#99ff94')				
			.each("end", () => {
				dot.remove();
				edge.selectAll('path').style('stroke', '#666');
				arrow.style('opacity', 1);
			});
	}

	animateNodeTransition(event: Mata.TransitionEvent<any>, edge: any) {
		const { g } = this;
		const { from, to } = event;
		this.activeColor = !!edge ? '#99ff94' : '#f00';			

		d3.select(g.node(from).elem)
			.select('rect')
			.transition()
			.duration(300)
			.style( "fill", "#C7FFEA")

		const rect = d3.select(g.node(to).elem)
		  .select('rect');

		rect.style("stroke", this.activeColor)		
			.style("stroke-width", 0)
			.transition()
			.delay(450)
			.duration(32)
			.style( "fill", this.activeColor)			
			.style("stroke-width", 5)
		
		rect.transition()
		  .delay(700)		  
		  .duration(200)
		  .style("stroke-width", 0)		  
		  .each("end", () => {
			d3.select(g.node(to).elem)
				.select('rect')
  				.style("stroke-width", 0);			
		  });
	}
}

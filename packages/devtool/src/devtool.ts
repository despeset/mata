import * as Mata from 'mata';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import { flatten } from './util';

const { Route } = Mata;

function style(target: HTMLElement, styles: { [prop: string]: number | string }) {
	Object.keys(styles).forEach(prop => target.style[<any>prop] = <any>styles[prop]);
}

export class Panel {
	frame: HTMLIFrameElement;
	window: Window;
	container: HTMLDivElement;
	toolbar: HTMLDivElement;
	body: HTMLBodyElement;
	x: number;
	y: number;
	lastClientX: number | null;
	lastClientY: number | null;

	static styles = {
		body: {
			margin: 0
		},
		toolbar: {
			width: '100em',
			height: '20px',
			background: 'pink',
		},
		frame: {
			border: '1px solid pink',
			position: 'absolute',
			boxShadow: '1px 1px 2px pink',			
		}
	}

	constructor(parent: HTMLElement, size: Size) {
		this.frame = document.createElement('iframe');
		parent.appendChild(this.frame);
		this.window = this.frame.contentWindow;
		this.container = this.window.document.createElement('div');
		this.toolbar = this.renderToolbar();
		this.body = <HTMLBodyElement>this.window.document.body;
		this.body.appendChild(this.toolbar);
		this.body.appendChild(this.container);
		this.frame.width  = size.width + 'px';
		this.frame.height = size.height + 'px';
		style(this.body, Panel.styles.body);
		style(this.frame, Panel.styles.frame);
		this.x = 0;
		this.y = 0;

		this.drag = this.drag.bind(this);
		
		this.toolbar.addEventListener('mousedown', _ => {
			console.log("DOWN");
			style(this.frame, {
				pointerEvents: 'none',
				boxShadow: '3px 3px 10px pink',
			});
			// this.body.addEventListener('mousemove', this.drag);
			setTimeout(() => {
				window.document.addEventListener('mousemove', this.drag);
			}, 0);
		});
		window.document.addEventListener('mouseup', _ => {
			console.log("UP");
			// this.body.removeEventListener('mousemove', this.drag);
			style(this.frame, {
				pointerEvents: 'auto',
				boxShadow: '1px 1px 2px pink',				
			});
			this.lastClientX = null;
			this.lastClientY = null;
			window.document.removeEventListener('mousemove', this.drag);
		});
	}

	renderToolbar() {
		const { container, window } = this;
		const div = window.document.createElement('div');
		container.appendChild(div);
		style(div, Panel.styles.toolbar);
		return div;
	}

	drag(e: MouseEvent) {
		this.lastClientX = this.lastClientX || e.clientX;
		this.lastClientY = this.lastClientY || e.clientY;
		this.x += (e.clientX - this.lastClientX);
		this.y += (e.clientY - this.lastClientY);
		this.lastClientX = e.clientX;
		this.lastClientY = e.clientY;
		this.x = this.x < 0 ? 0 : this.x;
		this.y = this.y < 0 ? 0 : this.y;
		console.log([this.x, this.y]);
		style(this.frame, {
			left: this.x + 'px',
			top: this.y + 'px'
		});
	}
	
}

export interface Size { width: number, height: number };

export class Inspector {
	fsm: Mata.Automaton<any>;
	svg: d3.Selection<SVGSVGElement>;
	$el: HTMLElement;
	g: dagreD3.graphlib.Graph;
	render: dagreD3.Render;
	panel: Panel;
	styles: { [k:string]: { [k:string]: string }};

	constructor(parent: HTMLElement, fsm: Mata.Automaton<any>, size: Size = { width: 200, height: 200 }) {
		this.fsm = fsm;
		this.panel = new Panel(parent, { 
			width: size.width, 
			height: size.height + 20 
		});
		fsm.subscribe(this.update.bind(this));
		this.$el = document.createElement('div');
		this.panel.container.appendChild(this.$el);
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
		.attr("width", size.width)
		.attr("height", size.height)
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
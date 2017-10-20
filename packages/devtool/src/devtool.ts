import * as Mata from 'mata';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import { flatten } from './util';

const { Route } = Mata;

function style(target: HTMLElement, styles: { [prop: string]: number | string }) {
	Object.keys(styles).forEach(prop => target.style[<any>prop] = <any>styles[prop]);
}

export type Inner<T> = T

export class Panel {
	frame: HTMLIFrameElement;
	mask: HTMLDivElement;
	resizer: HTMLDivElement;
	onResize: (() => void) | null;
	innerWindow: Inner<Window>;
	container: Inner<HTMLDivElement>;
	toolbar: Inner<HTMLDivElement>;
	body: Inner<HTMLBodyElement>;
	x: number;
	y: number;
	prevTarget: { x: number, y: number } | null;

	static styles = {
		body: {
			margin: 0,
			width: '100%',
			height: '100%',
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
		},
		mask: {
			zIndex: 99,
			position: 'absolute',
		},
		resizer: {
			height: '20px',
			width: '20px',
			position: 'absolute',
			right: 0,
			bottom: 0,
			background: 'blue',
		}
	}

	constructor(parent: HTMLElement, size: Size) {
		this.frame = document.createElement('iframe');
		this.mask = document.createElement('div');
		parent.appendChild(this.frame);
		parent.appendChild(this.mask);
		this.innerWindow = this.frame.contentWindow;
		this.container = this.innerWindow.document.createElement('div');
		this.body = <Inner<HTMLBodyElement>>this.innerWindow.document.body;
		this.body.appendChild(this.renderToolbar(this.innerWindow));
		this.body.appendChild(this.container);

		this.toolbar = this.renderToolbar(window);
		style(this.toolbar, {
			opacity: '0'
		});
		this.mask.appendChild(this.toolbar);

		this.resizer = window.document.createElement('div');
		style(this.resizer, Panel.styles.resizer);
		this.mask.appendChild(this.resizer);
		
		this.frame.width  = size.width + 'px';
		this.frame.height = size.height + 'px';
		this.mask.style.width = size.width + 'px';
		this.mask.style.height = size.height + 'px';

		style(window.document.body, Panel.styles.body);
		style(this.body, Panel.styles.body);
		style(this.frame, Panel.styles.frame);
		style(this.mask, Panel.styles.mask);
		
		this.x = 0;
		this.y = 0;

		this.dragMove = this.dragMove.bind(this);
		this.dragResize = this.dragResize.bind(this);
		this.startDragging = this.startDragging.bind(this);
		this.stopDragging = this.stopDragging.bind(this);
		this.onResize = null;
		
		this.toolbar.addEventListener('mousedown', this.startDragging(this.dragMove).bind(this));

		this.resizer.addEventListener('mousedown', this.startDragging(this.dragResize).bind(this));

	}

	renderToolbar(context: Window | Inner<Window>) {
		const div = context.document.createElement('div');
		style(div, Panel.styles.toolbar);
		return div;
	}

	startDragging(dragHandler: (e: MouseEvent) => void):  () => void {
		return () => {
			style(this.frame, {
				boxShadow: '0px 20px 50px lightpink',				
				userSelect: 'none',
			});
			window.document.body.addEventListener('mouseup', this.stopDragging(dragHandler).bind(this));
			window.document.body.addEventListener('mousemove', dragHandler);
		}
	}

	stopDragging(dragHandler: (e: MouseEvent) => void): () => void {
		const handler = () => {			
			style(this.frame, {
				boxShadow: '1px 1px 2px pink',			
			});
			this.prevTarget = null;		
			window.document.body.removeEventListener('mouseup', handler);
			window.document.body.removeEventListener('mousemove', dragHandler);
		}
		return handler;
	}

	dragResize(e: MouseEvent) {
		const target = { x: e.clientX, y: e.clientY };
		const width = (target.x - this.frame.offsetLeft) + 10 + 'px';
		const height = (target.y - this.frame.offsetTop) + 10 + 'px';
		this.frame.width = width;
		this.frame.height = height;
		style(this.mask, { width, height });
		if (this.onResize) {
			this.onResize();
		}
	}
	
	dragMove(e: MouseEvent) {
		const target = { x: e.clientX, y: e.clientY };
		this.prevTarget = this.prevTarget || target;
		this.x += (target.x - this.prevTarget.x);
		this.y += (target.y - this.prevTarget.y);
		this.prevTarget = target;
		this.x = this.x < 0 ? 0 : this.x;
		this.y = this.y < 0 ? 0 : this.y;
		if (this.x < 10 || this.y < 10) {
			setTimeout(() => {
				this.stopDragging(this.dragMove);
			})
		}
		// hmm: setTimeout(() => {
			style(this.frame, {
				left: this.x + 'px',
				top: this.y + 'px',
			});
			style(this.mask, {
				left: this.x + 'px',
				top: this.y + 'px',
			})	
		// }, 0)
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
	zoom: d3.behavior.Zoom<{}>;
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
		this.panel.onResize = this.zoomToFit.bind(this);
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
		var zoom = this.zoom = d3.behavior.zoom().on("zoom", function() {
			svg.select("g")
			.attr(
				"transform", 
				"translate(" + (<any>d3.event).translate + ")" +
				"scale(" + (<any>d3.event).scale+ ")"
			);
		});
		svg.call(zoom);

		svg.call(render, g);
		
		this.zoomToFit();

		// initStaticForceLayout(<d3.Selection<SVGSVGElement, SVGSVGElement, null, undefined>>svg, this.nodes, this.links, this.fsm);
	}

	zoomToFit() {
		const { g, svg, zoom } = this;
		svg.attr('width', this.panel.frame.width);
		svg.attr('height', parseInt(this.panel.frame.height) - 20 + 'px');
		// Center the dag
		let zoomScale = 1;
		// Get Dagre Graph dimensions
		let graphWidth = g.graph().width;
		let graphHeight = g.graph().height + 0;
		// Get SVG dimensions
		let width = parseInt(svg.style("width").replace(/px/, ""));
		let height = parseInt(svg.style("height").replace(/px/, ""));

		// Calculate applicable scale for zoom
		zoomScale = Math.max( Math.min(width / graphWidth, height / graphHeight), 0.5);

		let translate: [number, number] = [(width/2) - ((graphWidth*zoomScale)/2), 0];
		zoom.translate(translate);
		zoom.scale(zoomScale);
		zoom.event(svg.select('g'));
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
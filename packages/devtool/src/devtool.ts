import * as Mata from 'mata';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import { flatten } from './util';

const { Route } = Mata;

function style(target: HTMLElement, styles: { [prop: string]: number | string }) {
	Object.keys(styles).forEach(prop => target.style[<any>prop] = <any>styles[prop]);
}

export type Inner<T> = T

const resizeIcon = `
<svg width='20' 
	 height='20' 
	 fill="#caa" 
	 xmlns="http://www.w3.org/2000/svg"
	 xmlns:xlink="http://www.w3.org/1999/xlink"
	 version="1.1" 
	 x="0px" 
	 y="0px" 
	 viewBox="0 0 24 24" 
	 style="enable-background:new 0 0 20 20;" 
	 xml:space="preserve">
		 <path d="M22,22h-2v-2h2V22z 
				  M22,18h-2v-2h2V18z 
				  M18,22h-2v-2h2V22z 
				  M18,18h-2v-2h2V18z 
				  M14,22h-2v-2h2V22z 
				  M22,14h-2v-2h2V14z"/>
	</svg>
`;

const panels: Panel[] = [];

export class Panel {
	frame: HTMLIFrameElement;
	mask: HTMLDivElement;
	resizer: HTMLDivElement;
	onResize: (() => void) | null;
	innerWindow: Inner<Window>;
	container: Inner<HTMLDivElement>;
	toolbar: Inner<HTMLDivElement>;
	body: Inner<HTMLBodyElement>;
	private x: number;
	private y: number;
	private zIndex: number;
	private size: { width: number, height: number };
	private prevTarget: { x: number, y: number } | null;

	static styles = {
		body: {
			margin: 0,
			width: '100%',
			height: '100%',
		},
		BG: {
			background: '#fffdfd',			
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
			zIndex: 98,	
		},
		mask: {
			position: 'absolute',
			overflow: 'hidden',
			zIndex: 99,
		},
		resizer: {
			height: '22px',
			width: '20px',
			position: 'absolute',
			right: 0,
			bottom: 0,
			cursor: 'nwse-resize',
		}
	}

	constructor(parent: HTMLElement, size: Size) {
		this.size = {...size};
		this.frame = document.createElement('iframe');
		this.mask = document.createElement('div');
		parent.appendChild(this.frame);
		parent.appendChild(this.mask);
		this.innerWindow = this.frame.contentWindow;
		this.container = this.innerWindow.document.createElement('div');
		this.body = <Inner<HTMLBodyElement>>this.innerWindow.document.body;
		this.body.appendChild(this.createToolbar(this.innerWindow));
		this.body.appendChild(this.container);

		const styleBlockPollution = document.createElement('div');
		styleBlockPollution.innerHTML = `
			<style>
				.____MATA____grab {
					cursor: -webkit-grab;
					cursor: -moz-grab;
					cursor: grab;
				}
				.____MATA____grabbing {
					cursor: -webkit-grabbing;
					cursor: -moz-grabbing;
					cursor: grabbing;
				}
			</style>
		`;
		parent.appendChild(styleBlockPollution);

		this.toolbar = this.createToolbar(window);
		style(this.toolbar, {
			opacity: '0',
		});
		this.mask.appendChild(this.toolbar);

		this.resizer = window.document.createElement('div');
		style(this.resizer, Panel.styles.resizer);
		this.resizer.innerHTML = resizeIcon;
		this.mask.appendChild(this.resizer);
		
		this.zIndex = 99 + panels.length;

		style(window.document.body, Panel.styles.body);
		style(this.body, { ...Panel.styles.body, ...Panel.styles.BG });
		style(this.frame, {
			...Panel.styles.frame,
			zIndex: this.zIndex,
		});
		style(this.mask, {
			...Panel.styles.mask,
			zIndex: this.zIndex + 1,			
		});
		
		this.x = panels.reduce((a, b) => a + b.size.width, 0);
		this.y = 0;

		this.dragMove = this.dragMove.bind(this);
		this.dragResize = this.dragResize.bind(this);
		this.startDragging = this.startDragging.bind(this);
		this.stopDragging = this.stopDragging.bind(this);
		this.onResize = null;
		
		this.toolbar.addEventListener('mousedown', this.startDragging(this.dragMove).bind(this));
		this.resizer.addEventListener('mousedown', this.startDragging(this.dragResize).bind(this));

		this.render();
		this.resize();
				
		panels.push(this);
	}

	createToolbar(context: Window | Inner<Window>) {
		const div = context.document.createElement('div');
		div.classList.add('____MATA____grab');
		style(div, Panel.styles.toolbar);
		return div;
	}

	startDragging(dragHandler: (e: MouseEvent) => void):  () => void {
		return () => {
			panels.sort((a, b) => a.zIndex > b.zIndex ? 1 : -1).forEach((p, i) => {
				p.zIndex = 99 + i;
				if (p === this) return;
				style(p.frame, { zIndex: p.zIndex });
				style(p.mask, { zIndex: p.zIndex });
			});
			this.zIndex = 99 + panels.length;
			style(this.frame, {
				boxShadow: '0px 20px 50px lightpink',				
				userSelect: 'none',
				zIndex: this.zIndex
			});
			style(this.mask, {
				zIndex: this.zIndex + 1
			});
			this.toolbar.classList.add('____MATA____grabbing');
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
			this.toolbar.classList.remove('____MATA____grabbing');			
			window.document.body.removeEventListener('mouseup', handler);
			window.document.body.removeEventListener('mousemove', dragHandler);
		}
		return handler;
	}

	dragResize(e: MouseEvent) {
		const target = { x: e.clientX, y: e.clientY };
		const width = (target.x - this.frame.offsetLeft) + 10;
		const height = (target.y - this.frame.offsetTop) + 10;
		this.size = { width, height };
		this.frame.width = width + 'px';
		this.frame.height = height + 'px';
		style(this.mask, { width: width + 'px', height: height + 'px' });
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
		this.render();
		// }, 0)
	}

	setPosition(x: number, y: number) {
		this.x = x;
		this.y = y;
		this.render();
	}

	setSize(width: number, height: number) {
		this.size = { width, height };
		this.resize();
		if (this.onResize) {
			this.onResize();
		}
	}

	resize() {
		this.frame.width  = this.size.width + 'px';
		this.frame.height = this.size.height + 'px';
		this.mask.style.width = this.size.width + 'px';
		this.mask.style.height = this.size.height + 'px';
	}

	render() {
		style(this.frame, {
			left: this.x + 'px',
			top: this.y + 'px',
		});
		style(this.mask, {
			left: this.x + 'px',
			top: this.y + 'px',
		});
	}
	
}

export interface Size { width: number, height: number };
export enum EdgeTypes {
	Strong,
	Weak,
};
export interface Edge { from: string, to: string, type: EdgeTypes };
export type StyleDeclaration = { [key: string]: string };
export type StyleLookup = { [key: string]: StyleDeclaration | StyleLookup };

export class Inspector {
	fsm: Mata.Automaton<any>;
	svg: d3.Selection<SVGSVGElement>;
	$el: HTMLElement;
	g: dagreD3.graphlib.Graph;
	render: dagreD3.Render;
	panel: Panel;
	zoom: d3.behavior.Zoom<{}>;
	styles: StyleLookup;
	data: {
		nodes: string[],
		edges: Edge[],
	}
	activeColor: string;

	constructor(parent: HTMLElement, fsm: Mata.Automaton<any>, size?: Size) {
		this.fsm = fsm;
		const defaultSize = { width: 400, height: 400 };
		size = size ? {...size} : defaultSize;
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
		this.activeColor = '#99ff94';

		const styles = this.styles = Object.freeze({
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
				labelStyle: "font-family:sans-serif;",
				style: "fill: #C7FFEA",
			});
		});

		const strongEdges: Edge[] = flatten<Edge>(levelA.map(from => {
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

		const weakEdges: Edge[] = flatten<Edge>(levelA.map(from => {
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

		// if (machine[Route.FromAnyState]) {
		// 	g.setNode('*', {

		// 	})
		// }

		strongEdges.forEach(({from, to}) => {
			g.setEdge(from, to, {
				label: "", // machine[from][to].toString(),
				...styles.edges.Strong.idle
			});
		});

		weakEdges.forEach(({ from, to }) => {
			g.setEdge(from, to, {
				label: "", // machine[from][to].toString(),
				...styles.edges.Weak.idle
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

		// Set do some positioning
		g.nodes().forEach(function(v) {
			var node = g.node(v);
			node.rx = node.ry = 5;
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
		this.fixArrows();

		if (size === defaultSize) {
			const auto = states.length * 100;
			const rect = (<SVGGraphicsElement>this.svg.select('g').node()).getBBox();
			const size = {
				width: rect.width < rect.height ? auto * rect.width / rect.height : auto,
				height: rect.height < rect.width ? auto * rect.width / rect.height : auto,
			}
			this.panel.setSize(
				Math.min(
					rect.width < rect.height ? size.width + 40 : size.width, 
					window.innerWidth
				), 
				Math.min(
					rect.height < rect.width ? size.height + 40 : size.height, 
					window.innerHeight
				)
			);
		}

		this.zoomToFit();		
		this.panel.onResize = this.zoomToFit.bind(this);
		
		// initStaticForceLayout(<d3.Selection<SVGSVGElement, SVGSVGElement, null, undefined>>svg, this.nodes, this.links, this.fsm);
	}

	fixArrows() {
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
		const { from, to } = event;
		const { svg, g } = this;
		if (from === to) {
			return;
		}
		d3.select(g.node(from).elem)
		  .select('rect')
		  .transition()
		  .duration(300)
		  .style( "fill", "#C7FFEA")

		d3.select(g.node(from).elem)
			.select("rect")
			.style("stroke", "none");		
		
		const graphEdge = g.edge({ v: from, w: to });
		const hasValidRoute = !!graphEdge;

		if (hasValidRoute) {
			const dot = this.svg.select('g').append("circle");
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
				// .style('opacity', 0);
			// edge.select('path').style('stroke', '#99ff94');
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
		} else {

		}

		this.activeColor = hasValidRoute ? '#99ff94' : '#f00';			
		
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
		   
		// g.edges().forEach((id) => {
		// 	let e = g.edge(id);
		// 	let data = this.findEdgeData(id.v, id.w);
		// 	let styleKey = EdgeTypes[data.type];
		// 	if (id.v === to) {
		// 		g.setEdge(id.v, id.w, {
		// 			label: e.label,
		// 			...(<StyleLookup>styles.edges[styleKey]).active
		// 		});
		// 	} else {
		// 		g.setEdge(id.v, id.w, {
		// 			label: e.label,
		// 			...(<StyleLookup>styles.edges[styleKey]).idle
		// 		});
		// 	}
		// })
		// const traversed = this.findEdgeData(from, to);
		// const styleKey = EdgeTypes[traversed.type];
		// g.setEdge(from, to, {
		// 	...(<StyleLookup>styles.edges[styleKey]).traversed
		// });
		// this.svg.call(this.render, g);
		// this.fixArrows();
	}

}

export { toMermaid, toDot } from './renderers';
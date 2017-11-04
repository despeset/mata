import { Size } from './visualizer';

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
	private size: Size;
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

		const polluteParentCSS = document.createElement('div');
		polluteParentCSS.innerHTML = `
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
		parent.appendChild(polluteParentCSS);

		const innerCSS = document.createElement('div');
		innerCSS.innerHTML = `
			<style>
				body > div {
					width: 100%;
					height: 100%;
				}
			</style>
		`;
		this.body.appendChild(innerCSS);

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
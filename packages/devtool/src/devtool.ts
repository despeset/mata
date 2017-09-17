import * as Mata from 'mata';
import { toMermaid } from './renderers';
import * as mermaidAPI from 'mermaid';

mermaidAPI.initialize({
	cloneCssStyles: false
});
  
export class Inspector {
	fsm: Mata.Automata<any>;
	svg: string;
	$el: HTMLElement;

	constructor(parent: HTMLElement, fsm: Mata.Automata<any>) {
		this.fsm = fsm;
		fsm.subscribe(() => this.update());
		this.$el = document.createElement('div');
		parent.appendChild(this.$el);
	}

	private update() {
		const src = toMermaid(this.fsm);
		console.log(src);
		mermaidAPI.render('fsm', src, (svg: string) => {
			this.svg = svg;
			this.$el.innerHTML = svg;
			this.$el.children[0].children[0].innerHTML = '';
		}, this.$el);
	}

}

export { toMermaid, toDot } from './renderers';
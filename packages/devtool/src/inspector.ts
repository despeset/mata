import * as Mata from 'mata';
import { Panel } from './panel';
import { Visualizer, Size } from './visualizer';

export class Inspector {
	panel: Panel;
	visualizer: Visualizer;
	constructor(parent: HTMLElement, fsm: Mata.Automaton<any>, size?: Size) {
		const defaultSize = { width: 400, height: 400 };
		size = size ? {...size} : defaultSize;
		const panel = this.panel = new Panel(parent, { 
			width: size.width, 
			height: size.height + 20 
		});
		const visualizer = this.visualizer = new Visualizer(panel.container, fsm);
		if (size === defaultSize) {
			const auto = Object.keys(fsm.states).length * 100;
			const rect = (<SVGGraphicsElement>visualizer.svg.select('g').node()).getBBox();
			const size = {
				width: rect.width < rect.height ? auto * rect.width / rect.height : auto,
				height: rect.height < rect.width ? auto * rect.width / rect.height : auto,
			}
			panel.setSize(
				Math.min(
					rect.width < rect.height ? size.width + 40 : size.width, 
					window.innerWidth
				), 
				Math.min(
					rect.height < rect.width ? size.height + 40 : size.height, 
					window.innerHeight
				)
			);
			panel.onResize = visualizer.zoomToFit.bind(visualizer);
			visualizer.zoomToFit();		
		}
	}

}
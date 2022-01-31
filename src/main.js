import App from './App.svelte';
import { wordles } from './wordles'

const rando = (min, max) => { return Math.floor(Math.random() * (max - min + 1) + min) }

const app = new App({
	target: document.body,
	props: {
		wordle: wordles[rando(1,500)].toUpperCase()
	}
});

export default app;
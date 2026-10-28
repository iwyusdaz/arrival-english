/**
 * Entry point: Arrival, a task-based English game (A2 to B1).
 * @module main
 */
import { App } from './app.js';
import './styles/site.css';
import './styles/arrival.css';
import './styles/case-fonts.css';
import './v2/hud-shell.css';

window.__SLUG__ = 'arrival-english';
new App();

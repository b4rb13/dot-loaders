import { hydrateRoot } from 'react-dom/client';
import { Document, type Mode } from './Document';

const state = document.body.dataset.state === 'pending' ? 'pending' : 'ready';
const mode = document.body.dataset.mode as Mode;
// Read the standard nonce property; browsers conceal getAttribute('nonce').
const nonce = (document.getElementById('bootstrap') as HTMLScriptElement).nonce;
hydrateRoot(document, <Document state={state} mode={mode} nonce={nonce} />);

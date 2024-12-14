/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Readable } from 'node:stream';
import http from 'node:http';
import { Buffer } from 'node:buffer';

export class IncomingMessage extends http.IncomingMessage {
	constructor({
		method,
		url,
		headers,
		body,
		remoteAddress,
	}: {
		method: string;
		url: string;
		headers: Record<string, string | string[]>;
		body?: Buffer;
		remoteAddress?: string;
	}) {
		super({
			encrypted: true,
			readable: false,
			remoteAddress,
			address: () => ({ port: 443 }),
			end: Function.prototype,
			destroy: Function.prototype,
		});

		// Set the content length when there is a body.
		// See https://httpwg.org/specs/rfc9110.html#field.content-length
		if (body) {
			headers['content-length'] ??= String(Buffer.byteLength(body));
		}

		Object.assign(this, {
			ip: remoteAddress,
			complete: true,
			httpVersion: '1.1',
			httpVersionMajor: '1',
			httpVersionMinor: '1',
			method,
			headers,
			body,
			url,
		});

		this._read = () => {
			this.push(body);
			this.push(null);
		};
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		console.log('# Incoming message');

		const ic = new IncomingMessage({
			method: 'POST',
			url: 'https://example.com',
			body: Buffer.from('Incoming Message hello world'),
			headers: {
				'content-type': 'text/plain',
			},
			remoteAddress: '127.0.0.1',
		});

		// Error with:
		// TypeError: This ReadableStream is disturbed (has already been read from), and cannot be used as a body.
		const req = new Request('http://example.com', { method: 'POST', body: Readable.toWeb(ic) });

		// Works
		//const req = new Request('http://example.com', { method: 'POST', body: ReadableStream.from(ic) });

		for await (const chunk of req.body) {
			console.log(new TextDecoder().decode(chunk));
		}

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;

// https-server-enhanced.js
import { readFileSync, watch } from "node:fs";
import { join, resolve } from "node:path";

const port = process.env.PORT || 3000;
const distPath = resolve(".");

// Load SSL certificates
let cert, key;
try {
	cert = readFileSync("./certs/localhost.pem");
	key = readFileSync("./certs/localhost-key.pem");
} catch (error) {
	console.error("❌ SSL certificates not found!");
	console.error("Please generate certificates first:");
	console.error("  brew install mkcert");
	console.error("  mkcert -install");
	console.error("  mkcert localhost 127.0.0.1 ::1");
	process.exit(1);
}

const server = Bun.serve({
	port,
	tls: {
		cert,
		key,
	},

	async fetch(request) {
		const url = new URL(request.url);
		let pathname = url.pathname;

		// Handle CORS preflight requests
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: getCORSHeaders(),
			});
		}

		// Default routes
		if (pathname === "/") {
			pathname = "/taskpane.html";
		}

		// Log requests
		console.log(`${new Date().toISOString()} - ${request.method} ${pathname}`);

		try {
			const filePath = join(distPath, pathname);
			const file = Bun.file(filePath);

			if (!(await file.exists())) {
				console.warn(`❌ File not found: ${filePath}`);
				return new Response("File not found", {
					status: 404,
					headers: getCORSHeaders(),
				});
			}

			const content = await file.arrayBuffer();
			const contentType = getContentType(pathname);

			return new Response(content, {
				headers: {
					"Content-Type": contentType,
					...getCORSHeaders(),
					"Cache-Control": "no-cache", // Prevent caching during development
				},
			});
		} catch (error) {
			console.error("❌ Error serving file:", error);
			return new Response("Internal Server Error", {
				status: 500,
				headers: getCORSHeaders(),
			});
		}
	},
});

function getCORSHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

function getContentType(pathname) {
	const ext = pathname.split(".").pop()?.toLowerCase();
	const mimeTypes = {
		html: "text/html; charset=utf-8",
		js: "application/javascript; charset=utf-8",
		css: "text/css; charset=utf-8",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		svg: "image/svg+xml",
		json: "application/json; charset=utf-8",
		xml: "application/xml; charset=utf-8",
		txt: "text/plain; charset=utf-8",
		woff: "font/woff",
		woff2: "font/woff2",
		ttf: "font/ttf",
		eot: "application/vnd.ms-fontobject",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

// Watch for changes in dist folder (optional)
if (process.env.NODE_ENV !== "production") {
	watch(distPath, { recursive: true }, (eventType, filename) => {
		console.log(`📁 File changed: ${filename}`);
	});
}

console.log("🔒 HTTPS Server Configuration:");
console.log(`   Port: ${port}`);
console.log(`   Serving: ${distPath}`);
console.log(`   URL: https://localhost:${port}`);
console.log("");
console.log("📋 Available endpoints:");
console.log(`   Main: https://localhost:${port}/taskpane.html`);
console.log(`   Commands: https://localhost:${port}/commands.html`);
console.log(`   Manifest: https://localhost:${port}/manifest.xml`);
console.log("");
console.log("✅ Server is running! Press Ctrl+C to stop.");

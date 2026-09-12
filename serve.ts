const port = Number(process.env.PORT ?? 5173);

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const rel = path === '/' ? '/index.html' : path;
    const file = Bun.file(import.meta.dir + rel);
    if (await file.exists()) return new Response(file, { headers: { 'cache-control': 'no-store' } });
    return new Response(`Not found: ${path}\n`, { status: 404 });
  },
});

console.log(`SenChain mockup → http://localhost:${port}`);

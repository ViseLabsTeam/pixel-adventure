import { afterAll, beforeAll, expect, it } from "vitest";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import viteConfig from "./vite.config";

let upstream: HttpServer;
let vite: ViteDevServer;
let origin: string;
const received: string[] = [];

beforeAll(async () => {
  upstream = createHttpServer((req, res) => {
    received.push(`${req.method} ${req.url}`);
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("upstream");
  });
  upstream.on("upgrade", (req, socket) => {
    received.push(`UPGRADE ${req.url}`);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve),
  );
  const address = upstream.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  const realtimeProxy = viteConfig.server?.proxy?.["/realtime"];
  if (!realtimeProxy || typeof realtimeProxy === "string")
    throw new Error("Missing realtime proxy");
  vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      ...viteConfig.server,
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      proxy: {
        ...viteConfig.server?.proxy,
        "/realtime": {
          ...realtimeProxy,
          target: `http://127.0.0.1:${address.port}`,
        },
      },
    },
  });
  await vite.listen();
  origin = vite.resolvedUrls!.local[0];
});

afterAll(async () => {
  await vite?.close();
  await new Promise<void>((resolve, reject) =>
    upstream?.close((error) => (error ? reject(error) : resolve())),
  );
});

it("forwards matchmaking and WebSocket paths without the public prefix", async () => {
  const response = await fetch(`${origin}realtime/matchmake/joinById/room-1`, {
    method: "POST",
  });
  expect(response.status).toBe(200);

  const socket = new WebSocket(
    `${origin.replace(/^http/, "ws")}realtime/process-1/room-1`,
  );
  await new Promise<void>((resolve) => {
    socket.addEventListener("error", () => resolve(), { once: true });
    socket.addEventListener("close", () => resolve(), { once: true });
  });

  expect(received).toEqual([
    "POST /matchmake/joinById/room-1",
    "UPGRADE /process-1/room-1",
  ]);
}, 15_000);

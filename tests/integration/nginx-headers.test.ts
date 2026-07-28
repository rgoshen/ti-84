import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Exercises the real `nginx.conf` by running it under `nginx:alpine`.
 *
 * The Playwright suite cannot cover this: it serves the site with `astro preview`,
 * which never reads `nginx.conf`. Asserting cache headers there would pass while the
 * shipped container kept serving stale HTML — precisely the bug this guards.
 *
 * The fixture is baked into a throwaway image rather than bind-mounted so the test
 * carries its own document root and does not depend on host path sharing.
 */

const IMAGE = 'ti84-nginx-headers-test';
const NAME = 'ti84-nginx-headers-test-run';

// A hashed name mirroring Astro's real output: content-hashed, hence safe to pin.
const HASHED_ASSET = '_astro/app.DVuvR4UI.js';

const DOCKERFILE = `
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /usr/share/nginx/html/_astro /usr/share/nginx/html/explorers/angles \\
 && printf '<!doctype html><title>root</title>' > /usr/share/nginx/html/index.html \\
 && printf '<!doctype html><title>angles</title>' > /usr/share/nginx/html/explorers/angles/index.html \\
 && printf 'export const x = 1;' > /usr/share/nginx/html/${HASHED_ASSET}
`;

let origin: string;

function docker(args: string[], input?: string): string {
  return execFileSync('docker', args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function removeContainer(): void {
  try {
    docker(['rm', '-f', NAME]);
  } catch {
    // Absent container is the desired state, so a failure to remove it is not one.
  }
}

beforeAll(async () => {
  removeContainer();
  docker(['build', '-t', IMAGE, '-f', '-', '.'], DOCKERFILE);
  // Port 0 lets the kernel choose, so concurrent runs cannot collide on a fixed port.
  docker(['run', '-d', '--name', NAME, '-p', '127.0.0.1:0:80', IMAGE]);

  const mapping = docker(['port', NAME, '80']).trim().split('\n')[0];
  origin = `http://127.0.0.1:${mapping.split(':').pop()}`;

  // Poll for readiness rather than sleeping a fixed interval, which would either
  // flake on a slow machine or waste time on a fast one.
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const probe = await fetch(`${origin}/`);
      if (probe.ok) return;
    } catch {
      // nginx has not bound the port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`nginx did not become ready at ${origin}`);
}, 180_000);

afterAll(removeContainer);

describe('nginx cache policy', () => {
  it('forces revalidation of HTML so a new build is never masked by a cached page', async () => {
    const response = await fetch(`${origin}/explorers/angles/`);

    expect(response.status).toBe(200);
    // `no-cache` still permits storage and 304s; it only forbids reuse *without*
    // asking. `no-store` would ban caching outright and lose that cheap revalidation.
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });

  it('applies the same revalidation rule to the site root', async () => {
    const response = await fetch(`${origin}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });

  it('lets content-hashed bundles cache permanently', async () => {
    const response = await fetch(`${origin}/${HASHED_ASSET}`);
    const cacheControl = response.headers.get('cache-control') ?? '';

    expect(response.status).toBe(200);
    // A changed bundle gets a changed filename, so this URL's body cannot go stale.
    expect(cacheControl).toContain('max-age=31536000');
    expect(cacheControl).toContain('immutable');
  });

  it('still serves clean URLs without a trailing-slash redirect', async () => {
    // Guards the existing `try_files` behaviour: a 301 here would be cached by the
    // browser and, behind a published port, would carry the container's own port.
    const response = await fetch(`${origin}/explorers/angles`, { redirect: 'manual' });

    expect(response.status).toBe(200);
  });
});

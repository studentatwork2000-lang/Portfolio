import { readFile, realpath, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STATE = resolve(process.env.CODEX_REMOTE_STATE_PATH || resolve(ROOT, '.runtime'));
export async function loadConfig() {
    const path = process.env.CODEX_REMOTE_CONFIG || resolve(ROOT, 'config.local.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535)
        throw new Error('Choose a port from 1024 to 65535.');
    if (!config.password?.salt || !/^[a-f0-9]{128}$/.test(config.password.hash))
        throw new Error('Run npm run setup to configure app login.');
    config.host ||= '127.0.0.1';
    if (config.host !== '127.0.0.1' && config.host !== '::1')
        throw new Error('The service must bind to loopback.');
    config.codexPath ||= 'codex';
    config.origins = [...new Set([...(config.origins || []), `http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`])];
    if (process.env.CODESPACE_NAME)
        config.origins.push(`https://${process.env.CODESPACE_NAME}-${config.port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`);
    config.origins = config.origins.map(o => {
        const u = new URL(o);
        if (u.origin !== o || !['https:', 'http:'].includes(u.protocol))
            throw new Error('Origins must be complete origins without a path.');
        if (u.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname))
            throw new Error('Remote access requires HTTPS.');
        return o;
    });
    config.workspaces = await Promise.all(config.workspaces.map(p => realpath(p)));
    if (!config.workspaces.length)
        throw new Error('Configure at least one workspace.');
    await mkdir(STATE, { recursive: true, mode: 0o700 });
    return config;
}
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export async function workspace(config, value) {
    if (typeof value !== 'string')
        throw new HttpError(400, 'Select a configured workspace.');
    let actual;
    try {
        actual = await realpath(value);
    }
    catch {
        throw new HttpError(400, 'Workspace is unavailable.');
    }
    if (!config.workspaces.includes(actual))
        throw new HttpError(403, 'This workspace is not configured.');
    return actual;
}

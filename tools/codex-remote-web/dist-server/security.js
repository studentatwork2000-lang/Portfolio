import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { HttpError } from './config.js';
export class Security {
    config;
    sessions = new Map();
    attempts = new Map();
    constructor(config) {
        this.config = config;
    }
    origin(req) {
        const host = req.headers.host;
        const known = this.config.origins.find(o => new URL(o).host === host);
        if (!known)
            throw new HttpError(403, 'Unrecognized host.');
        if (req.headers.origin && !this.config.origins.includes(req.headers.origin))
            throw new HttpError(403, 'Cross-origin requests are blocked.');
        if (req.headers['sec-fetch-site'] === 'cross-site')
            throw new HttpError(403, 'Cross-site requests are blocked.');
        // A trusted forwarding proxy may preserve the public Origin but rewrite Host to loopback.
        return req.headers.origin || known;
    }
    session(req) {
        const match = /(?:^|;\s*)crw_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
        const id = match?.[1];
        const s = id && this.sessions.get(id);
        if (!s || s.expires < Date.now()) {
            if (id)
                this.remove(id);
            return null;
        }
        return { id: id, ...s };
    }
    require(req, mutation = false) {
        this.origin(req);
        const session = this.session(req);
        if (!session)
            throw new HttpError(401, 'Sign in to Codex Remote.');
        if (mutation && req.headers['x-csrf-token'] !== session.csrf)
            throw new HttpError(403, 'Security token expired. Refresh the page.');
        return session;
    }
    login(req, res, password) {
        const origin = this.origin(req);
        if (req.headers.origin !== origin || req.headers['x-codex-remote'] !== '1')
            throw new HttpError(403, 'Login must come from this application.');
        const key = req.socket.remoteAddress || 'local';
        const now = Date.now();
        for (const [k, v] of this.attempts)
            if (v.until < now)
                this.attempts.delete(k);
        const attempt = this.attempts.get(key) || { count: 0, until: now + 60_000 };
        if (attempt.count >= 8)
            throw new HttpError(429, 'Too many login attempts. Try again in a minute.');
        attempt.count++;
        this.attempts.set(key, attempt);
        if (typeof password !== 'string' || password.length > 256)
            throw new HttpError(401, 'Incorrect passphrase.');
        const candidate = scryptSync(password, this.config.password.salt, 64);
        if (!timingSafeEqual(candidate, Buffer.from(this.config.password.hash, 'hex')))
            throw new HttpError(401, 'Incorrect passphrase.');
        this.attempts.delete(key);
        this.prune();
        if (this.sessions.size >= 32)
            throw new HttpError(429, 'Too many browser sessions. Sign out on another browser.');
        const old = this.session(req);
        if (old)
            this.remove(old.id);
        const id = randomBytes(32).toString('hex');
        const csrf = randomBytes(32).toString('hex');
        this.sessions.set(id, { csrf, expires: now + 12 * 60 * 60_000, streams: new Set() });
        res.setHeader('Set-Cookie', `crw_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${origin.startsWith('https:') ? '; Secure' : ''}`);
        return { authenticated: true, csrf };
    }
    remove(id) {
        for (const stream of this.sessions.get(id)?.streams || [])
            stream.end();
        this.sessions.delete(id);
    }
    prune() { for (const [id, s] of this.sessions)
        if (s.expires < Date.now())
            this.remove(id); }
}
export const headers = {
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
export async function body(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json'))
        throw new HttpError(415, 'Use application/json.');
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 256 * 1024)
            throw new HttpError(413, 'Request is too large (256 KB limit).');
        chunks.push(chunk);
    }
    try {
        const value = JSON.parse(Buffer.concat(chunks).toString());
        if (!value || Array.isArray(value) || typeof value !== 'object')
            throw new Error();
        return value;
    }
    catch {
        throw new HttpError(400, 'Invalid JSON request.');
    }
}

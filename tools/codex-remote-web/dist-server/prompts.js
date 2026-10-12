import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { STATE } from './config.js';
import { mergeItems } from './messages.js';
const valid = (value) => /^[a-zA-Z0-9_-]{1,160}$/.test(value);
function directory(threadId, turnId) {
    if (!valid(threadId) || !valid(turnId))
        throw new Error('Invalid prompt-history identifier.');
    return resolve(STATE, 'prompt-history', threadId, turnId);
}
export async function savePrompt(threadId, turnId, requestId, text) {
    if (!/^[a-f0-9-]{36}$/.test(requestId))
        throw new Error('Invalid prompt request identifier.');
    const item = { id: 'crw-prompt:' + requestId, type: 'userMessage', clientId: requestId, content: [{ type: 'text', text, text_elements: [] }] };
    const dir = directory(threadId, turnId);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const path = resolve(dir, requestId + '.json');
    await writeFile(path + '.tmp', JSON.stringify(item), { mode: 0o600 });
    await rename(path + '.tmp', path);
    return item;
}
export async function restorePrompts(threadId, turns) {
    return Promise.all(turns.map(async (turn) => {
        const dir = directory(threadId, turn.id);
        let names;
        try {
            names = await readdir(dir);
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return turn;
            throw e;
        }
        const items = await Promise.all(names.filter(n => /^[a-f0-9-]{36}\.json$/.test(n)).map(async (name) => {
            const item = JSON.parse(await readFile(resolve(dir, name), 'utf8'));
            if (item?.type !== 'userMessage' || !item.id?.startsWith('crw-prompt:') || !Array.isArray(item.content))
                throw new Error('Invalid saved prompt record.');
            return item;
        }));
        return { ...turn, items: mergeItems(turn.items, items) };
    }));
}

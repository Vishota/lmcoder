import { LMStudioClient, Chat } from '@lmstudio/sdk';
import { config } from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { parseModulesFromMarkdown } from './utils.js';
import { log } from './logger.js';
config();
const execAsync = promisify(exec);
const HOST = process.env.HOST;
const MODEL = process.env.MODEL;
const WORKSPACE = process.env.WORKSPACE;
const TEMP = process.env.TEMP;
const LOGFILE = process.env.LOGFILE;
async function callLLM(prompt) {
    const client = new LMStudioClient({ baseUrl: HOST });
    const model = await client.llm.model(MODEL);
    const chat = Chat.empty();
    chat.append('system', 'You are a precise software engineer. Only output code or markdown.');
    chat.append('user', prompt);
    let result = '';
    await model.act(chat, [], { onMessage: msg => { result += msg.getText(); } });
    await log('llm', `Response received (${result.length} chars)`, LOGFILE);
    return result;
}
async function writeFile(base, rel, content) {
    const full = join(base, rel);
    await fs.mkdir(join(full, '..'), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
    await log('file', `Wrote ${rel}`, LOGFILE);
}
async function runTests(modulePath) {
    try {
        const { stdout, stderr } = await execAsync(`cd ${join(TEMP, modulePath)} && npx vitest run`);
        await log('bash', stdout || stderr, LOGFILE);
        return true;
    }
    catch (err) {
        await log('fail', err.message, LOGFILE);
        return false;
    }
}
export async function orchestrate(task) {
    await log('step', `Starting: ${task}`, LOGFILE);
    await fs.mkdir(TEMP, { recursive: true });
    const decomp = await callLLM(`Split project into modules with interfaces (markdown with H2 names and code blocks):\n${task}`);
    const modules = await parseModulesFromMarkdown(decomp);
    for (const mod of modules) {
        const base = join(TEMP, mod.name);
        await fs.mkdir(base, { recursive: true });
        const iface = await callLLM(`Generate TypeScript interface for module ${mod.name}:\n${mod.interfacePrompt}`);
        await writeFile(base, 'interface.ts', iface);
        const tests = await callLLM(`Write vitest tests for interface of module ${mod.name}:\n${iface}`);
        await writeFile(base, 'test.ts', tests);
        const impl = await callLLM(`Implement module ${mod.name} based on interface:\n${iface}`);
        await writeFile(base, 'impl.ts', impl);
        const ok = await runTests(mod.name);
        if (ok) {
            await fs.cp(base, join(WORKSPACE, mod.name), { recursive: true });
            await log('ok', `Integrated ${mod.name}`, LOGFILE);
        }
        else {
            await log('fail', `Module ${mod.name} tests failed`, LOGFILE);
        }
    }
}

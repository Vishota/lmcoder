import { promises as fs } from 'fs';
import chalk from 'chalk';
import { dirname } from 'path';
export async function log(type, message, logFile) {
    const symbols = {
        llm: '🤖', file: '📄', bash: '🐚', ok: '✅', fail: '❌', step: '🧭'
    };
    const symbol = symbols[type] || '📌';
    const line = `${symbol} [${type.toUpperCase()}] ${message}`;
    console.log(chalk.gray(line));
    await fs.mkdir(dirname(logFile), { recursive: true });
    await fs.appendFile(logFile, line + '\n');
}

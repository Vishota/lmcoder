import fs from 'fs';
import path from 'path';

process.chdir('/workspace')

const logFilePath = path.join(process.cwd(), 'progress.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function logEvent(icon: string, message: string) {
  const logMessage = `${icon} ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

export function logTask(message: string) {
  logEvent('🧩', message);
}

export function logTest(message: string) {
  logEvent('🧪', message);
}

export function logGenerate(message: string) {
  logEvent('⚙️', message);
}

export function logSuccess(message: string) {
  logEvent('✅', message);
}

export function logError(message: string) {
  logEvent('❌', message);
}

export function logRetry(message: string) {
  logEvent('🔁', message);
}

export function logLLM(message: string) {
  logEvent('🧠', message);
}
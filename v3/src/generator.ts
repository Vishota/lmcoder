import { LMStudioClient } from '@lmstudio/sdk';
import { logLLM } from './logger.js';
import dotenv from 'dotenv';
dotenv.config();

interface SubtaskInfo {
  name: string;
  description: string;
  signature: string;
}

let client: any;
let model: any;
async function initClient() {
  if (!client) {
    client = new LMStudioClient({ baseUrl: process.env.LMSTUDIO_ENDPOINT });
    const modelName = process.env.LLM_MODEL || 'llama-3.2-1b-instruct';
    model = await client.llm.model(modelName);
  }
}

function stripCodeFences(text: string): string {
  return text
    .replace(/```(typescript|ts)?\n?/gi, '')
    .replace(/```/g, '')                    
    .trim();
}

export async function generateSubtasks(projectDescription: string): Promise<SubtaskInfo[]> {
  await initClient();
  const prompt = `You are a project decomposition assistant. Given the following project description, break it down into concrete, non-generic subtasks. For each subtask, specify:
  1) a concise unique name,
  2) a detailed description of what exactly must be implemented,
  3) a precise TypeScript function signature (no placeholders, fully typed) for the feature, e.g. \`function calculateSum(a: number, b: number): number\`.
Make sure there are no sample paths like '../path/to', no unimplemented stubs like 'throw "Not implemented"'. If a subtask requires external dependencies, list them at the very top as comments using the syntax "// @>npm i package@version". Return ONLY valid JSON, with fields 'name', 'description', 'signature'. Do not wrap in markdown or include extra explanation.

Project Description:
${projectDescription}`;
  logLLM(`Prompt for subtasks: ${prompt}`);
  const response = await model.respond(prompt);
  logLLM(`Response for subtasks: ${response.content}`);
  try {
    const tasks = JSON.parse(response.content);
    return tasks;
  } catch {
    logLLM('Failed to parse subtasks JSON.');
    throw new Error('Invalid subtasks JSON response from LLM');
  }
}

export async function generateTest(task: { name: string; signature: string; description: string; id: number; errorLog?: string; }): Promise<string> {
  await initClient();
  const prompt = `You are a test generation assistant. Given the exact TypeScript signature and description, and any previous error logs, produce a complete, executable TypeScript test file. Use Node's built-in assert module or a specified testing framework. Import the function directly: \`import { ${task.signature.match(/function (\w+)/)?.[1]} } from './task${task.id}';\`. Write realistic test cases covering normal and edge conditions. Do NOT use placeholders like '../path/to'. Do NOT include 'throw \"Not implemented\"'. If external packages are needed, declare them at the top with "// @>npm i package@version". Return ONLY TypeScript code without markdown fences or comments beyond imports.

Function signature:
${task.signature}

Function description:
${task.description}

${task.errorLog ? `Previous error log:\n${task.errorLog}` : ''}`.trim();
  logLLM(`Prompt for test (${task.name}): ${prompt}`);
  const response = await model.respond(prompt);
  logLLM(`Response for test (${task.name}): ${response.content}`);
  return stripCodeFences(response.content);
}

export async function generateCode(task: { name: string; signature: string; description: string; id: number; errorLog?: string; }): Promise<string> {
  await initClient();
  // Extract function name from signature
  const fnNameMatch = task.signature.match(/function (\w+)/);
  const fnName = fnNameMatch ? fnNameMatch[1] : 'fn';
  const prompt = `You are a code generation assistant. Write a complete, production-ready TypeScript implementation for the function described below, with no stubs or placeholders. The function must match this signature exactly and be properly exported. Do not use sample paths, do not include unimplemented throws. If external dependencies are needed, declare them at the top with "// @>npm i package@version". Return ONLY the raw TypeScript code, no markdown fences or extra commentary.

Function signature:
${task.signature}

Function description:
${task.description}

${task.errorLog ? `Previous error log:\n${task.errorLog}` : ''}`.trim();
  logLLM(`Prompt for code (${task.name}): ${prompt}`);
  const response = await model.respond(prompt);
  logLLM(`Response for code (${task.name}): ${response.content}`);
  return stripCodeFences(response.content);
}

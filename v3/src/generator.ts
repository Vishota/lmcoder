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
    client = new LMStudioClient();
    const modelName = process.env.LLM_MODEL || 'llama-3.2-1b-instruct';
    model = await client.llm.model(modelName);
  }
}

export async function generateSubtasks(projectDescription: string): Promise<SubtaskInfo[]> {
  await initClient();
  const prompt = `You are a project decomposition assistant. Given the following project description, break it down into clear, separate subtasks. For each subtask, specify a name, a detailed description of what needs to be done, and a TypeScript function signature (interface) that should be implemented. Output the result as a JSON array of tasks, where each task has 'name', 'description', and 'signature'. Do not include any additional explanation.

Project Description:
${projectDescription}`;
  logLLM(`Prompt for subtasks: ${prompt}`);
  const response = await model.respond(prompt);
  logLLM(`Response for subtasks: ${response.content}`);
  try {
    const tasks = JSON.parse(response.content);
    return tasks;
  } catch (err) {
    logLLM('Failed to parse subtasks JSON.');
    throw new Error('Invalid subtasks JSON response from LLM');
  }
}

export async function generateTest(task: { name: string; signature: string; description: string; id: number; }): Promise<string> {
  await initClient();
  const prompt = `You are a test generation assistant. Given the TypeScript function signature and description for a function, write a set of tests in TypeScript using Node's built-in assert module. The tests should import the function from './task${task.id}' and verify its behavior according to the description. If a test case fails, throw an error. Include edge cases. Return only the valid TypeScript test code, with no additional commentary or markdown formatting.

Function signature:
${task.signature}
Function description:
${task.description}`;
  logLLM(`Prompt for test (${task.name}): ${prompt}`);
  const response = await model.respond(prompt);
  logLLM(`Response for test (${task.name}): ${response.content}`);
  return response.content;
}

export async function generateCode(task: { name: string; signature: string; description: string; id: number; }): Promise<string> {
  await initClient();
  const prompt = `You are a code generation assistant. Write a TypeScript implementation for the following function that matches the given signature and behavior. Use the description to guide the implementation. Ensure the function is exported so it can be imported in tests. Do not include tests or commentary; output only the code.

Function signature:
${task.signature}
Function description:
${task.description}`;
  logLLM(`Prompt for code (${task.name}): ${prompt}`);
  const response = await model.respond(prompt);
  logLLM(`Response for code (${task.name}): ${response.content}`);
  return response.content;
}
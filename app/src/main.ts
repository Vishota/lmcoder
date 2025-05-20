import { LMStudioClient, tool, Chat } from "@lmstudio/sdk";
import { z } from "zod";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const HOST     = "ws://host.docker.internal:1234";
const MODEL    = 'codestral-22b-v0.1';
const WORK_DIR = "/workspace";

const client    = new LMStudioClient({ baseUrl: HOST });
const execAsync = promisify(exec);

// Утилита: приводим любой входящий путь к относительному
function sanitizePath(input: string): string {
  // Если пользователь по ошибке передал полный путь WORK_DIR/... — отрезаем префикс
  if (input.startsWith(WORK_DIR)) {
    input = input.slice(WORK_DIR.length);
  }
  // Убираем ведущий слэш, чтобы join не сбрасывал WORK_DIR
  return input.replace(/^[/\\]+/, "");
}

const writeFileTool = tool({
  name: "write_file",
  description: "Create or overwrite a file under WORK_DIR",
  parameters: {
    path:    z.string(),
    content: z.string(),
  },
  implementation: async ({ path, content }) => {
    const relPath = sanitizePath(path);
    const full = join(WORK_DIR, relPath);
    try {
      await fs.mkdir(WORK_DIR, { recursive: true });
      await fs.writeFile(full, content, "utf8");
      return `✅ Wrote file ${relPath}`;
    } catch (err: any) {
      return `❌ Error writing file ${relPath}: ${err.message}`;
    }
  },
});

const readFileTool = tool({
  name: "read_file",
  description: "Read a file’s content from WORK_DIR",
  parameters: {
    path: z.string(),
  },
  implementation: async ({ path }) => {
    const relPath = sanitizePath(path);
    const full = join(WORK_DIR, relPath);
    try {
      return await fs.readFile(full, "utf8");
    } catch (err: any) {
      return `❌ Error reading file ${relPath}: ${err.message}`;
    }
  },
});

const runCommandTool = tool({
  name: "run_command",
  description: "Execute a Bash command inside WORK_DIR",
  parameters: {
    command: z.string(),
  },
  implementation: async ({ command }) => {
    try {
      const { stdout, stderr } = await execAsync(`cd ${WORK_DIR} && ${command}`);
      return stdout || stderr;
    } catch (err: any) {
      return `❌ Error running command "${command}": ${err.stderr || err.message}`;
    }
  },
});

// 2) Системный промпт:

const SYSTEM_PROMPT = `
You are a world-class AI software engineer with access to tools:
- write_file(path, content)
- read_file(path)
- run_command(command)
All operations must happen inside "${WORK_DIR}".
System you work in is alpine. You can 
Break tasks into clear steps, emit JSON-style tool calls, and continue until done.
Create README.md in the root with project description and all instructions. Create gitignore
Check if there are some errors when you run project and fix all if needed.
Do not stop until all is fixed and works.
`.trim();

// 3) Обёртка запуска с catch:

async function scaffoldProject(task: string) {
  try {
    const model = await client.llm.model(MODEL);
    const chat = Chat.empty();
    chat.append("system", SYSTEM_PROMPT);
    chat.append("user", task);

    await model.act(
      chat,
      [writeFileTool, readFileTool, runCommandTool],
      {
        onMessage: msg => process.stdout.write(msg.toString()),
      }
    );
  } catch (err: any) {
    console.error(`Fatal error in scaffoldProject: ${err.message || err}`);
  }
}

// 4) Пример использования:

(async () => {
  await scaffoldProject(
    `Create a simple social network.
    Requirements:
    - authorization
    - subscription
    - feed
    - posting
    - reactions
    - users rating
    - tags for posts
    etc.

    Use typescript, node.js, vue. Check project before finishing
    `
  );
  console.log("\n🎉 Project generation complete!");
})();

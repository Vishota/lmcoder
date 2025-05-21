import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import { loadManifest, saveManifest, Task, Manifest } from './manifest.js';
import { generateSubtasks, generateTest, generateCode } from './generator.js';
import { logTask, logTest, logGenerate, logSuccess, logError, logRetry, logLLM } from './logger.js';

process.chdir('/workspace');

dotenv.config();

// Извлекаем зависимости из кода или теста: ищем комментарии вида "// packages:" или "// @>npm i"
function parsePackagesFromText(text: string): string[] {
	const packages: string[] = [];
	const lines = text.split('\n');
	for (const line of lines) {
		const pkgMatch = line.match(/\/\/\s*packages:\s*(.*)/i);
		if (pkgMatch) {
			packages.push(...pkgMatch[1].split(/[\s,]+/).map(s => s.trim()).filter(Boolean));
		}
		const cmdMatch = line.match(/\/\/\s*@>npm i (.*)/i);
		if (cmdMatch) {
			packages.push(...cmdMatch[1].split(/[\s]+/).map(s => s.trim()).filter(Boolean));
		}
	}
	return [...new Set(packages)];
}

function installPackages(pkgs: string[]): boolean {
	if (pkgs.length === 0) return true;
	logGenerate(`Installing packages: ${pkgs.join(', ')}`);
	const result = spawnSync('npm', ['install', ...pkgs], { encoding: 'utf-8' });
	if (result.status !== 0) {
		logError(`npm install failed: ${result.stderr || result.stdout}`);
		return false;
	}
	logSuccess('Dependencies installed');
	return true;
}

async function main() {
	let manifest: Manifest;
	try {
		manifest = loadManifest();
	} catch (err: any) {
		logError('Failed to load manifest: ' + err.message);
		return;
	}

	logTask('Running initial npm install');
	installPackages([]);

	if (!manifest.tasks || manifest.tasks.length === 0) {
		logTask('Breaking project into subtasks...');
		let description = '';
		const inputArg = process.argv[2] || '';
		if (inputArg) {
			if (fs.existsSync(inputArg)) {
				description = fs.readFileSync(inputArg, 'utf-8');
			} else {
				description = inputArg;
			}
		} else {
			logError('No project description provided.');
			return;
		}
		const subtasks = await generateSubtasks(description);
		manifest.tasks = subtasks.map((t, index) => ({
			id: index + 1,
			name: t.name,
			description: t.description,
			signature: t.signature,
			test: null,
			code: null,
			attempts: { test: 0, code: 0 },
			status: 'pending',
			errorLog: undefined
		}));
		saveManifest(manifest);
		logSuccess('Subtasks created and saved to manifest.');
	}

	for (const task of manifest.tasks) {
		if (task.status === 'success') continue;

		logTask(`Starting task ${task.id}: ${task.name}`);
		if (!task.test) {
			logTest(`Generating test for task ${task.name}`);
			try {
				const testCode = await generateTest({ name: task.name, signature: task.signature, description: task.description, id: task.id });
				task.test = testCode;
				task.attempts.test++;
				const testPath = path.join(process.cwd(), `task${task.id}.test.ts`);
				fs.writeFileSync(testPath, testCode, 'utf-8');
				logSuccess(`Test generated for task ${task.name}`);
			} catch (err: any) {
				logError(`Test generation failed for task ${task.name}: ${err.message}`);
				break;
			}
		}

		let success = false;
		let testRegenerated = false;

		while (!success) {
			logGenerate(`Generating code for task ${task.name} (attempt ${task.attempts.code + 1})`);
			try {
				const code = await generateCode({
					name: task.name,
					signature: task.signature,
					description: task.description,
					id: task.id,
					errorLog: task.errorLog || ''
				});
				task.code = code;
				task.attempts.code++;
				const codePath = path.join(process.cwd(), `task${task.id}.ts`);
				fs.writeFileSync(codePath, code, 'utf-8');
				logSuccess(`Code generated for task ${task.name} (attempt ${task.attempts.code})`);
			} catch (err: any) {
				logError(`Code generation failed for task ${task.name}: ${err.message}`);
			}

			const testText = task.test || '';
			const codeText = task.code || '';
			const pkgs = Array.from(new Set([...parsePackagesFromText(testText), ...parsePackagesFromText(codeText)]));
			if (!installPackages(pkgs)) {
				logError('Dependency installation failed, stopping.');
				return;
			}

			logTest(`Running test for task ${task.name}`);
			const result = spawnSync('npx', ['ts-node', `task${task.id}.test.ts`], { encoding: 'utf-8' });
			if (result.status === 0) {
				logSuccess(`Test passed for task ${task.name}`);
				task.status = 'success';
				task.errorLog = undefined;
				success = true;
			} else {
				logError(`Test failed for task ${task.name}`);
				logError(result.stderr || result.stdout);
				task.errorLog = result.stderr || result.stdout;
				if (task.attempts.code < 10) {
					logRetry(`Retrying code generation for task ${task.name}`);
					continue;
				} else if (!testRegenerated) {
					logRetry(`Regenerating test for task ${task.name}`);
					try {
						const newTest = await generateTest({ name: task.name, signature: task.signature, description: task.description, id: task.id });
						task.test = newTest;
						task.attempts.test++;
						fs.writeFileSync(path.join(process.cwd(), `task${task.id}.test.ts`), newTest, 'utf-8');
						logSuccess(`Test regenerated for task ${task.name}`);
					} catch (e: any) {
						logError(`Test regeneration failed for task ${task.name}: ${e.message}`);
					}
					task.attempts.code = 0;
					testRegenerated = true;
					continue;
				} else {
					logError(`Task ${task.name} failed after multiple attempts.`);
					task.status = 'failed';
					break;
				}
			}
		}

		saveManifest(manifest);
		if (!success) {
			logError(`Stopping process due to failure in task ${task.name}.`);
			break;
		}
	}

	if (manifest.tasks.every(t => t.status === 'success')) {
		logTask('Building the project');
		const build = spawnSync('npx', ['tsc'], { encoding: 'utf-8' });
		if (build.status !== 0) {
			logError('Build failed:');
			logError(build.stderr || build.stdout);
		} else {
			logSuccess('Build succeeded');
			logTask('Running the project');
			const run = spawnSync('node', ['dist/index.js'], { encoding: 'utf-8' });
			if (run.status !== 0) {
				logError('Run failed:');
				logError(run.stderr || run.stdout);
			} else {
				logSuccess('Project ran successfully');
			}
		}
		manifest.status = 'success';
		saveManifest(manifest);
	} else {
		logError('Not all tasks completed successfully. Project is not ready.');
	}
}

main();

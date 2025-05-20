import fs from 'fs';
import path from 'path';

export interface Task {
  id: number;
  name: string;
  description: string;
  signature: string;
  test: string | null;
  code: string | null;
  attempts: {
    test: number;
    code: number;
  };
  status: 'pending' | 'success' | 'failed';
}

export interface Manifest {
  tasks: Task[];
  status: 'pending' | 'success';
}

const manifestPath = path.join(process.cwd(), 'manifest.json');

export function loadManifest(): Manifest {
  if (fs.existsSync(manifestPath)) {
    const data = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(data);
  } else {
    return { tasks: [], status: 'pending' };
  }
}

export function saveManifest(manifest: Manifest): void {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}
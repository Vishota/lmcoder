// ---------------------------
// src/utils.ts
// ---------------------------
import { Node } from 'unist';

export interface ModuleDesc { name: string; interfacePrompt: string; }

export async function parseModulesFromMarkdown(md: string): Promise<ModuleDesc[]> {
  const { unified } = await import('unified');
  const markdown = (await import('remark-parse')).default;

  const tree = unified().use(markdown).parse(md) as Node;
  const modules: ModuleDesc[] = [];
  let current: ModuleDesc | null = null;
  function visit(node: any) {
    if (node.type === 'heading' && node.depth === 2) {
      if (current) modules.push(current);
      current = { name: node.children[0].value.trim(), interfacePrompt: '' };
    }
    if (node.type === 'code' && current) {
      current.interfacePrompt += node.value + '\n';
    }
    if (node.children) node.children.forEach(visit);
  }
  visit(tree);
  if (current) modules.push(current);
  return modules;
}

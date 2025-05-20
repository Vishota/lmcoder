export async function parseModulesFromMarkdown(md) {
    const { unified } = await import('unified');
    const markdown = (await import('remark-parse')).default;
    const tree = unified().use(markdown).parse(md);
    const modules = [];
    let current = null;
    function visit(node) {
        if (node.type === 'heading' && node.depth === 2) {
            if (current)
                modules.push(current);
            current = { name: node.children[0].value.trim(), interfacePrompt: '' };
        }
        if (node.type === 'code' && current) {
            current.interfacePrompt += node.value + '\n';
        }
        if (node.children)
            node.children.forEach(visit);
    }
    visit(tree);
    if (current)
        modules.push(current);
    return modules;
}

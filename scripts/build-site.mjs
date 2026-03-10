import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcPagesDir = path.join(rootDir, 'src', 'pages');
const outDir = path.join(rootDir, '_site');
const includeDir = path.join(rootDir, '_includes');

const header = await fs.readFile(path.join(includeDir, 'header.html'), 'utf8');
const footer = await fs.readFile(path.join(includeDir, 'footer.html'), 'utf8');

function stripFrontMatter(content) {
  return content.replace(/^---\s*\n---\s*\n/, '');
}

function resolveRelativeUrl(match, targetPath) {
  return `.${targetPath}`;
}

function renderPage(content) {
  return stripFrontMatter(content)
    .replace(/{%\s*include\s+header\.html\s*%}/g, header)
    .replace(/{%\s*include\s+footer\.html\s*%}/g, footer)
    .replace(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*relative_url\s*\}\}/g, resolveRelativeUrl)
    .replace(/{%\s*comment\s*%}[\s\S]*?{%\s*endcomment\s*%}/g, '')
    .trimStart();
}

async function build() {
  const entries = await fs.readdir(srcPagesDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => entry.name);

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  await fs.cp(path.join(rootDir, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  await fs.copyFile(path.join(rootDir, 'CNAME'), path.join(outDir, 'CNAME'));

  for (const fileName of htmlFiles) {
    const source = await fs.readFile(path.join(srcPagesDir, fileName), 'utf8');
    const rendered = renderPage(source);
    await fs.writeFile(path.join(rootDir, fileName), rendered);
    await fs.writeFile(path.join(outDir, fileName), rendered);
  }
}

await build();

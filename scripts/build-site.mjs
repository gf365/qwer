import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcPagesDir = path.join(rootDir, 'src', 'pages');
const dataDir = path.join(rootDir, 'src', 'data');
const outDir = path.join(rootDir, '_site');
const includeDir = path.join(rootDir, '_includes');
const rootAppsDir = path.join(rootDir, 'apps');
const outAppsDir = path.join(outDir, 'apps');

const header = await fs.readFile(path.join(includeDir, 'header.html'), 'utf8');
const footer = await fs.readFile(path.join(includeDir, 'footer.html'), 'utf8');
const apps = JSON.parse(await fs.readFile(path.join(dataDir, 'apps.json'), 'utf8'));

validateApps(apps);

function validateApps(items) {
  if (!Array.isArray(items)) {
    throw new Error('src/data/apps.json must contain an array.');
  }

  const seenSlugs = new Set();
  for (const app of items) {
    const requiredFields = [
      'slug',
      'title',
      'category',
      'status',
      'year',
      'tagline',
      'summary',
      'problem',
      'audience',
      'outcome',
      'cover',
      'coverAlt'
    ];

    for (const field of requiredFields) {
      if (!app[field]) {
        throw new Error(`App "${app.slug || 'unknown'}" is missing required field "${field}".`);
      }
    }

    if (seenSlugs.has(app.slug)) {
      throw new Error(`Duplicate app slug detected: ${app.slug}`);
    }

    seenSlugs.add(app.slug);
  }
}

function stripFrontMatter(content) {
  return content.replace(/^---\s*\n---\s*\n/, '');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRelativeUrl(targetPath, basePrefix) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(targetPath) || targetPath.startsWith('#')) {
    return targetPath;
  }

  const normalized = targetPath.replace(/^\/+/, '');
  return `${basePrefix}${normalized}`;
}

function replacePlaceholders(content, replacements) {
  let rendered = content;
  for (const [key, value] of Object.entries(replacements)) {
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
    rendered = rendered.replace(pattern, value);
  }
  return rendered;
}

function renderPage(content, { basePrefix = './', replacements = {} } = {}) {
  const rendered = stripFrontMatter(content)
    .replace(/{%\s*include\s+header\.html\s*%}/g, header)
    .replace(/{%\s*include\s+footer\.html\s*%}/g, footer)
    .replace(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*relative_url\s*\}\}/g, (_, targetPath) =>
      toRelativeUrl(targetPath, basePrefix)
    )
    .replace(/{%\s*comment\s*%}[\s\S]*?{%\s*endcomment\s*%}/g, '');

  return replacePlaceholders(rendered, replacements).trimStart();
}

function uniqueCategories(items) {
  return [...new Set(items.map(app => app.category))];
}

function renderCategoryBadges(items) {
  return uniqueCategories(items)
    .map(category => `<span class="badge">${escapeHtml(category)}</span>`)
    .join('\n');
}

function renderHighlightPills(items) {
  return items
    .slice(0, 3)
    .map(item => `<span class="pill">${escapeHtml(item)}</span>`)
    .join('\n');
}

function renderAppCard(app, basePrefix) {
  const detailHref = toRelativeUrl(`/apps/${app.slug}.html`, basePrefix);
  const coverHref = toRelativeUrl(app.cover, basePrefix);
  const highlights = renderHighlightPills(app.highlights || []);

  return `
    <article class="app-card">
      <a class="app-card__link" href="${escapeHtml(detailHref)}" aria-label="${escapeHtml(app.title)} のショーケース詳細を見る">
        <div class="app-card__media">
          <img src="${escapeHtml(coverHref)}" alt="${escapeHtml(app.coverAlt)}" loading="lazy" />
        </div>
        <div class="app-card__body">
          <div class="app-card__meta">
            <span class="pill">${escapeHtml(app.category)}</span>
            <span class="app-card__status">${escapeHtml(app.status)}</span>
          </div>
          <h3 class="app-card__title">${escapeHtml(app.title)}</h3>
          <p class="app-card__tagline">${escapeHtml(app.tagline)}</p>
          <p class="app-card__summary">${escapeHtml(app.summary)}</p>
          <div class="app-card__pills">
            ${highlights}
          </div>
          <div class="app-card__footer">ショーケースを見る</div>
        </div>
      </a>
    </article>
  `.trim();
}

function renderFeaturedApps(items, basePrefix) {
  const featuredApps = items.filter(app => app.featured);
  const source = featuredApps.length > 0 ? featuredApps : items.slice(0, 3);
  return source.map(app => renderAppCard(app, basePrefix)).join('\n');
}

function renderAppCatalog(items, basePrefix) {
  return items.map(app => renderAppCard(app, basePrefix)).join('\n');
}

function renderSearchableFiles(items) {
  const pages = [
    './index.html',
    './explore.html',
    './discover.html',
    './about.html',
    './contact.html',
    './join.html',
    './privacy.html',
    './terms.html'
  ];

  const appPages = items.map(app => `./apps/${app.slug}.html`);
  return JSON.stringify([...pages, ...appPages], null, 10);
}

function renderLinkButtons(app, basePrefix) {
  const links = app.links?.length
    ? app.links
    : [
        { label: 'プロジェクト相談へ', href: '/join.html' },
        { label: 'お問い合わせ', href: '/contact.html' }
      ];

  return links
    .map((link, index) => {
      const href = toRelativeUrl(link.href, basePrefix);
      const variant = index === 0 ? 'button-primary' : 'button-secondary';
      const isExternal = /^[a-z][a-z0-9+.-]*:/i.test(link.href);
      const externalAttrs = isExternal ? ' target="_blank" rel="noreferrer"' : '';
      return `<a class="${variant}" href="${escapeHtml(href)}"${externalAttrs}>${escapeHtml(link.label)}</a>`;
    })
    .join('\n');
}

function renderUseCaseCards(app) {
  return (app.useCases || [])
    .map(
      useCase => `
        <article class="surface-card">
          <h3>${escapeHtml(useCase.title)}</h3>
          <p>${escapeHtml(useCase.description)}</p>
        </article>
      `.trim()
    )
    .join('\n');
}

function renderGallery(app, basePrefix) {
  return (app.gallery || [])
    .map(
      item => `
        <figure class="app-gallery__item">
          <img src="${escapeHtml(toRelativeUrl(item.src, basePrefix))}" alt="${escapeHtml(item.alt)}" loading="lazy" />
          <figcaption class="app-gallery__caption">${escapeHtml(item.caption)}</figcaption>
        </figure>
      `.trim()
    )
    .join('\n');
}

function renderStackBadges(app) {
  return (app.stack || [])
    .map(item => `<span class="badge">${escapeHtml(item)}</span>`)
    .join('\n');
}

function renderHighlights(app) {
  return (app.highlights || [])
    .map(item => `<li>${escapeHtml(item)}</li>`)
    .join('\n');
}

function renderAppDetailPage(app) {
  const template = `---
---
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin />
    <link
      rel="stylesheet"
      as="style"
      onload="this.rel='stylesheet'"
      href="https://fonts.googleapis.com/css2?display=swap&amp;family=Noto+Sans%3Awght%40400%3B500%3B700%3B900&amp;family=Space+Grotesk%3Awght%40400%3B500%3B700"
    />
    <title>${escapeHtml(app.title)} - QWER TOKYO</title>
    <meta name="description" content="${escapeHtml(app.summary)}" />
    <link rel="icon" type="image/x-icon" href="data:image/x-icon;base64," />
    <link rel="stylesheet" href="{{ '/assets/css/site.css' | relative_url }}" />
  </head>
  <body>
    <div class="page-shell">
      <div class="layout-container">
        {% include header.html %}
        <main class="page-main">
          <div class="page-content">
            <section class="split-panel app-hero">
              <article class="surface-card section-stack app-hero__copy">
                <div class="app-meta-line">
                  <span class="pill">${escapeHtml(app.category)}</span>
                  <span class="app-card__status">${escapeHtml(app.status)}</span>
                  <span class="badge">${escapeHtml(app.year)}</span>
                </div>
                <p class="section-eyebrow">Showcase Detail</p>
                <h1 class="section-heading">${escapeHtml(app.title)}</h1>
                <p class="app-card__tagline">${escapeHtml(app.tagline)}</p>
                <p class="section-text">${escapeHtml(app.summary)}</p>
                <div class="button-row">
                  ${renderLinkButtons(app, '../')}
                </div>
              </article>
              <article class="surface-card app-hero__media">
                <img src="${escapeHtml(toRelativeUrl(app.cover, '../'))}" alt="${escapeHtml(app.coverAlt)}" loading="eager" />
              </article>
            </section>

            <section class="surface-card section-stack">
              <p class="section-eyebrow">Overview</p>
              <h2 class="section-heading">このアプリで解決したいこと</h2>
              <div class="surface-grid">
                <article class="surface-card">
                  <h3>Problem</h3>
                  <p>${escapeHtml(app.problem)}</p>
                </article>
                <article class="surface-card">
                  <h3>Audience</h3>
                  <p>${escapeHtml(app.audience)}</p>
                </article>
                <article class="surface-card">
                  <h3>Outcome</h3>
                  <p>${escapeHtml(app.outcome)}</p>
                </article>
              </div>
            </section>

            <section class="surface-card section-stack">
              <p class="section-eyebrow">Highlights</p>
              <h2 class="section-heading">見せたい価値と技術の要点</h2>
              <ul class="app-highlight-list">
                ${renderHighlights(app)}
              </ul>
              <div class="badge-list">
                ${renderStackBadges(app)}
              </div>
            </section>

            <section class="surface-card section-stack">
              <p class="section-eyebrow">Use Cases</p>
              <h2 class="section-heading">使われる場面</h2>
              <div class="surface-grid">
                ${renderUseCaseCards(app)}
              </div>
            </section>

            <section class="surface-card section-stack">
              <p class="section-eyebrow">Gallery</p>
              <h2 class="section-heading">画面とビジュアル</h2>
              <div class="app-gallery">
                ${renderGallery(app, '../')}
              </div>
            </section>

            <section class="cta-band section-stack">
              <p class="section-eyebrow">Discuss</p>
              <h2 class="section-heading">${escapeHtml(app.title)} の方向性で相談する</h2>
              <p class="section-text">
                近いテーマの新規アプリ、既存サービス改善、デモ制作の相談を受け付けています。要件が固まり切っていなくても、課題の輪郭があれば整理できます。
              </p>
              <div class="button-row">
                ${renderLinkButtons(app, '../')}
              </div>
            </section>
          </div>
        </main>
        {% include footer.html %}
      </div>
    </div>
  </body>
</html>
  `;

  return renderPage(template, { basePrefix: '../' });
}

function createPageReplacements(basePrefix) {
  return {
    app_count: String(apps.length),
    app_category_count: String(uniqueCategories(apps).length),
    app_category_badges: renderCategoryBadges(apps),
    featured_apps_grid: renderFeaturedApps(apps, basePrefix),
    apps_catalog_grid: renderAppCatalog(apps, basePrefix),
    searchable_files: renderSearchableFiles(apps)
  };
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

  await fs.rm(rootAppsDir, { recursive: true, force: true });
  await fs.mkdir(rootAppsDir, { recursive: true });
  await fs.mkdir(outAppsDir, { recursive: true });

  const replacements = createPageReplacements('./');

  for (const fileName of htmlFiles) {
    const source = await fs.readFile(path.join(srcPagesDir, fileName), 'utf8');
    const rendered = renderPage(source, { basePrefix: './', replacements });
    await fs.writeFile(path.join(rootDir, fileName), rendered);
    await fs.writeFile(path.join(outDir, fileName), rendered);
  }

  for (const app of apps) {
    const rendered = renderAppDetailPage(app);
    await fs.writeFile(path.join(rootAppsDir, `${app.slug}.html`), rendered);
    await fs.writeFile(path.join(outAppsDir, `${app.slug}.html`), rendered);
  }
}

await build();

export type BlockType =
  | 'hero_text'
  | 'article'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer';

export type Alignment = 'left' | 'center' | 'right';
export type ArticleLayout = 'stack' | '2-col' | '3-col' | '2x2';

export interface NewsletterBlock {
  id: string;
  type: BlockType;
  // Shared
  alignment?: Alignment;
  // hero_text
  headline?: string;
  subheadline?: string;
  introText?: string;
  // article
  articleId?: string;
  articleTitle?: string;
  articleExcerpt?: string;
  articleImageUrl?: string;
  articleSlug?: string;
  articleSection?: string;
  // text
  textTitle?: string;
  textBody?: string;
  // image
  imageUrl?: string;
  imageLink?: string;
  imageAlt?: string;
  // button
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  // spacer
  spacerHeight?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_URL = 'https://www.springford.press';
const TOS_URL = 'https://www.springford.press/terms-of-service';
const PRIVACY_URL = 'https://www.springford.press/privacy-policy';
const CONTACT_URL = 'https://www.springford.press/contact';
const FONTS_LINK =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Newsreader:ital,wght@0,400;0,600;0,700;1,400&family=Red+Hat+Display:wght@400;500;600;700&display=swap';

const BLUE   = '#2b8aa8';
const DARK   = '#1a1a1a';
const MEDIUM = '#555555';
const LIGHT_BG = '#f0f2f4';
const BORDER = '#e0e3e8';
const WHITE  = '#ffffff';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nl2br(str: string): string {
  return esc(str).replace(/\n/g, '<br>');
}

function align(a?: Alignment): string {
  return a === 'center' ? 'center' : a === 'right' ? 'right' : 'left';
}

// ─── Fixed blocks ────────────────────────────────────────────────────────────

function renderHeader(): string {
  return `
  <tr>
    <td align="center" style="padding: 28px 24px 20px; background-color: ${WHITE}; border-bottom: 3px solid ${BLUE};">
      <a href="${SITE_URL}" style="text-decoration: none;">
        <div class="sfp-site-name" style="font-family: 'Playfair Display', Didot, 'Bodoni MT', Georgia, serif; font-size: 30px; font-weight: 700; color: ${DARK}; letter-spacing: -0.02em; line-height: 1.1;">
          Spring-Ford Press
        </div>
        <div style="font-family: 'Red Hat Display', -apple-system, sans-serif; font-size: 11px; font-weight: 500; color: ${MEDIUM}; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 5px;">
          Neighborhood-First Reporting
        </div>
      </a>
    </td>
  </tr>`;
}

function renderFooter(unsubscribeUrl?: string): string {
  return `
  <tr>
    <td style="padding: 28px 32px 24px; background-color: ${DARK}; border-top: 3px solid ${BLUE};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="padding-bottom: 14px;">
            <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: ${WHITE}; letter-spacing: -0.01em;">
              Spring-Ford Press
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0"><tr>
              <td style="padding: 0 8px;"><a href="${SITE_URL}" style="font-family: 'Red Hat Display', sans-serif; font-size: 12px; color: #aaaaaa; text-decoration: none;">springford.press</a></td>
              <td style="color: #555; font-size: 12px;">|</td>
              <td style="padding: 0 8px;"><a href="${TOS_URL}" style="font-family: 'Red Hat Display', sans-serif; font-size: 12px; color: #aaaaaa; text-decoration: none;">Terms</a></td>
              <td style="color: #555; font-size: 12px;">|</td>
              <td style="padding: 0 8px;"><a href="${PRIVACY_URL}" style="font-family: 'Red Hat Display', sans-serif; font-size: 12px; color: #aaaaaa; text-decoration: none;">Privacy</a></td>
              <td style="color: #555; font-size: 12px;">|</td>
              <td style="padding: 0 8px;"><a href="${CONTACT_URL}" style="font-family: 'Red Hat Display', sans-serif; font-size: 12px; color: #aaaaaa; text-decoration: none;">Contact</a></td>
              ${unsubscribeUrl ? `
              <td style="color: #555; font-size: 12px;">|</td>
              <td style="padding: 0 8px;"><a href="${esc(unsubscribeUrl)}" style="font-family: 'Red Hat Display', sans-serif; font-size: 12px; color: #aaaaaa; text-decoration: none;">Unsubscribe</a></td>` : ''}
            </tr></table>
          </td>
        </tr>
        <tr>
          <td align="center">
            <p style="margin: 0; font-family: 'Red Hat Display', sans-serif; font-size: 11px; color: #666666;">
              &copy; ${new Date().getFullYear()} Spring-Ford Press. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── Content blocks ───────────────────────────────────────────────────────────

function renderHeroText(block: NewsletterBlock): string {
  const a = align(block.alignment);
  return `
  <tr>
    <td class="sfp-hero-pad" style="padding: 40px 40px 32px; background-color: ${WHITE}; text-align: ${a};">
      ${block.headline ? `
      <h1 class="sfp-h1" style="margin: 0 0 12px; font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 700; color: ${DARK}; line-height: 1.2; letter-spacing: -0.02em; text-align: ${a};">
        ${nl2br(block.headline)}
      </h1>` : ''}
      ${block.subheadline ? `
      <h2 class="sfp-subh2" style="margin: 0 0 16px; font-family: 'Newsreader', Georgia, serif; font-size: 20px; font-weight: 400; font-style: italic; color: ${MEDIUM}; line-height: 1.4; letter-spacing: -0.01em; text-align: ${a};">
        ${nl2br(block.subheadline)}
      </h2>` : ''}
      ${block.introText ? `
      <p style="margin: 0; font-family: 'Red Hat Display', sans-serif; font-size: 16px; line-height: 1.7; color: #333333; text-align: ${a};">
        ${nl2br(block.introText)}
      </p>` : ''}
    </td>
  </tr>
  <tr><td style="padding: 0 40px;"><div style="height: 1px; background-color: ${BORDER};"></div></td></tr>`;
}

/** Render text body: if it contains HTML tags, output as-is; otherwise escape and convert newlines. */
function renderBodyHtml(text: string | undefined | null): string {
  if (!text) return '';
  return /<[a-z][\s\S]*>/i.test(text) ? text : nl2br(text);
}

function renderText(block: NewsletterBlock): string {
  const a = align(block.alignment);
  return `
  <tr>
    <td class="sfp-text-pad" style="padding: 28px 40px; background-color: ${WHITE}; text-align: ${a};">
      ${block.textTitle ? `
      <h3 class="sfp-text-h3" style="margin: 0 0 12px; font-family: 'Newsreader', Georgia, serif; font-size: 22px; font-weight: 700; color: ${DARK}; letter-spacing: -0.01em; line-height: 1.3; text-align: ${a};">
        ${esc(block.textTitle)}
      </h3>` : ''}
      ${block.textBody ? `
      <div style="margin: 0; font-family: 'Red Hat Display', sans-serif; font-size: 15px; line-height: 1.75; color: #333333; text-align: ${a};">
        ${renderBodyHtml(block.textBody)}
      </div>` : ''}
    </td>
  </tr>`;
}

function renderImage(block: NewsletterBlock): string {
  if (!block.imageUrl) return '';
  const img = `<img src="${esc(block.imageUrl)}" alt="${esc(block.imageAlt || '')}" width="600"
    style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />`;
  return `
  <tr>
    <td style="padding: 0; line-height: 0; background-color: ${WHITE};">
      ${block.imageLink ? `<a href="${esc(block.imageLink)}" style="display: block;">${img}</a>` : img}
    </td>
  </tr>`;
}

function renderButton(block: NewsletterBlock): string {
  const bg = block.buttonColor || BLUE;
  const a = align(block.alignment || 'center');
  return `
  <tr>
    <td align="${a}" style="padding: 24px 40px; background-color: ${WHITE};">
      <a href="${esc(block.buttonLink || SITE_URL)}"
        style="display: inline-block; padding: 14px 36px; background-color: ${esc(bg)}; color: ${WHITE}; font-family: 'Red Hat Display', sans-serif; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.03em; border-radius: 5px;">
        ${esc(block.buttonText || 'Read More')}
      </a>
    </td>
  </tr>`;
}

function renderDivider(): string {
  return `
  <tr><td style="padding: 8px 40px; background-color: ${WHITE};">
    <div style="height: 1px; background-color: ${BORDER};"></div>
  </td></tr>`;
}

function renderSpacer(block: NewsletterBlock): string {
  const h = block.spacerHeight || 24;
  return `
  <tr><td style="height: ${h}px; line-height: ${h}px; font-size: ${h}px; background-color: ${WHITE};">&nbsp;</td></tr>`;
}

// ─── Article rendering ────────────────────────────────────────────────────────

/** Full-width stacked article (current default) */
function renderArticleFull(block: NewsletterBlock): string {
  const articleUrl = block.articleSlug ? `${SITE_URL}/article/${block.articleSlug}` : SITE_URL;
  const sectionLabel = block.articleSection && block.articleSection !== 'hero'
    ? block.articleSection.replace(/-/g, ' ').toUpperCase()
    : 'NEWS';
  return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${block.articleImageUrl ? `
        <tr><td style="padding: 0; line-height: 0;">
          <a href="${esc(articleUrl)}" style="display: block;">
            <img src="${esc(block.articleImageUrl)}" alt="${esc(block.articleTitle)}" width="600"
              style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
          </a>
        </td></tr>` : ''}
        <tr><td class="sfp-art-pad" style="padding: 24px 40px 28px;">
          <div style="font-family: 'Red Hat Display', sans-serif; font-size: 11px; font-weight: 700; color: ${BLUE}; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
            ${esc(sectionLabel)}
          </div>
          <h2 class="sfp-article-h2" style="margin: 0 0 10px; font-family: 'Newsreader', Georgia, serif; font-size: 24px; font-weight: 700; line-height: 1.25; letter-spacing: -0.01em; color: ${DARK}; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
            <a href="${esc(articleUrl)}" style="color: ${DARK}; text-decoration: none;">${esc(block.articleTitle)}</a>
          </h2>
          ${block.articleExcerpt ? `
          <p style="margin: 0 0 18px; font-family: 'Red Hat Display', sans-serif; font-size: 15px; line-height: 1.65; color: #444444;">
            ${esc(block.articleExcerpt)}
          </p>` : ''}
          <a href="${esc(articleUrl)}"
            style="display: inline-block; padding: 10px 22px; background-color: ${BLUE}; color: ${WHITE}; font-family: 'Red Hat Display', sans-serif; font-size: 13px; font-weight: 600; text-decoration: none; letter-spacing: 0.02em; border-radius: 4px;">
            Read More &rarr;
          </a>
        </td></tr>
        <tr><td style="padding: 0 40px;"><div style="height: 1px; background-color: ${BORDER};"></div></td></tr>
      </table>`;
}

/**
 * Compact article card for grid cells.
 * Fixed structure: image (160px tall) → section label → title (capped at 4 lines) → Read button.
 * Uses webkit-line-clamp for iOS Mail and fixed max-height as fallback for other clients.
 */
function renderArticleCard(block: NewsletterBlock): string {
  const articleUrl = block.articleSlug ? `${SITE_URL}/article/${block.articleSlug}` : SITE_URL;
  const sectionLabel = block.articleSection && block.articleSection !== 'hero'
    ? block.articleSection.replace(/-/g, ' ').toUpperCase()
    : 'NEWS';

  const IMG_HEIGHT = '160px';
  // 4 lines × 17px font × 1.3 line-height ≈ 88px. Enforce via webkit-line-clamp (iOS Mail) + max-height fallback.
  const TITLE_MAX  = '89px';

  return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
        style="border: 1px solid ${BORDER}; border-radius: 4px; overflow: hidden;">
        <!-- Fixed-height image: height attribute enforces it in Outlook; CSS for WebKit/Gmail -->
        <tr><td height="160" style="padding: 0; line-height: 0; height: ${IMG_HEIGHT}; max-height: ${IMG_HEIGHT}; overflow: hidden; background-color: #e8eaed; font-size: 0;">
          ${block.articleImageUrl
            ? `<a href="${esc(articleUrl)}" style="display: block; line-height: 0;">
                <img src="${esc(block.articleImageUrl)}" alt="${esc(block.articleTitle)}" width="260" height="160"
                  style="width: 100%; height: ${IMG_HEIGHT}; max-height: ${IMG_HEIGHT}; display: block; border: 0; object-fit: cover;" />
               </a>`
            : `<div style="height: ${IMG_HEIGHT}; background-color: #e8eaed;">&nbsp;</div>`}
        </td></tr>
        <!-- Section label — always same position -->
        <tr><td style="padding: 14px 16px 0; line-height: 1;">
          <div style="font-family: 'Red Hat Display', sans-serif; font-size: 10px; font-weight: 700; color: ${BLUE}; letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${esc(sectionLabel)}
          </div>
        </td></tr>
        <!-- Title — webkit-line-clamp for iOS Mail; max-height + overflow:hidden as universal fallback -->
        <tr><td style="padding: 6px 16px 0; overflow: hidden; max-height: ${TITLE_MAX};">
          <h3 class="sfp-card-h3" style="margin: 0; font-family: 'Newsreader', Georgia, serif; font-size: 17px; font-weight: 700; line-height: 1.3; color: ${DARK}; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; max-height: ${TITLE_MAX};">
            <a href="${esc(articleUrl)}" style="color: ${DARK}; text-decoration: none;">${esc(block.articleTitle)}</a>
          </h3>
        </td></tr>
        <!-- Read button — always at the bottom of the card content -->
        <tr><td style="padding: 12px 16px 18px;">
          <a href="${esc(articleUrl)}"
            style="display: inline-block; padding: 7px 16px; background-color: ${BLUE}; color: ${WHITE}; font-family: 'Red Hat Display', sans-serif; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 3px;">
            Read &rarr;
          </a>
        </td></tr>
      </table>`;
}

/** Render a group of article blocks according to layout */
function renderArticleGroup(articles: NewsletterBlock[], layout: ArticleLayout): string {
  if (articles.length === 0) return '';

  // Stack: render each as full-width
  if (layout === 'stack' || articles.length === 1) {
    return `<tr><td style="background-color: ${WHITE};">${articles.map(renderArticleFull).join('')}</td></tr>`;
  }

  // Determine columns
  const cols = layout === '3-col' ? 3 : 2;
  const rows: NewsletterBlock[][] = [];
  for (let i = 0; i < articles.length; i += cols) {
    rows.push(articles.slice(i, i + cols));
  }

  const gutter = 12; // px between columns

  const renderedRows = rows.map((rowArticles) => {
    const colWidth = Math.floor((600 - 80 - gutter * (cols - 1)) / cols); // account for outer padding
    const cells = rowArticles.map((a, idx) => {
      const paddingRight = idx < rowArticles.length - 1 ? `padding-right: ${gutter}px;` : '';
      return `<td width="${colWidth}" valign="top" style="${paddingRight} width: ${colWidth}px;">${renderArticleCard(a)}</td>`;
    });

    // If last row has fewer items than cols, add empty cells to balance
    while (cells.length < cols) {
      cells.push(`<td width="${colWidth}" valign="top" style="width: ${colWidth}px;"></td>`);
    }

    return `
    <tr><td style="padding: 20px 40px 0; background-color: ${WHITE};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>${cells.join('')}</tr>
      </table>
    </td></tr>`;
  }).join('');

  return `${renderedRows}
  <tr><td style="padding: 20px 40px 0; background-color: ${WHITE};">
    <div style="height: 1px; background-color: ${BORDER};"></div>
  </td></tr>
  <tr><td style="height: 8px; background-color: ${WHITE};">&nbsp;</td></tr>`;
}

// ─── Main renderer ────────────────────────────────────────────────────────────

function renderBlocks(blocks: NewsletterBlock[], articleLayout: ArticleLayout): string {
  const rows: string[] = [];
  let articleBuffer: NewsletterBlock[] = [];

  function flushArticles() {
    if (articleBuffer.length === 0) return;
    rows.push(renderArticleGroup(articleBuffer, articleLayout));
    articleBuffer = [];
  }

  for (const block of blocks) {
    if (block.type === 'article') {
      articleBuffer.push(block);
    } else {
      flushArticles();
      switch (block.type) {
        case 'hero_text': rows.push(renderHeroText(block)); break;
        case 'text':      rows.push(renderText(block)); break;
        case 'image':     rows.push(renderImage(block)); break;
        case 'button':    rows.push(renderButton(block)); break;
        case 'divider':   rows.push(renderDivider()); break;
        case 'spacer':    rows.push(renderSpacer(block)); break;
      }
    }
  }
  flushArticles();
  return rows.join('');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildEmailHtml(
  blocks: NewsletterBlock[],
  subject: string,
  previewText?: string,
  unsubscribeUrl?: string,
  articleLayout: ArticleLayout = 'stack',
): string {
  const bodyRows = renderBlocks(blocks, articleLayout);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${esc(subject)}</title>
  <link href="${FONTS_LINK}" rel="stylesheet">
  <style>
    /* ── Mobile responsive font sizes ── */
    @media only screen and (max-width: 480px) {
      .sfp-site-name  { font-size: 22px !important; }
      .sfp-h1         { font-size: 22px !important; line-height: 1.3 !important; }
      .sfp-subh2      { font-size: 15px !important; }
      .sfp-article-h2 {
        font-size: 18px !important;
        overflow: hidden !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 3 !important;
        -webkit-box-orient: vertical !important;
      }
      .sfp-text-h3    { font-size: 17px !important; }
      .sfp-card-h3    { font-size: 14px !important; max-height: 73px !important; }
      .sfp-hero-pad   { padding: 24px 20px 20px !important; }
      .sfp-text-pad   { padding: 20px 20px !important; }
      .sfp-art-pad    { padding: 16px 20px 20px !important; }
      .sfp-outer-pad  { padding: 16px 8px 28px !important; }
    }
  </style>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; word-spacing: normal; background-color: ${LIGHT_BG};">
  ${previewText ? `
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${esc(previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${LIGHT_BG};">
    <tr>
      <td class="sfp-outer-pad" align="center" style="padding: 24px 16px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width: 600px; background-color: ${WHITE}; border: 1px solid ${BORDER}; border-radius: 4px; overflow: hidden;">
          ${renderHeader()}
          ${bodyRows}
          ${renderFooter(unsubscribeUrl)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

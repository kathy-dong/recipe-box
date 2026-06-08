import styles from "./page.module.css";

const appTitle = process.env.NEXT_PUBLIC_APP_TITLE ?? "Sam & Kathy's Recipes";

export const metadata = { title: `Add Recipes Anywhere — ${appTitle}` };

export default function SharePage() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const key = process.env.QUICK_ADD_KEY ?? "YOUR_KEY_HERE";
  const apiUrl = `${siteUrl}/api/quick-add`;

  const bookmarkletJs = [
    "(function(){",
    `fetch(${JSON.stringify(apiUrl)},{`,
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    `body:JSON.stringify({url:location.href,key:${JSON.stringify(key)}})`,
    "})",
    ".then(function(r){return r.json()})",
    ".then(function(d){alert(d.message||'Saved!')})",
    ".catch(function(){alert('Error — check your connection and try again')})",
    "})();",
  ].join("");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.back}>← Back to recipes</a>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Add recipes from anywhere</h1>
        <p className={styles.lead}>
          Save recipes to {appTitle} without opening the app — straight from Safari, Chrome, or any app on your phone or computer.
        </p>

        {/* iOS Shortcut */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>From your phone</h2>
          <p className={styles.sectionSub}>
            Share any recipe link directly to the recipe box from Safari, Instagram, YouTube, or any app.
          </p>

          <ol className={styles.steps}>
            <li>Open the <strong>Shortcuts</strong> app on your iPhone and tap <strong>+</strong> in the top right to create a new Shortcut.</li>
            <li>Tap <strong>"Search Actions"</strong> at the bottom. Type <em>URL</em> and tap <strong>"Get Contents of URL"</strong>.</li>
            <li>Tap the blue URL text in the action and paste this URL:
              <div className={styles.codeBlock}>
                <div className={styles.codeLine}><span className={styles.codeVal}>{apiUrl}</span></div>
              </div>
            </li>
            <li>
              Tap the <strong>arrow ›</strong> on the right side to expand the action and configure it:
              <div className={styles.codeBlock}>
                <div className={styles.codeLine}><span className={styles.codeKey}>Method</span> POST</div>
                <div className={styles.codeLine}><span className={styles.codeKey}>Request Body</span> JSON</div>
                <div className={styles.codeIndent}>
                  <div className={styles.codeLine}><span className={styles.codeKey}>url</span> tap <strong>Add New Field → Text</strong>, key = <code>url</code>, value = <em>Shortcut Input</em> variable</div>
                  <div className={styles.codeLine}><span className={styles.codeKey}>key</span> tap <strong>Add New Field → Text</strong>, key = <code>key</code>, value = <code>{key}</code></div>
                </div>
              </div>
              For the <code>url</code> value: tap the value field and select <strong>Shortcut Input</strong> from the variables that appear above the keyboard.
            </li>
            <li>Tap <strong>"Search Actions"</strong> again. Type <em>notification</em> and tap <strong>"Show Notification"</strong>. Clear any default text and type <em>Recipe saved! 🍳</em></li>
            <li>Tap the <strong>dropdown arrow ⌄</strong> at the top next to the shortcut name. Tap <strong>Rename</strong> and type <em>Save Recipe</em>.</li>
            <li>Tap the <strong>ⓘ button</strong> at the bottom center of the screen. Turn on <strong>"Show in Share Sheet"</strong> and set it to accept <em>URLs</em>. Tap Done.</li>
          </ol>

          <div className={styles.tip}>
            You&apos;re all set! Open Safari or any app, tap <strong>Share</strong> on any recipe page, and tap <strong>"Save Recipe"</strong>. Your recipe will appear in the box within seconds.
          </div>
        </section>

        {/* Desktop bookmarklet */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>From your computer</h2>
          <p className={styles.sectionSub}>
            Click a button in your bookmarks bar to save any recipe you&apos;re viewing.
          </p>

          <div className={styles.bookmarkletWrap}>
            <p className={styles.dragHint}>Drag this button to your bookmarks bar:</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href={`javascript:${bookmarkletJs}`}
              className={styles.bookmarklet}
              title="Drag me to your bookmarks bar"
            >
              📌 Save to Recipe Box
            </a>
            <p className={styles.dragNote}>
              (Don&apos;t click — drag it to your bookmarks bar. On Chrome: View → Always Show Bookmarks Bar first.)
            </p>
          </div>

          <ol className={styles.steps}>
            <li>Make sure your bookmarks bar is visible (Chrome: <strong>⌘⇧B</strong>, Safari: <strong>View → Show Favorites Bar</strong>).</li>
            <li>Drag the button above into your bookmarks bar.</li>
            <li>When you&apos;re on any recipe page, click it — you&apos;ll see an alert confirming it was saved.</li>
          </ol>
        </section>

        {/* Setup reminder */}
        <section className={`${styles.section} ${styles.setupNote}`}>
          <h2 className={styles.sectionTitleSmall}>Vercel environment variables</h2>
          <p>Make sure this is set in your Vercel project settings under <em>Settings → Environment Variables</em>:</p>
          <div className={styles.envBlock}>
            <div className={styles.envLine}>
              <span className={styles.envKey}>QUICK_ADD_KEY</span>
              <span className={styles.envVal}>your shared passphrase</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

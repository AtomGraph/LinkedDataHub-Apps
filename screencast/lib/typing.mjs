// Uniform keystroke delay is the tell that a recording was scripted. Real typing
// varies per character, slows at punctuation, and pauses before a commit.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const jitter = (base, spread) => base + (Math.random() * 2 - 1) * spread;

// Splits after punctuation so the pause lands where a person's would.
function segment(text) {
  return text.match(/[^.,;:?!\n]+[.,;:?!\n]*/g) ?? [text];
}

export function makeTyper(page) {
  async function type(locator, text, { base = 110, spread = 35, afterPunctuation = 260 } = {}) {
    await locator.click();
    for (const seg of segment(text)) {
      await locator.pressSequentially(seg, { delay: jitter(base, spread) });
      if (/[.,;:?!\n]$/.test(seg)) await sleep(jitter(afterPunctuation, 80));
    }
  }

  // CodeMirror (the SPARQL editor) owns its own DOM and ignores value assignment,
  // so the only honest way in is real keystrokes. Its bracket auto-closing means
  // a typed "{" produces "{}", so queries are typed without their closing braces
  // and the caret is walked past them instead.
  async function typeCode(locator, text, { base = 55, spread = 20 } = {}) {
    await locator.click();
    for (const line of text.split('\n')) {
      await page.keyboard.type(line, { delay: jitter(base, spread) });
      await page.keyboard.press('Enter');
      await sleep(jitter(70, 30));
    }
  }

  return { type, typeCode };
}

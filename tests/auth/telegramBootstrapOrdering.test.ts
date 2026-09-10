import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Telegram Mini App SDK bootstrap', () => {
  it('loads the Telegram bridge before application hydration can inspect initData', () => {
    const layout = readFileSync('app/[locale]/layout.tsx', 'utf8');
    expect(layout).toContain(
      '<Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />',
    );
    expect(layout).not.toContain(
      '<Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />',
    );
  });
});

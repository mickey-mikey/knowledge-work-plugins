// Run with playwright-cli run-code --filename=productivity/tests/dashboard-theme.browser.js
// Open a test copy of the dashboard first; this resets only its theme preference.
async (page) => {
  const checks = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const selector = page.getByRole('combobox', { name: 'Theme', exact: true });
  const verifyTheme = async (theme) => {
    await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme);
    const colors = await page.evaluate(() => ({
      scheme: getComputedStyle(document.documentElement).colorScheme,
      background: getComputedStyle(document.body).backgroundColor,
    }));
    assert(colors.scheme === theme, 'Native controls use the selected color scheme');
    assert(colors.background === (theme === 'dark' ? 'rgb(24, 25, 24)' : 'rgb(250, 249, 245)'), 'Body uses the selected palette');
  };

  await page.evaluate(() => localStorage.removeItem('productivity-theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  assert(await selector.inputValue() === 'system', 'First visit defaults to System');
  await verifyTheme('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await verifyTheme('light');
  checks.push('System follows the device on load and live changes');

  await selector.selectOption('dark');
  await verifyTheme('dark');
  await page.reload();
  assert(await selector.inputValue() === 'dark', 'Dark choice survives reload');
  await verifyTheme('dark');
  await selector.selectOption('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await verifyTheme('light');
  await page.reload();
  assert(await selector.inputValue() === 'light', 'Light choice survives reload');
  await verifyTheme('light');
  checks.push('Both manual choices persist and override the device');

  await selector.selectOption('system');
  await verifyTheme('dark');
  await page.reload();
  assert(await selector.inputValue() === 'system', 'System choice survives reload');
  await verifyTheme('dark');
  await selector.focus();
  await selector.press('Home');
  await selector.press('ArrowDown');
  await selector.press('Enter');
  assert(await selector.inputValue() === 'light', 'Selector responds to the keyboard');
  await verifyTheme('light');
  checks.push('Returning to System and keyboard selection work');

  // Synthetic data only: no file handle is granted and no user file is opened.
  await page.evaluate(() => {
    const parsed = parseTaskMarkdown('# Tasks\n\n## Active\n- [ ] **Review a sample task** - A synthetic note\n\n## Done\n- [x] **A completed task** - Another synthetic note');
    sections = parsed.sections;
    tasks = parsed.tasks;
    renderTasks();
  });
  const before = await page.evaluate(() => toMarkdown());
  for (const mode of ['light', 'dark']) {
    await selector.selectOption(mode);
    await verifyTheme(mode);
    await page.getByRole('button', { name: 'List', exact: true }).click();
    assert(await page.locator('#listView').isVisible(), 'List view works');
    await page.getByRole('button', { name: 'Board', exact: true }).click();
    assert(await page.locator('.task-card').count() === 2, 'Board cards render');
    await page.getByRole('button', { name: 'Memory', exact: true }).click();
    assert(await page.locator('#memoryPanel').isVisible(), 'Memory view works');
    await page.evaluate(() => openEditModal('theme-test.md', 'memoryFile'));
    assert(await page.locator('#editContent').isVisible(), 'Modal input renders');
    const inputScheme = await page.locator('#editContent').evaluate(el => getComputedStyle(el).colorScheme);
    assert(inputScheme === mode, 'Modal input inherits the theme');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  }
  assert(await page.evaluate(() => toMarkdown()) === before, 'Appearance changes preserve task data');
  checks.push('Board, List, Memory and modal inputs work in both themes without changing task data');

  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const bounds = await selector.boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, `Theme selector remains reachable at ${width}px`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  checks.push('Header controls remain reachable at desktop, tablet and phone widths');

  const blocked = await page.context().newPage();
  try {
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    });
    await blocked.emulateMedia({ colorScheme: 'dark' });
    await blocked.goto(page.url());
    assert(await blocked.locator('html').getAttribute('data-theme') === 'dark', 'Blocked storage still permits System initialization');
    await blocked.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('light');
    assert(await blocked.locator('html').getAttribute('data-theme') === 'light', 'Blocked storage still permits manual selection');
    checks.push('Storage restrictions do not disable the dashboard');
  } finally {
    await blocked.close();
  }
  assert(errors.length === 0, `Unexpected page errors: ${errors.join('; ')}`);
  return { passed: checks.length, checks };
}

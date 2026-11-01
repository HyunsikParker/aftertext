from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'browser'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('AFTERTEXT_URL', 'http://127.0.0.1:4179/')
results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROME_PATH', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))
    context = browser.new_context(viewport={'width':1280,'height':1050}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    page.locator('#contents button').first.wait_for()
    page.locator('#offline-status').filter(has_text='App available offline').wait_for(timeout=15000)
    assert page.locator('#sample-label').is_visible()
    page.screenshot(path=str(OUT/'desktop-index.png'), full_page=True)
    page.locator('#contents button[data-page="201"]').click()
    assert page.locator('#grid').inner_text().find('book swap') >= 0
    page.locator('#reader-content').focus()
    page.keyboard.type('301')
    assert page.locator('#page-label').inner_text() == 'Page 301'
    page.keyboard.press('Home')
    assert page.locator('#page-label').inner_text() == 'Page 100'
    results.append('Desktop index, page buttons and physical numeric/Home keys')

    page.locator('#editor-mode').click()
    page.locator('#article-title').fill('A new local notice')
    body = 'Saved local content.\n\n한글 and café 👩‍👩‍👧‍👦.\n  Preserve two spaces.  '
    page.locator('#article-body').fill(body)
    page.locator('#article-source').fill('javascript:alert(1)')
    page.locator('button[type="submit"]').filter(has_text='Save bulletin').click()
    assert 'not been saved' in page.locator('#message').inner_text()
    page.locator('#article-source').fill('')
    page.locator('button[type="submit"]').filter(has_text='Save bulletin').click()
    assert 'Bulletin saved.' in page.locator('#message').inner_text()
    stored = page.evaluate("JSON.parse(localStorage.getItem('aftertext:bulletin:v1'))")
    assert stored['articles'][0]['body'] == body
    page.screenshot(path=str(OUT/'desktop-editor.png'), full_page=True)
    results.append('Editor validation, real save and exact Unicode/whitespace storage')

    with page.expect_download() as pending:
        page.locator('#export').click()
    download = pending.value
    download.save_as(OUT/'exported-bulletin.json')
    exported = json.loads((OUT/'exported-bulletin.json').read_text())
    assert exported == stored
    results.append('Actual exported download matches saved bulletin')

    fresh = browser.new_context(viewport={'width':1280,'height':1050}, accept_downloads=True)
    imported = fresh.new_page()
    imported.on('pageerror', lambda error: errors.append(str(error)))
    imported.goto(URL)
    imported.locator('#contents button').first.wait_for()
    imported.locator('#file').set_input_files(str(OUT/'exported-bulletin.json'))
    imported.locator('#message').filter(has_text='opened and saved').wait_for()
    assert imported.evaluate("JSON.parse(localStorage.getItem('aftertext:bulletin:v1')).articles[0].body") == body
    imported.locator('#offline-status').filter(has_text='App available offline').wait_for(timeout=15000)
    cached = imported.evaluate("""async () => {
      const names = await caches.keys();
      const urls = [];
      for (const name of names) for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
      return urls;
    }""")
    assert any(url.endswith('/src/validate.js') for url in cached), cached
    cdp = fresh.new_cdp_session(imported)
    cdp.send('Network.clearBrowserCache')
    cdp.send('Network.setCacheDisabled', {'cacheDisabled':True})
    fresh.set_offline(True)
    imported.reload(wait_until='domcontentloaded')
    imported.locator('#contents button[data-page="101"]').click()
    imported.locator('#text-mode').click()
    assert 'A new local notice' in imported.locator('#reading-text').inner_text()
    assert '한글' in imported.locator('#reading-text').inner_text()
    imported.screenshot(path=str(OUT/'offline-reading.png'), full_page=True)
    results.append('Fresh-context import and offline reload with HTTP cache cleared preserve edited bulletin; validator is in the service-worker cache')
    fresh.close()

    page.locator('#reader-mode').click()
    before_bad_import = page.evaluate("localStorage.getItem('aftertext:bulletin:v1')")
    page.locator('#file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"broken":true}'})
    page.locator('#message.error').wait_for()
    assert page.evaluate("localStorage.getItem('aftertext:bulletin:v1')") == before_bad_import
    results.append('Invalid import preserves the prior saved bulletin')

    mobile = browser.new_context(viewport={'width':375,'height':850}, is_mobile=True, device_scale_factor=1)
    m = mobile.new_page()
    m.on('pageerror', lambda error: errors.append(str(error)))
    m.goto(URL)
    m.locator('#reading-text').wait_for(state='visible')
    assert m.locator('#grid').is_hidden()
    assert m.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    m.locator('#contents button[data-page="201"]').click()
    assert 'book swap' in m.locator('#reading-text').inner_text()
    m.screenshot(path=str(OUT/'mobile-reading.png'), full_page=True)
    m.locator('#grid-mode').click()
    assert m.locator('#grid').is_visible()
    assert m.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    m.screenshot(path=str(OUT/'mobile-grid.png'), full_page=True)
    results.append('375px mobile reading default, explicit grid switch and no horizontal page overflow')
    mobile.close()
    assert not errors, errors
    context.close()
    browser.close()

(OUT/'BROWSER_RESULT.json').write_text(json.dumps({'passed':results,'page_errors':errors},indent=2)+'\n')
print(json.dumps({'passed':len(results),'checks':results,'page_errors':errors},indent=2))

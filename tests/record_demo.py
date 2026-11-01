"""Record real browser actions. Requires Python Playwright and its video runtime."""
from pathlib import Path
import json
import os
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'media'
OUT.mkdir(exist_ok=True)
BASE = os.environ.get('AFTERTEXT_URL', 'http://127.0.0.1:4179/')
CHROME = os.environ.get('CHROME_PATH', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
scenes = []
wrapper = '''<!doctype html><html lang="en"><body style="margin:0;background:#17202d">
<div style="height:980px;display:flex;justify-content:center"><iframe title="Aftertext live walkthrough" style="width:1440px;height:980px;border:0;background:#f1f3f6"></iframe></div>
<div id="caption" style="height:100px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:12px 90px;color:white;font:25px/1.4 Arial,sans-serif;text-align:center"></div>
</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=CHROME)
    context = browser.new_context(viewport={'width':1440,'height':1080},
        record_video_dir=str(OUT/'raw'),record_video_size={'width':1440,'height':1080},accept_downloads=True)
    page = context.new_page()
    page.route(BASE+'recording-wrapper.html', lambda route: route.fulfill(status=200,content_type='text/html',body=wrapper))
    page.goto(BASE+'recording-wrapper.html')
    page.locator('iframe').evaluate('(e, url) => e.src = url', BASE)
    frame = page.frame_locator('iframe')
    frame.locator('#contents button').first.wait_for()
    frame.locator('#offline-status').filter(has_text='App available offline').wait_for()
    started = time.monotonic()

    def scene(caption, seconds, action=None):
        if action:
            action()
        page.locator('#caption').evaluate('(e,t) => e.textContent=t', caption)
        start = time.monotonic()-started
        page.screenshot(path=str(OUT/f'scene-{len(scenes)+1:02}.png'))
        print(f'{len(scenes)+1}: {caption}', flush=True)
        page.wait_for_timeout(seconds*1000)
        scenes.append({'start':round(start,2),'end':round(time.monotonic()-started,2),'caption':caption})

    try:
        scene('Aftertext brings back teletext as a community bulletin you can edit, carry in a file and read offline.',8)
        scene('Give a notice a page number. Type 201 to open the book swap. All notices in this example are fictional.',8,
            lambda: (frame.locator('#reader-content').focus(), page.keyboard.type('201',delay=180)))
        scene('Reading view shows the full notice with ordinary text wrapping. It is also the default on a narrow phone.',8,
            lambda: frame.locator('#text-mode').click())
        scene('Edit the current bulletin and watch its page preview. Each notice keeps its original words and spacing.',9,
            lambda: (frame.locator('#editor-mode').click(),frame.locator('#editor-articles button').nth(1).click()))

        def edit():
            frame.locator('#article-title').fill('Book swap: bring a favourite')
            frame.locator('#article-body').fill('The book swap is now in the reading room.\n\nBring a book you would like someone else to find. Leave it on the blue shelf and choose a different one to take home.\n\nBooks in every language are welcome: 한글, 日本語, café.\n\nPlease keep the doorway clear. Large boxes can wait on the table by the window.\n\nThe next swap is Saturday, 10:00 to 12:00. This is a fictional notice for the demo.\n\nWant to leave a note inside your book? A few words about why you liked it are enough.\n\n  Original spaces stay in the exported file.  ')
            frame.locator('#article-body').blur()
            frame.locator('#preview-next').wait_for(state='visible')
            page.wait_for_timeout(250)
        scene('Long notices continue across subpages. The file preserves Unicode, newlines and spaces independently of the grid.',10,edit)
        scene('Turn the preview page to see the rest. Nothing is silently cut off to fit the screen.',7,
            lambda: frame.locator('#preview-next').click())
        scene('Save the bulletin on this device. The reader and exported file now use the edited notice.',8,
            lambda: (frame.get_by_role('button',name='Save bulletin',exact=True).click(),frame.locator('#reader-mode').click(),frame.locator('#grid-mode').click(),frame.locator('#contents button[data-page="201"]').click()))

        def export():
            with page.expect_download() as d:
                frame.locator('#export').click()
            d.value.save_as(OUT/'demo-bulletin.json')
        scene('Export downloads the whole bulletin as a small JSON file. The byte count is measured from that file.',8,export)

        def reopen():
            frame.locator('#file').set_input_files(str(OUT/'demo-bulletin.json'))
            frame.locator('#message').filter(has_text='opened and saved').wait_for()
            frame.locator('#contents button[data-page="201"]').click()
        scene('Open the exported file to restore the bulletin. The app does not upload it to a server.',8,reopen)

        def offline():
            cdp = context.new_cdp_session(page)
            cdp.send('Network.clearBrowserCache')
            cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
            context.set_offline(True)
            app_frame = next(f for f in page.frames if f.parent_frame is not None)
            app_frame.evaluate('location.reload()')
            frame.locator('#contents button[data-page="201"]').click()
            frame.locator('#text-mode').click()
            assert 'Book swap: bring a favourite' in frame.locator('#reading-text').inner_text()
        scene('Network disconnected, ordinary browser cache cleared, app reloaded. The saved bulletin still opens.',10,offline)

        def phone():
            page.locator('iframe').evaluate('(e) => e.style.width="390px"')
            app_frame = next(f for f in page.frames if f.parent_frame is not None)
            app_frame.evaluate('location.reload()')
            frame.locator('#reading-text').wait_for(state='visible')
            frame.locator('#contents button[data-page="201"]').click()
            frame.locator('#reader-content').scroll_into_view_if_needed()
        scene('At phone width, reading view opens automatically. The same saved file stays available offline.',9,phone)
        scene('Built with Kiro CLI for the specification and initial validator, plus Codex for implementation and tests. Source and Kiro records accompany the demo.',10)
    finally:
        video = page.video
        context.close()
        video.save_as(str(OUT/'aftertext-walkthrough.webm'))
        browser.close()
        (OUT/'scenes.json').write_text(json.dumps({'kind':'Actual browser interactions with captions outside the app iframe; fictional sample notices','scenes':scenes},indent=2)+'\n')
        (OUT/'TRANSCRIPT.md').write_text('# Aftertext walkthrough\n\nSilent screen recording with English captions.\n\n'+'\n\n'.join(f"{s['start']:.1f}–{s['end']:.1f} s: {s['caption']}" for s in scenes)+'\n')

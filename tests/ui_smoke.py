"""Optional browser checks. Requires Python Playwright and Chromium."""
import os
import re
import shutil
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('APP_URL', 'http://127.0.0.1:5173')
root = Path(__file__).resolve().parent.parent
static_demo = os.environ.get('STATIC_DEMO') == '1'
with sync_playwright() as p:
    chromium = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser = p.chromium.launch(**({'executable_path': chromium} if chromium else {}), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    api_requests = []
    page.on('request', lambda request: api_requests.append(request.url) if '/api/' in request.url else None)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base, wait_until='networkidle')
    expect(page.get_by_role('heading', name='Today’s dares')).to_be_visible()
    nav = page.get_by_role('navigation', name='Main navigation')
    nav.get_by_role('button', name='Profile', exact=True).click()
    page.get_by_role('button', name='Preferences', exact=True).click()
    expect(page.get_by_role('switch', name='Verified people only', exact=True)).to_have_attribute('aria-checked', 'true')
    nav.get_by_role('button', name='Dares', exact=True).click()
    print('PASS: daily dares and profile preferences')

    page.get_by_role('button', name='Try this dare').first.click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('button', name='Accept dare')).to_be_disabled()
    dialog.get_by_role('checkbox').check()
    dialog.get_by_role('button', name='Accept dare').click()
    expect(dialog.get_by_text('Waiting for mutual acceptance')).to_be_visible()
    dialog.get_by_role('button', name='Open sample chat').click()
    expect(page.get_by_role('heading', name='Chats')).to_be_visible()
    expect(page.get_by_text('You’re trying a sample chat.', exact=False)).to_be_visible()
    greeting = 'A browser-tested little hello!'
    page.get_by_role('textbox', name='Message', exact=True).fill(greeting)
    page.get_by_role('button', name='Send message', exact=True).click()
    expect(page.get_by_text(greeting, exact=True)).to_be_visible()
    page.get_by_role('button', name='We did it! Mark my dare complete').click()
    expect(page.get_by_text('This conversation is now read-only.', exact=False)).to_be_visible()
    print('PASS: explicit consent, sample acceptance, messaging, completion')

    nav.get_by_role('button', name='Feed', exact=True).click()
    page.get_by_role('button', name='Create a post', exact=True).click()
    caption = f'A little browser-tested moment {int(time.time())}'
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('textbox', name='Your post', exact=True).fill(caption)
    dialog.locator('input[type=file]').set_input_files(root / 'public/images/creative.jpg')
    expect(dialog.get_by_alt_text('Your selected photo preview')).to_be_visible()
    dialog.get_by_role('button', name='Share post', exact=True).click()
    expect(dialog).not_to_be_visible()
    nav.get_by_role('button', name='Profile', exact=True).click()
    expect(page.get_by_text(caption, exact=False)).to_be_visible()
    print('PASS: image upload and private profile post')

    page.get_by_role('button', name='Edit profile', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('textbox', name='Your name', exact=True).fill('Casey Demo')
    dialog.get_by_role('textbox', name='A little introduction', exact=True).fill('Testing a safer little social space.')
    dialog.get_by_role('button', name='Save changes').click()
    expect(page.get_by_role('heading', name=re.compile(r'^Casey Demo'))).to_be_visible()
    page.get_by_role('button', name='Preferences', exact=True).click()
    page.get_by_role('switch', name='Private account', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_text('Switching to a public account', exact=False)).to_be_visible()
    dialog.get_by_role('button', name='Make my profile public').click()
    expect(page.get_by_role('switch', name='Private account', exact=True)).to_have_attribute('aria-checked', 'false')
    page.reload(wait_until='networkidle')
    result = page.evaluate("JSON.parse(localStorage.getItem('dareme-static-demo-v1')).state.user") if static_demo else page.evaluate("async () => (await (await fetch('/api/state')).json()).user")
    assert result['private'] is False and result['name'] == 'Casey Demo'
    print('PASS: profile editing, explicit public-profile confirmation, persistence')

    nav.get_by_role('button', name='Feed', exact=True).click()
    page.get_by_role('tab', name='For you', exact=True).click()
    sample = page.locator('.post-card').filter(has_text='Jamie Chen')
    sample.get_by_role('button', name='Like post', exact=True).click()
    expect(sample.get_by_role('button', name='Unlike post', exact=True)).to_be_visible()
    sample.get_by_role('button', name='Save post', exact=True).click()
    page.get_by_role('tab', name='Saved', exact=True).click()
    expect(page.locator('.post-card')).to_have_count(1)
    sample = page.locator('.post-card')
    sample.get_by_role('button', name='View comments', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('textbox', name='Your comment', exact=True).fill('A kind little comment.')
    dialog.get_by_role('button', name='Send comment', exact=True).click()
    expect(dialog.get_by_text('A kind little comment.', exact=True)).to_be_visible()
    dialog.get_by_role('button', name='Close dialog').click()
    print('PASS: likes, saved collection, comments')

    sample.get_by_role('button', name='Options for Jamie Chen’s post').click()
    sample.get_by_role('button', name='Report this post').click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('combobox').select_option(label='Unsafe or harmful content')
    dialog.get_by_role('button', name='Save report').click()
    expect(dialog.get_by_role('heading', name='You’ve taken a good step.')).to_be_visible()
    expect(dialog.get_by_text('This is a demo only.' if static_demo else 'This prototype does not have a staffed moderation team.', exact=False)).to_be_visible()
    dialog.get_by_role('button', name='Back to my space').click()
    expect(page.locator('.post-card').filter(has_text='Jamie Chen')).to_have_count(0)
    print('PASS: reporting and immediate blocking')
    assert not errors, errors
    if static_demo:
        page.locator('.demo-label').click()
        dialog = page.get_by_role('dialog')
        expect(dialog.get_by_text('Nothing is sent to a server or another person.', exact=False)).to_be_visible()
        expect(page.locator('input[type=password], input[type=email]')).to_have_count(0)
        dialog.get_by_role('button', name='Reset the demo', exact=True).click()
        expect(page.get_by_role('heading', name='Today’s dares')).to_be_visible()
        assert api_requests == [], api_requests
        print('PASS: no login forms, no backend requests, browser-only demo reset')
    page.close()

    # Fresh sessions for screenshots and responsive checks; no preview mutations are shared.
    for name, width, height in [('desktop', 1440, 1000), ('mobile', 390, 844)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        screen = context.new_page()
        screen.goto(base, wait_until='networkidle')
        screen.evaluate('document.fonts.ready')
        expect(screen.get_by_role('heading', name='Today’s dares')).to_be_visible()
        screen.wait_for_timeout(350)
        assert not screen.evaluate('document.documentElement.scrollWidth > innerWidth'), name + ' overflow'
        expect(screen.get_by_role('navigation', name='Main navigation').get_by_role('button')).to_have_count(4)
        screen.screenshot(path=f'/tmp/dareme-{name}.png', full_page=True)
        if width < 800:
            screen.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Dares', exact=True).click()
            expect(screen.get_by_role('heading', name='Today’s dares')).to_be_visible()
            screen.get_by_role('button', name='Try this dare').last.click()
            expect(screen.get_by_role('dialog')).to_be_visible()
            assert screen.get_by_role('dialog').bounding_box()['width'] <= width
            screen.get_by_role('button', name='Close dialog').click()
            screen.get_by_role('navigation', name='Main navigation').get_by_role('button', name='Profile', exact=True).click()
            screen.get_by_role('button', name='Preferences', exact=True).click()
            expect(screen.get_by_role('heading', name='Settings')).to_be_visible()
            assert not screen.evaluate('document.documentElement.scrollWidth > innerWidth')
        context.close()
        print('PASS: ' + name + ' layout, navigation, and overflow checks')
    browser.close()
    print('All browser checks passed. No JavaScript runtime errors.')

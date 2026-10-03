#!/usr/bin/env python3
"""Build a dependency-free, offline HTML deck from source/."""
import argparse
import base64
import hashlib
import html
import json
import mimetypes
from pathlib import Path
import re
from html.parser import HTMLParser


def build(root, output=None):
    root = Path(root).resolve()
    source = root / 'source'
    config = json.loads((source / 'deck.json').read_text())
    for key in ('id', 'title', 'lang', 'notes'):
        if key not in config:
            raise ValueError(f'Missing deck.json key: {key}')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', config['id']):
        raise ValueError('Deck id must be a unique lowercase slug.')

    def read(name):
        return (source / name).read_text(encoding='utf-8')

    def asset(url):
        if url.startswith('data:'):
            return url
        if re.match(r'^(?:[a-z]+:|//|/)', url, re.I):
            raise ValueError(f'Copy asset into source/assets for offline use: {url}')
        path = (source / url).resolve()
        if not path.is_relative_to(source.resolve()):
            raise ValueError(f'Asset must live inside source/: {url}')
        mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

    def inline_css(css):
        if re.search(r'@import\b', css, re.I):
            raise ValueError('Use local font files and inline CSS; @import is unsupported.')
        return re.sub(r'url\(\s*([\"\']?)(.*?)\1\s*\)',
                      lambda m: 'url("' + asset(m[2]) + '")' if not m[2].startswith('#') else m[0], css)

    class SlideParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.slides = []
            self.keys = []
        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            if tag in ('script', 'iframe', 'object', 'embed', 'link', 'style'):
                raise ValueError(f'Unsupported slide tag: {tag}. Put code/styles in source files.')
            if any(k.startswith('on') for k in a) or 'srcset' in a:
                raise ValueError('Slide markup must not contain event attributes or srcset.')
            if 'slide' in a.get('class', '').split():
                self.slides.append((a.get('id'), a.get('data-kind', 'main')))
            if 'data-key' in a:
                self.keys.append(a['data-key'])
    slides = read('slides.html')
    parser = SlideParser()
    parser.feed(slides)
    ids = [i for i, _ in parser.slides]
    if not ids or any(not i for i in ids) or len(ids) != len(set(ids)):
        raise ValueError('Every slide needs a unique id.')
    if not any(kind != 'appendix' for _, kind in parser.slides):
        raise ValueError('The deck needs at least one main slide.')
    if len(parser.keys) != len(set(parser.keys)):
        raise ValueError('Editable data-key attributes must be unique.')
    if set(ids) != set(config['notes']):
        raise ValueError('deck.json notes keys must match slide ids exactly.')
    for entry in config['notes'].values():
        if not isinstance(entry.get('text'), str) or not isinstance(entry.get('seconds'), (int, float)) or entry['seconds'] < 0:
            raise ValueError('Each note needs text (string) and seconds (nonnegative number).')
    slides = re.sub(r'\bsrc=("|\')(.*?)\1', lambda m: 'src="' + asset(html.unescape(m[2])) + '"', slides)
    css = inline_css(read('stage.css') + '\n' + read('theme.css'))
    runtime = read('runtime.js')
    presenter_js = read('presenter.js')
    for script in (runtime, presenter_js):
        if re.search(r'</script', script, re.I):
            raise ValueError('JavaScript source must escape literal closing script tags.')
    presenter = read('presenter.html').replace('<!-- PRESENTER_SCRIPT -->', '<script>' + presenter_js + '</script>')
    def data(value):
        return json.dumps(value, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    config['revision'] = hashlib.sha256((slides + css + data(config)).encode()).hexdigest()[:16]
    replacements = {
        '{{LANG}}': html.escape(config['lang'], quote=True),
        '{{TITLE}}': html.escape(config['title']),
        '{{CSS}}': css,
        '{{SLIDES}}': slides,
        '{{CONFIG}}': data(config),
        '{{PRESENTER}}': data(presenter),
        '{{RUNTIME}}': runtime,
    }
    result = re.sub(r'\{\{(?:LANG|TITLE|CSS|SLIDES|CONFIG|PRESENTER|RUNTIME)\}\}',
                    lambda m: replacements[m[0]], read('shell.html'))
    target = Path(output).resolve() if output else root / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(result, encoding='utf-8')
    print(f'Built {target} ({len(ids)} slides, {target.stat().st_size:,} bytes)')
    return target


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory', nargs='?', default=str(Path(__file__).resolve().parent))
    cli.add_argument('--output')
    args = cli.parse_args()
    build(args.directory, args.output)

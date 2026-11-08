"""Validate the built, sitemap-visible HTML and write a reviewable inventory."""
import argparse
import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ''
        self.h1 = []
        self.meta = {}
        self.canonical = []
        self.links = []
        self.schemas = []
        self.in_title = False
        self.in_h1 = False
        self.schema = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'h1': self.in_h1 = True; self.h1.append('')
        if tag == 'meta': self.meta[a.get('property', a.get('name', ''))] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical.append(a.get('href'))
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag == 'script' and a.get('type') == 'application/ld+json': self.schema = ''

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_h1: self.h1[-1] += data
        if self.schema is not None: self.schema += data

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'h1': self.in_h1 = False
        if tag == 'script' and self.schema is not None:
            self.schemas.append(json.loads(self.schema))
            self.schema = None


def inventory(root, require_social):
    dist = root / 'dist'
    urls = [n.text for n in ET.parse(dist / 'sitemap-0.xml').iter() if n.tag.endswith('}loc')]
    pages, errors = [], []
    for url in urls:
        route = urlparse(url).path
        file = dist / route.strip('/') / 'index.html'
        p = Page()
        try: p.feed(file.read_text(encoding='utf-8'))
        except Exception as error: errors.append(f'{route}: HTML/schema read failed: {error}'); continue
        description = p.meta.get('description', '')
        if not p.title or not description: errors.append(f'{route}: missing title/description')
        if len(p.h1) != 1: errors.append(f'{route}: expected one H1, got {len(p.h1)}')
        if p.canonical != [url]: errors.append(f'{route}: canonical mismatch: {p.canonical}')
        if 'noindex' in p.meta.get('robots', '').lower(): errors.append(f'{route}: noindex URL in sitemap')
        if not p.schemas: errors.append(f'{route}: missing JSON-LD')
        for href in p.links:
            target = urlparse(href)
            if (not target.netloc and href.startswith('/')) or target.netloc == urlparse(url).netloc:
                path = dist / unquote(target.path).strip('/')
                if not path.exists() and not (path / 'index.html').exists(): errors.append(f'{route}: broken link {href}')
        og = p.meta.get('og:image')
        if require_social:
            if not og or not (dist / urlparse(og).path.strip('/')).is_file(): errors.append(f'{route}: missing OG asset')
            for key in ['og:image:width', 'og:image:height', 'og:image:alt', 'twitter:image', 'twitter:image:alt']:
                if not p.meta.get(key): errors.append(f'{route}: missing {key}')
            if p.meta.get('twitter:card') != 'summary_large_image': errors.append(f'{route}: wrong Twitter card')
        pages.append({'route':route, 'url':url, 'file':str(file), 'title':p.title, 'description':description, 'h1':p.h1[0] if p.h1 else None, 'canonical':p.canonical, 'robots':p.meta.get('robots'), 'og_image':og, 'schema_count':len(p.schemas)})
    for key in ['title','description']:
        for value, count in Counter(p[key] for p in pages).items():
            if count > 1: errors.append(f'Duplicate {key}: {value}')
    robots = (dist / 'robots.txt').read_text(encoding='utf-8')
    if any(line.strip().lower() == 'disallow: /' for line in robots.splitlines()): errors.append('Production robots blocks crawling')
    missing = dist / '404.html'
    if not missing.exists(): errors.append('Missing 404 page')
    return {'pages':pages, 'errors':sorted(set(errors)), 'sitemap_urls':len(urls)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--require-social', action='store_true')
    args = parser.parse_args()
    report = inventory(Path(__file__).resolve().parents[1], args.require_social)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'pages':len(report['pages']), 'errors':report['errors']}, ensure_ascii=False))
    raise SystemExit(bool(report['errors']))


if __name__ == '__main__': main()

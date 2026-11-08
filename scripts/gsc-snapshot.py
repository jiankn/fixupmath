"""Read-only Search Console snapshot using the user's existing OAuth setup.

Credentials are loaded in memory; no credentials or tokens are copied to the repo.
"""
import argparse
import csv
import json
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

import httplib2
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--end', type=date.fromisoformat, required=True)
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--credentials', type=Path, default=Path.home() / 'AppData/Local/zoxide-gsc-token.json', help='Existing authorized-user OAuth JSON; never copied to output.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    token = args.credentials
    credentials = Credentials.from_authorized_user_file(token, ['https://www.googleapis.com/auth/webmasters.readonly'])
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
    if not credentials.valid:
        raise RuntimeError('Existing OAuth credentials are invalid; interactive authorization is required.')
    proxy = httplib2.ProxyInfo(proxy_type=httplib2.socks.PROXY_TYPE_HTTP, proxy_host='127.0.0.1', proxy_port=10808)
    service = build('searchconsole', 'v1', http=AuthorizedHttp(credentials, http=httplib2.Http(proxy_info=proxy, timeout=45)), cache_discovery=False)
    entries = service.sites().list().execute(num_retries=2).get('siteEntry', [])
    property_name = next((s['siteUrl'] for s in entries if s['siteUrl'] == 'sc-domain:fixupmath.com'), None)
    if not property_name:
        property_name = next((s['siteUrl'] for s in entries if urlparse(s['siteUrl']).netloc == 'fixupmath.com'), None)
    if not property_name:
        raise RuntimeError('The current account has no accessible fixupmath.com property.')
    print('Property:', property_name, flush=True)
    windows = {'recent_28d': (args.end-timedelta(days=27), args.end), 'previous_28d': (args.end-timedelta(days=55), args.end-timedelta(days=28))}
    metadata = {'property': property_name, 'type': 'web', 'dataState': 'final', 'windows': {k: [str(a), str(b)] for k,(a,b) in windows.items()}, 'notes': ['Search Analytics dates use Pacific Time.', 'Query data excludes anonymized queries and is not a complete keyword inventory.', 'Search Analytics may return top rows rather than every row.']}
    save(args.output / 'source/metadata.json', metadata)
    for name, (start, end) in windows.items():
        for dims in [[], ['date'], ['page'], ['query'], ['query','page'], ['country'], ['device']]:
            rows = []
            while True:
                body = {'startDate': str(start), 'endDate': str(end), 'type': 'web', 'dataState': 'final', 'dimensions': dims, 'rowLimit': 25000, 'startRow': len(rows)}
                response = service.searchanalytics().query(siteUrl=property_name, body=body).execute(num_retries=2)
                batch = response.get('rows', [])
                rows.extend(batch)
                if len(batch) < 25000:
                    break
            label = '-'.join(dims) or 'totals'
            save(args.output / f'source/{name}-{label}.json', {'startDate': str(start), 'endDate': str(end), 'dimensions': dims, 'rows': rows})
            with (args.output / f'source/{name}-{label}.csv').open('w', newline='', encoding='utf-8') as handle:
                writer = csv.writer(handle)
                writer.writerow(dims + ['clicks','impressions','ctr','position'])
                for row in rows:
                    writer.writerow(row.get('keys', []) + [row.get(k,0) for k in ['clicks','impressions','ctr','position']])
            print(name, label, len(rows), flush=True)
    save(args.output / 'source/sitemaps.json', service.sitemaps().list(siteUrl=property_name).execute(num_retries=2))
    if args.inspect:
        tree = ET.parse(root / 'dist/sitemap-0.xml')
        urls = [n.text for n in tree.iter() if n.tag.endswith('}loc') and n.text]
        results = []
        for i, url in enumerate(urls):
            try:
                result = service.urlInspection().index().inspect(body={'inspectionUrl':url, 'siteUrl':property_name, 'languageCode':'en-US'}).execute(num_retries=2)
                results.append({'url':url, **result.get('inspectionResult', {})})
                status = result.get('inspectionResult', {}).get('indexStatusResult', {})
                print(f"Inspect {i+1}/{len(urls)} {urlparse(url).path} {status.get('verdict')} {status.get('coverageState')}", flush=True)
            except HttpError as error:
                results.append({'url':url, 'error':str(error)})
                print('Inspection error:', url, error.resp.status, flush=True)
                if error.resp.status in (401,403,429):
                    save(args.output / 'source/url-inspection.json', results)
                    break
            save(args.output / 'source/url-inspection.json', results)
    print('Snapshot saved:', args.output, flush=True)


if __name__ == '__main__':
    main()

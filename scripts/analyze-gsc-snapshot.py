"""Summarize an exported GSC snapshot using observed landing pages, not guessed matches."""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, text):
    path.write_text(text.rstrip() + '\n', encoding='utf-8')


def md(value):
    return value.replace('|', '\\|')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run', type=Path)
    args = parser.parse_args()
    run = args.run
    source = run / 'source'
    recent = read(source / 'recent_28d-totals.json')
    previous = read(source / 'previous_28d-totals.json')
    dates = read(source / 'recent_28d-date.json')['rows']
    page_rows = read(source / 'recent_28d-page.json')['rows']
    query_rows = read(source / 'recent_28d-query-page.json')['rows']
    countries = read(source / 'recent_28d-country.json')['rows']
    inspections = read(source / 'url-inspection.json')
    coverage = Counter(x.get('indexStatusResult', {}).get('coverageState', 'ERROR') for x in inspections)
    before = read(run / 'before-build.json')['pages']
    after = read(run / 'after-build.json')['pages']
    pages = {urlparse(x['keys'][0]).path:x for x in page_rows}
    events = read(source / 'cloudflare-google-events.json')['data']['viewer']['zones'][0]['firewallEventsAdaptive']
    recent_crawls = [x for x in inspections if x.get('indexStatusResult', {}).get('lastCrawlTime', '') >= '2026-11-02T13:55:33Z' and x.get('indexStatusResult', {}).get('pageFetchState') == 'SUCCESSFUL']
    summary = {
        'property':'sc-domain:fixupmath.com',
        'requested_recent_window':[recent['startDate'], recent['endDate']],
        'latest_returned_final_date':max(x['keys'][0] for x in dates),
        'recent':recent['rows'][0], 'previous':previous['rows'][0],
        'inspected_urls':len(inspections), 'coverage':dict(coverage),
        'successful_crawls_after_2026_11_02_change':len(recent_crawls),
        'historical_google_block_samples':len(events),
        'historical_block_rule_ids':dict(Counter(x['ruleId'] for x in events)),
        'historical_block_first_utc':min(x['datetime'] for x in events),
        'historical_block_last_utc':max(x['datetime'] for x in events),
        'known_query_page_rows':len(query_rows),
        'confidence':'Historical performance; current indexing recovery is incomplete.'
    }
    write(run / 'summary.json', json.dumps(summary, ensure_ascii=False, indent=2))
    fields = ['url','verdict','coverageState','pageFetchState','lastCrawlTime','googleCanonical','userCanonical']
    with (run / 'url-status.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in inspections:
            state = row.get('indexStatusResult', {})
            writer.writerow({'url':row['url'], **{k:state.get(k,'') for k in fields[1:]}})
    selected = ['square-footage-calculator','carpet-calculator','wallpaper-calculator']
    lines = ['# 页面与查询机会', '', '以下是历史曝光窗口的改善候选，先解决抓取/收录恢复。平均排名不是当前固定名次。', '', '| 页面 | 曝光 | 点击 | 平均排名 | 分类 |', '|---|---:|---:|---:|---|']
    clusters = []
    for slug in selected:
        route = '/' + slug + '/'
        row = pages[route]
        lines.append(f"| {route} | {row['impressions']:.0f} | {row['clicks']:.0f} | {row['position']:.2f} | IMPROVE / 历史证据 |")
        queries = sorted([q for q in query_rows if urlparse(q['keys'][1]).path == route], key=lambda x:x['impressions'], reverse=True)
        clusters += [f'## {route}', '', '| 实际落地查询 | 曝光 | 平均排名 |', '|---|---:|---:|']
        clusters += [f"| {md(q['keys'][0])} | {q['impressions']:.0f} | {q['position']:.2f} |" for q in queries[:12]]
        clusters += ['']
    lines += ['', '其他页面：有 2 次点击的 rafter/stair 页面保持主体；voltage-drop 先复核历史 403，不因第三方仅检测到少量词而优先扩写；tile 的靠前查询混有数学作业题，不能当作装修意图机会。混凝土 slab/bag 两页在本窗口没有 query-page 记录，无法判断词内耗。']
    write(run / 'page-opportunities.md', '\n'.join(lines))
    write(run / 'keyword-clusters.md', '\n'.join(['# 查询与实际落地页', '', '按已观测的 landing page 归组，不按字符串重叠猜落地页。Query 数据排除了匿名查询，不代表全部关键词。', ''] + clusters))
    lines = ['# 国家表现', '', '国家不是语言。现有英语美国计量产品继续以美国用户任务为主，本轮没有多语言扩页依据。', '', '| 国家 | 曝光 | 点击 | 平均排名 |', '|---|---:|---:|---:|']
    lines += [f"| {r['keys'][0]} | {r['impressions']:.0f} | {r['clicks']:.0f} | {r['position']:.2f} |" for r in sorted(countries,key=lambda x:x['impressions'],reverse=True)[:10]]
    write(run / 'country-opportunities.md', '\n'.join(lines))
    lines = ['# 生产页面清单', '', '来源：修改后的 dist HTML 与 sitemap-0.xml，共 60 个可索引候选 URL。源码扫描器只识别 4 个路由的结果不适用于此 Astro 项目。', '', '| 路由 | Title | H1 |', '|---|---|---|']
    lines += [f"| {p['route']} | {md(p['title'])} | {p['h1']} |" for p in after]
    write(run / 'seo-site-map.md', '\n'.join(lines))
    write(run / 'site-pages.json', json.dumps(after, ensure_ascii=False, indent=2))
    original = read(run / 'site-audit.json')
    original['domain'] = 'fixupmath.com'
    original['source_route_candidates'] = 4
    original['indexable_pages'] = len(after)
    original['sitemap'] = 'dist/sitemap-index.xml'
    original['robots'] = 'dist/robots.txt'
    original['routes'] = after
    original['inventory_source'] = 'Validated production sitemap and dist HTML; source parser does not support Astro routes.'
    write(run / 'site-audit.json', json.dumps(original, ensure_ascii=False, indent=2))
    lines = ['# 修改与验证记录', '', '本轮更新共享展示模板、六页 metadata、三页正文；没有修改计算公式、URL 或 canonical。', '', '| 页面 | Title：修改前 → 修改后 | 描述字符：前 → 后 | H1 |', '|---|---|---:|---|']
    old_map = {p['route']:p for p in before}
    for p in after:
        old = old_map[p['route']]
        if old['title'] != p['title'] or old['description'] != p['description']:
            lines.append(f"| {p['route']} | {md(old['title'])} → {md(p['title'])} | {len(old['description'])} → {len(p['description'])} | {p['h1']}（保留） |")
    lines += ['', '所有 60 页补齐 og:image / twitter:image、大图卡片、图片尺寸和替代说明。品牌图为原生 SVG 图形渲染的 1200×630 PNG；视觉复用现有品牌颜色与口号，不包含新的功效或认证承诺。', '', '## 验证', '', '- 249 个测试通过（18 个文件）。', '- Astro check：0 errors、0 warnings，5 个原有 hints。', '- 生产构建：69 页（含 8 个不进 sitemap 的 embed 和 404）。', '- 修改前和修改后，60 个 sitemap 页面均通过生产 HTML 审计；修改后额外校验分享图与卡片属性。', '- 每页一个 H1，title/description 唯一，canonical 对应 sitemap，无 noindex 冲突，JSON-LD 可解析，站内链接存在，robots 允许抓取，404 产物存在。', '- PNG 实测 1200×630，已目视检查。', '- 当前公开访问样本：首页、robots、两个 sitemap、BTU、电压降，普通与 Googlebot UA 共 12 次均 HTTP 200；UA 测试不能替代真实 Googlebot 来源验证。', '', '## 限制', '', '- 不能通过本次修改承诺 Google 重新收录。', '- 当前 Cloudflare 机器人拦截已关闭，没有为已经关闭的规则再添加全站放行。历史拦截已证实，规则的人类可读名称及具体旧表达式未取到，不推断为 AI 拦截。', '- 只读 GSC API 无“请求编入索引”能力；本轮未把 URL Inspection 历史状态描述为实时测试。', '- 本轮本地完成；没有 push 或部署。Git SHA 见任务最终回复或 `git log -1`。']
    write(run / 'seo-change-report.md', '\n'.join(lines))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__': main()

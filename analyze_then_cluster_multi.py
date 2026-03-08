import requests, json
base='http://localhost:8000/api'
# find portfolio with at least 2 stocks
r = requests.get(base + '/portfolios/')
plist = r.json().get('results') or r.json()
choice = None
for p in plist:
    if p.get('stock_count',0) >= 2:
        choice = p
        break
if not choice:
    print('no portfolio with >=2 stocks')
    exit(1)
pid = choice['id']
print('using portfolio', pid, choice['name'], 'stock_count', choice['stock_count'])
# analyze all live (so it doesn't persist) to ensure analyses present
ra = requests.post(f"{base}/portfolios/{pid}/analyze_all_live/", json={'past_days':365})
print('analyze_all_live status', ra.status_code)
try:
    print(json.dumps(ra.json(), indent=2)[:1000])
except:
    print(ra.text)
# now clustering
rc = requests.get(f"{base}/portfolios/{pid}/clustering/")
print('clustering status', rc.status_code)
print(json.dumps(rc.json(), indent=2)[:2000])

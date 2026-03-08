import requests, json
base='http://localhost:8000/api'
# get first portfolio
r = requests.get(base + '/portfolios/')
plist = r.json().get('results') or r.json()
if not plist:
    print('no portfolios')
    exit(1)
pid = plist[0]['id']
print('using portfolio id', pid)
# analyze all
ra = requests.post(f"{base}/portfolios/{pid}/analyze_all/", json={'past_days':365})
print('analyze_all status', ra.status_code)
try:
    print(json.dumps(ra.json(), indent=2)[:1000])
except:
    print(ra.text)
# now clustering
rc = requests.get(f"{base}/portfolios/{pid}/clustering/")
print('clustering status', rc.status_code)
print(json.dumps(rc.json(), indent=2)[:2000])

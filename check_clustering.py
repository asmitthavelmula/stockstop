import requests, json
base='http://localhost:8000/api'
# get first portfolio
r = requests.get(base + '/portfolios/')
print('portfolios status', r.status_code)
plist = r.json().get('results') or r.json()
if not plist:
    print('no portfolios')
    exit(1)
pid = plist[0]['id']
print('using portfolio id', pid)
rc = requests.get(f"{base}/portfolios/{pid}/clustering/")
print('clustering status', rc.status_code)
print(json.dumps(rc.json(), indent=2)[:1500])

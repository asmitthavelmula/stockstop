import requests, json
base='http://localhost:8000'
try:
    r=requests.get(base+'/api/portfolios/')
    r.raise_for_status()
    data=r.json()
    if isinstance(data, dict) and data.get('results'):
        pid=data['results'][0]['id']
    else:
        pid=data[0]['id']
    print('Using portfolio id', pid)
    cr=requests.get(f"{base}/api/portfolios/{pid}/clustering/")
    print('Status', cr.status_code)
    cj=cr.json()
    print('best_method:', cj.get('best_method'))
    print('best_pair:', json.dumps(cj.get('best_pair'), indent=2))
except Exception as e:
    print('Error', e)

import requests

base='http://127.0.0.1:8000/api'
# find My Portfolio
r=requests.get(base+'/portfolios/')
print('list status', r.status_code)
print(r.text[:1000])
listdata = r.json().get('results') or r.json()
mp=[p for p in listdata if p['name']=='My Portfolio']
print('my portfolios', mp)
if mp:
    pid=mp[0]['id']
else:
    r2 = requests.post(base+'/portfolios/', json={'name':'My Portfolio','description':'auto'})
    print('create', r2.status_code, r2.text)
    pid=r2.json()['id']
    print('created',pid)
# now add stock
stock_sym='RELIANCE.NS'
r3=requests.post(f"{base}/portfolios/{pid}/add_stock/", json={'symbol':stock_sym,'quantity':1,'purchase_price':0,'purchase_date':'2026-03-03'})
print('add_stock',r3.status_code, r3.text)

# list again to check counts
r4=requests.get(base+'/portfolios/')
print('post-add list', r4.status_code)
print(r4.text[:1000])

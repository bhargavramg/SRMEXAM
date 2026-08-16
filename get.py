import urllib.request, re, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://www.bing.com/images/search?q=srm+institute+of+science+and+technology+logo', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
matches = re.findall(r'murl&quot;:&quot;(http[^&]+?)&quot;', html)
if matches:
    img_url = matches[0]
    print("Found URL:", img_url)
    try:
        img_req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
        img_data = urllib.request.urlopen(img_req, context=ctx).read()
        with open(r'c:\Users\bharg\OneDrive\Desktop\SRM QUIZ\frontend\public\srm-logo.png', 'wb') as f:
            f.write(img_data)
        print("Success")
    except Exception as e:
        print("Error downloading", e)
else:
    print("Not found")

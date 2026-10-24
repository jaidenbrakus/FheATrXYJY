import re

l = [
    ["accounts.zoho.com", "www.zohoapis.com", "download.zoho.com", "upload.zoho.com", "api-console.zoho.com", ],
    ["accounts.zoho.eu", "www.zohoapis.eu", "download.zoho.eu", "upload.zoho.eu", "api-console.zoho.eu", ],
    ["accounts.zoho.com.au", "www.zohoapis.com.au", "download.zoho.com.au", "upload.zoho.com.au",
     "api-console.zoho.com.au", ],
    ["accounts.zoho.in", "www.zohoapis.in", "download.zoho.in", "upload.zoho.in", "api-console.zoho.in", ],
    ["accounts.zoho.jp", "www.zohoapis.jp", "download.zoho.jp", "upload.zoho.jp", "api-console.zoho.jp", ],
    ["accounts.zoho.com.cn", "www.zohoapis.com.cn", "download.zoho.com.cn", "upload.zoho.com.cn",
     "api-console.zoho.com.cn", ],

    ["api.pcloud.com", "eapi.pcloud.com", ],


]

a = """
    [setup.backends.xxxcom]
      address = "xxx.com"
      port = 443"""

for i in l:
    b = ""
    for j in i:
        c = re.sub(r"xxxcom", j.replace(".", ""), a)
        c = re.sub(r"xxx\.com", j, c)
        b += c
    print(b)

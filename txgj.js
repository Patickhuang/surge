var body = $response.body;
var obj = JSON.parse(body);

obj.vipList = [{
    "setVIPxpireTime": "20880609",
    "setMemberStatustype": "1",
    "setVIPAccountType": "1"
  }]

body = JSON.stringify(obj); 
$done({body}); 

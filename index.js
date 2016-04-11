'use strict';

const http = require('http');
const Yelp = require('yelp');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request').defaults({
  proxy: process.env.FIXIE_URL,
}));

const CONST = {
  ID: process.env.LINE_BOT_ID,
  SECRET: process.env.LINE_BOT_SECRET,
  MID: process.env.LINE_BOT_MID,
};

const yelp = new Yelp({
  consumer_key: process.env.YELP_KEY,
  consumer_secret: process.env.YELP_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET,
});

const checkRequest = (req) => {
  return true;
};

const botHandler = Promise.coroutine(function* (req, res, body) {
  if (!checkRequest(req)) {
    console.log('request was not from line server.');
    res.writeHead(400);
    res.end('400 Bad Request');
    return;
  }
  const data = JSON.parse(body);
  const content = data.result[0].content;
  let json = {
    to: [content.from],
    toChannel: 1383378250,
    eventType: "138311608800106203",
    content: {
      toType: 1,
      contentType: 1,
    }
  };

  if (content.contentType !== 7) {
    json.content.text = 'Please send location with [+] button.';
  } else {
    const data = yield yelp.search({
      term: 'food',
      limit: 10,
      sort: 1,
      radius_filter: 2000,
      location: content.location.address,
      cll: [content.location.latitude, content.location.longitude].join(','),
      cc: 'JP',
      lang: 'ja',
    });
    json.content.text = data.businesses.map((r) => {
      const star = Array(parseInt(r.rating) + 1).join('★') + (parseInt(r.rating) === r.rating ? '' : '☆');
      r.url = r.url.split('?')[0];
      try {
        r.url = decodeURI(r.url.split('?')[0]);
      } catch(e) {}
      return [
        r.name + ' ' + star,
        r.categories.map((c) => { return c[0]; }).join(','),
        r.url,
      ].join('\n');
    }).join('\n\n');
  }

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Line-ChannelID': CONST.ID,
    'X-Line-ChannelSecret': CONST.SECRET,
    'X-Line-Trusted-User-With-ACL': CONST.MID,
  };
  yield request.postAsync({
    url:'https://trialbot-api.line.me/v1/events',
    json: true,
    headers: headers,
    body: json,
  });

  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
});


const handler = (req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello.');
  } else if (req.method === 'POST') {
    var body = '';
    req.on('data', (data) => {
      body += data;
    });
    req.on('end', () => {
      botHandler(req, res, body).catch(console.log);
    });
  } else {
    res.writeHead(400);
    res.end('400 Bad Request');
  }
};

const server = http.createServer(handler);
server.listen(process.env.PORT || 3000);

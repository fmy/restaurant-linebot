'use strict';

const http = require('http');
const proxy = require('request').defaults({
  proxy: process.env.FIXIE_URL
});

const CONST = {
  ID: process.env.LINE_BOT_ID,
  SECRET: process.env.LINE_BOT_SECRET,
  MID: process.env.LINE_BOT_MID
};

const checkRequest = (req) => {
  return true;
};

const botHandler = (req, res, body) => {
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
      toType: 1
    }
  };

  if (content.contentType === 1) {
    json.content.contentType = 1;
    json.content.text = 'your message: ' + content.text;
  } else if (content.contentType === 7) {
    json.content.contentType = 1;
    json.content.text = '';
  }

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Line-ChannelID': CONST.ID,
    'X-Line-ChannelSecret': CONST.SECRET,
    'X-Line-Trusted-User-With-ACL': CONST.MID
  };
  proxy({
    url:'https://trialbot-api.line.me/v1/events',
    method: 'POST',
    json: true,
    headers: headers,
    body: json
  }, (err, res, body) => {
    if (err) {
      console.log(err);
    }
  });

  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
};


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
      botHandler(req, res, body);
    });
  } else {
    res.writeHead(400);
    res.end('400 Bad Request');
  }
};

const server = http.createServer(handler);
server.listen(process.env.PORT || 3000);

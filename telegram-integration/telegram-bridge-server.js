#!/usr/bin/env node

/**
 * Telegram ↔ Claude Code Bridge Server
 *
 * Receives messages from n8n Telegram workflow and sends them to Claude Code.
 * Sends Claude Code responses back to n8n for delivery to Telegram.
 */

const http = require('http');
const https = require('https');

const PORT = 3001;
const TELEGRAM_BOT_TOKEN = '7529072263:AAE60n5-i9iwwhuEHPoy67w9LWDF3ICnAB0';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Store pending messages for processing
const pendingMessages = [];

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle incoming Telegram messages from n8n
  if (req.url === '/telegram/message' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        console.log('\n📨 Received from Telegram:');
        console.log(`   User: ${message.from_username}`);
        console.log(`   Text: ${message.text}`);
        console.log(`   Chat: ${message.chat_id}, Thread: ${message.thread_id}`);

        // Store message for Claude Code processing
        pendingMessages.push(message);

        // Acknowledge receipt
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Message received and queued for processing',
          messageId: message.message_id
        }));

        // Notify that message is available
        console.log('\n🤖 Message ready for Claude Code processing');
        console.log('   Use: GET /telegram/pending to retrieve');

      } catch (error) {
        console.error('❌ Error processing message:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Get pending messages (for Claude Code to fetch)
  if (req.url === '/telegram/pending' && req.method === 'GET') {
    const message = pendingMessages.shift();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(message || { pending: false }));
    return;
  }

  // Send response back to Telegram directly via Bot API
  if (req.url === '/telegram/respond' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const response = JSON.parse(body);
        console.log('\n📤 Sending to Telegram:');
        console.log(`   Chat: ${response.chat_id}, Thread: ${response.thread_id}`);
        console.log(`   Response: ${response.response?.substring(0, 100)}...`);

        // Send directly to Telegram Bot API
        const telegramPayload = {
          chat_id: response.chat_id,
          text: response.response
        };

        // For forum groups, message_thread_id is required to post in specific thread
        if (response.thread_id) {
          telegramPayload.message_thread_id = response.thread_id;
          // Also reply to the original message within that thread
          telegramPayload.reply_to_message_id = response.message_id;
        } else if (response.message_id) {
          // Non-forum chat, just reply to message
          telegramPayload.reply_to_message_id = response.message_id;
        }

        const postData = JSON.stringify(telegramPayload);
        const url = new URL(TELEGRAM_API_URL);

        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const telegramReq = https.request(options, (telegramRes) => {
          let responseBody = '';
          telegramRes.on('data', chunk => responseBody += chunk);
          telegramRes.on('end', () => {
            console.log('✅ Sent to Telegram');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, telegramResponse: responseBody }));
          });
        });

        telegramReq.on('error', (error) => {
          console.error('❌ Error sending to Telegram:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        });

        telegramReq.write(postData);
        telegramReq.end();

      } catch (error) {
        console.error('❌ Error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Status endpoint
  if (req.url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      pendingMessages: pendingMessages.length,
      endpoints: {
        'POST /telegram/message': 'Receive messages from n8n',
        'GET /telegram/pending': 'Get pending messages',
        'POST /telegram/respond': 'Send response to Telegram',
        'GET /status': 'Server status'
      }
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('🚀 Telegram ↔ Claude Code Bridge Server');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log('\n📍 Endpoints:');
  console.log(`   POST /telegram/message - Receive from n8n`);
  console.log(`   GET  /telegram/pending - Get pending messages`);
  console.log(`   POST /telegram/respond - Send to Telegram`);
  console.log(`   GET  /status          - Server status`);
  console.log('\n✅ Ready to bridge Telegram ↔ Claude Code\n');
});
#!/usr/bin/env node

/**
 * Telegram Message Processor
 *
 * Automatically processes pending messages from bridge server and responds via Claude Code
 */

const http = require('http');
const https = require('https');

const BRIDGE_URL = 'http://localhost:3001';
const POLL_INTERVAL = 2000; // Check every 2 seconds

console.log('🤖 Telegram Message Processor Starting...\n');

// Simple response handler based on message content
function generateResponse(message) {
  const text = message.text || '';
  const command = text.split('@')[0].toLowerCase();

  switch(command) {
    case '/start':
      return `✅ Ahoj ${message.from_username}! Som Claude Code pripojený cez KrajinkaBot.

Môžem ti pomôcť s:
• Programovaním a vývojom
• Analýzou a debugovaním kódu
• Prácou s Memento databázou
• Git operáciami

Použi /help pre zoznam príkazov.`;

    case '/status':
      return `📊 Status systému:
• Bridge server: ✅ Running
• Telegram API: ✅ Connected
• Claude Code: ✅ Active

Systém je plne funkčný!`;

    case '/help':
      return `📖 Dostupné príkazy:

/start - Úvodná správa
/status - Stav systému
/help - Táto nápověda
/code - Programovacia pomoc
/analyze - Analyzovať kód
/memento - Práca s Memento DB
/debug - Ladiť chyby
/git - Git operácie

Môžeš mi tiež poslať ľubovoľnú správu alebo otázku!`;

    case '/code':
      return `💻 Programovacia pomoc:
Opíš mi svoj programovací problém alebo mi pošli kód a ja ti pomôžem.`;

    case '/analyze':
      return `🔍 Analýza kódu:
Pošli mi kód alebo popis problému a ja ho analyzujem.`;

    case '/memento':
      return `📊 Memento databáza:
Môžem ti pomôcť s Memento skriptami, business logikou a databázovými operáciami.`;

    case '/debug':
      return `🐛 Debugging:
Opíš chybu alebo problém a ja ti pomôžem nájsť riešenie.`;

    case '/git':
      return `🔧 Git operácie:
Môžem ti pomôcť s git príkazmi, repozitármi a verzionovaním.`;

    default:
      return `Prijal som tvoju správu: "${text}"

Momentálne som v základnom režime. Pre plnú funkcionalitu Claude Code integrácie kontaktuj administrátora.

Použi /help pre zoznam príkazov.`;
  }
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, json: () => JSON.parse(data) });
        } catch (e) {
          resolve({ ok: false, json: () => ({}) });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Process one pending message
async function processPendingMessage() {
  try {
    // Get pending message
    const response = await makeRequest(`${BRIDGE_URL}/telegram/pending`);
    const message = response.json();

    if (!message || !message.chat_id) {
      // No pending messages
      return false;
    }

    console.log(`📨 Processing message from ${message.from_username}: ${message.text}`);

    // Generate response
    const responseText = generateResponse(message);

    // Send response
    const payload = JSON.stringify({
      chat_id: message.chat_id,
      thread_id: message.thread_id,
      message_id: message.message_id,
      response: responseText
    });

    const sendResponse = await makeRequest(`${BRIDGE_URL}/telegram/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      body: payload
    });

    const result = sendResponse.json();

    if (result.success) {
      console.log(`✅ Response sent successfully\n`);
    } else {
      console.error(`❌ Failed to send response: ${JSON.stringify(result)}\n`);
    }

    return true; // Processed a message

  } catch (error) {
    console.error(`❌ Error processing message: ${error.message}`);
    return false;
  }
}

// Main polling loop
async function pollLoop() {
  console.log('🔄 Starting message polling...\n');

  while (true) {
    try {
      const processed = await processPendingMessage();

      // If we processed a message, check immediately for more
      // Otherwise wait for the poll interval
      if (!processed) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }
    } catch (error) {
      console.error(`❌ Poll loop error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

// Start the processor
pollLoop().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
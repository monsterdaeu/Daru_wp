import { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import pino from 'pino';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and wait for answer
const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

// Clear console and print header/banner
function printHeader() {
  console.clear();
  console.log(`
  [√] ====[ 966596500736 ]====
  Author  : DARU DON
  Tool    : DARU DON WP TOOL
  [√] ============================================
  `);
}

let targetNumber = null;
let messages = null;
let delaySeconds = null;
let haterName = null;

// Initialize auth state from stored credentials
const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

// Function to send messages repeatedly
async function sendMessages(sock) {
  while (true) {
    for (const msg of messages) {
      try {
        const currentTime = new Date().toLocaleTimeString();
        const fullMessage = `${haterName} ${msg}`;

        // Send message to target number
        await sock.sendMessage(`${targetNumber}@c.us`, { text: fullMessage });

        // Log progress
        console.log(`[√] Sent to: ${targetNumber}`);
        console.log(`[√] Time: ${currentTime}`);
        console.log(`[√] Message: ${fullMessage}`);
        console.log(`[=== DARU DON OWNER OF TOOL ===]`);

        // Wait specified delay before next message
        await delay(delaySeconds * 1000);
      } catch (error) {
        console.log(`Error sending message: ${error.statusCode}. Retrying in 5 seconds...`);
        await delay(5000);
      }
    }
  }
}

async function start() {
  try {
    // Create WhatsApp socket connection
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state
    });

    // If not logged in, ask user to enter phone number and request pairing
    if (!sock.authState.creds?.clientID) {
      printHeader();
      targetNumber = await askQuestion("Enter Your Phone Number => ");
      const pairingCode = await sock.requestPairingCode(targetNumber);
      printHeader();
      console.log(`Your WhatsApp Login ✓`);
      console.log(`[√] Your Pairing Code Is => ${pairingCode}`);
    }

    // Listen for connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        printHeader();

        // Prompt user inputs if not already taken
        if (!targetNumber || !messages || !delaySeconds || !haterName) {
          targetNumber = await askQuestion("【Target Number】=> ");
          const messagesFile = await askQuestion("【Enter Message File Path】===> ");
          messages = fs.readFileSync(messagesFile, 'utf-8').split('\n').filter(Boolean);
          haterName = await askQuestion("【Enter Hater Name】===> ");
          delaySeconds = parseInt(await askQuestion("【Enter Message Delay】===> "), 10);

          console.log("Now Starting Message Sending...");
          await sendMessages(sock);
        }
      }

      if (connection === 'close' && lastDisconnect?.error) {
        const isLoggedOut = lastDisconnect.error?.output?.statusCode === DisconnectReason.loggedOut;
        if (!isLoggedOut) {
          console.log("Network issue, retrying in 5 seconds...");
          setTimeout(start, 5000);
        } else {
          console.log("Connection closed. Please restart the script.");
        }
      }
    });

    // Save auth credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Catch uncaught exceptions except some known ones
    process.on('uncaughtException', (err) => {
      const msg = String(err);
      if (msg.includes('Socket connection timeout') || msg.includes('Connection closed')) return;
      console.log('Caught exception:', err);
    });

  } catch (err) {
    console.error("Error importing modules or running:", err);
  }
}

start();

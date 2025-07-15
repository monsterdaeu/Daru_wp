import { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } from "@whiskeysockets/baileys";
import fs from "fs";
import readline from "readline";
import pino from "pino";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

function showLogo() {
  console.clear();
  console.log(`
 ██████╗  █████╗ ██████╗ ██╗   ██╗
██╔════╝ ██╔══██╗██╔══██╗╚██╗ ██╔╝
██║  ███╗███████║██████╔╝ ╚████╔╝ 
██║   ██║██╔══██║██╔═══╝   ╚██╔╝  
╚██████╔╝██║  ██║██║        ██║   
 ╚═════╝ ╚═╝  ╚═╝╚═╝        ╚═╝   

      WhatsApp Automation Tool
  ⚡ by Daru | Made with ❤️ using Baileys
`);
}

async function main() {
  showLogo();

  const mode = await ask("Send to (1) Person or (2) Groups? Enter 1 or 2: ");
  const messageFile = await ask("Enter message file path (e.g., messages.txt): ");
  const delayTime = parseInt(await ask("Delay between messages (seconds): "), 10);

  let targets = [];
  if (mode === "1") {
    const targetNumber = await ask("Enter target number (e.g., 923xxxxxxxxx): ");
    targets.push(`${targetNumber}@s.whatsapp.net`);
  } else if (mode === "2") {
    try {
      const groupJids = fs.readFileSync("groups.txt", "utf-8").split("\n").filter(Boolean);
      targets = groupJids.map(jid => jid.trim());
    } catch (err) {
      console.error("❌ Failed to read 'groups.txt' file.");
      process.exit(1);
    }
  } else {
    console.log("❌ Invalid option.");
    process.exit(1);
  }

  let messages;
  try {
    messages = fs.readFileSync(messageFile, "utf-8").split("\n").filter(Boolean);
  } catch (error) {
    console.error("❌ Could not read message file:", error.message);
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("⚠️ Connection closed. Reconnecting...");
      if (shouldReconnect) main();
    }

    if (connection === "open") {
      console.log("\n✅ Connected to WhatsApp successfully.\n");

      for (const recipient of targets) {
        for (const msg of messages) {
          try {
            await sock.sendMessage(recipient, { text: msg });
            console.log(`📤 Sent to ${recipient}: "${msg}"`);
            await delay(delayTime * 1000);
          } catch (err) {
            console.error(`❌ Failed to send to ${recipient}:`, err.message);
          }
        }
      }

      console.log("\n✅ All messages sent. Exiting...");
      process.exit(0);
    }
  });
}

main();

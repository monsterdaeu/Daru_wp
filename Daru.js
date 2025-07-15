const {
  default: makeWASocket,
  useSingleFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { state, saveState } = useMultiFileAuthState('./auth_info.json');
const qrcode = require('qrcode-terminal');

// Approval key bhejne wala WhatsApp number (aapka)
const approvalNumber = '+966596500736';

// Multi numbers jahan message bhejna hai (apne numbers daal lo yahan)
const targetNumbers = [
  '+919876543210',
  '+919123456789',
  // aur numbers yahan add karo
];

// Approval key (jo aap send karwana chahte ho)
const approvalKey = 'YOUR-APPROVAL-KEY-HERE';

// Console Logo
function printLogo() {
  console.log(`
╔═════════════════════════════╗
║      DARU WHATSAPP TOOL     ║
║     Wp//00966596500736      ║
╚═════════════════════════════╝
`);
}

async function start() {
  printLogo();

  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp version: v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan the QR code above with your WhatsApp.');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        start();
      }
    }

    if (connection === 'open') {
      console.log('Connected to WhatsApp!');
      sendApprovalKey();
      sendMessagesToTargets();
    }
  });

  sock.ev.on('creds.update', saveState);

  // Approval key aapke number par bhejna
  async function sendApprovalKey() {
    try {
      const jid = approvalNumber.replace(/\D/g, '') + '@s.whatsapp.net';
      const message = `*Approval Key*\n\nYour key: ${approvalKey}\n\nPlease approve.`;
      await sock.sendMessage(jid, { text: message });
      console.log(`Approval key sent to ${+966596500736}`);
    } catch (err) {
      console.log('Error sending approval key:', err);
    }
  }

  // Target numbers par message bhejna
  async function sendMessagesToTargets() {
    for (const num of targetNumbers) {
      try {
        const jid = num.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: 'DARU WHATSAPP TOOL!' });
        console.log(`Message sent to ${num}`);
      } catch (err) {
        console.log(`Failed to send message to ${num}`, err);
      }
    }
  }
}

start();

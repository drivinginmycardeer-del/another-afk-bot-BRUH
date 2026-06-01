const mineflayer = require("mineflayer");
const express = require("express");

const HOST = "PowderedSMP.aternos.me";
const PORT = 21141;
const USERNAME = "ILoveAternos32";
const VERSION = "1.21.1";
const PASSWORD = "replit123";
const RECONNECT_DELAY_MS = 10_000;

let reconnectTimer = null;

let botConnected = false;
let botAuthenticated = false;
const startTime = Date.now();
let lastConnectTime = null;
let restartCount = 0;

function createBot() {
  console.log(`[Bot] Connecting to ${HOST}:${PORT} as ${USERNAME}...`);

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version: VERSION,
    hideErrors: false,
  });

  let authenticated = false;
  let afkIntervals = [];

  function startAntiAfk() {
    if (afkIntervals.length > 0) return;
    botAuthenticated = true;

    afkIntervals.push(setInterval(() => {
      try {
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 200);
      } catch {}
    }, 30_000));

    afkIntervals.push(setInterval(() => {
      try {
        const yaw = (Math.random() * Math.PI * 2) - Math.PI;
        const pitch = (Math.random() * 0.5) - 0.25;
        bot.look(yaw, pitch, false);
      } catch {}
    }, 15_000));

    afkIntervals.push(setInterval(() => {
      try {
        const dirs = ["forward", "back", "left", "right"];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        bot.setControlState(dir, true);
        setTimeout(() => bot.setControlState(dir, false), 500);
      } catch {}
    }, 45_000));
  }

  function clearAntiAfk() {
    botAuthenticated = false;
    afkIntervals.forEach(id => clearInterval(id));
    afkIntervals = [];
  }

  function tryLogin() {
    if (authenticated) return;
    bot.chat(`/login ${PASSWORD}`);
    console.log("[Bot] Sent /login");
  }

  function tryRegister() {
    if (authenticated) return;
    bot.chat(`/register ${PASSWORD} ${PASSWORD}`);
    console.log("[Bot] Sent /register");
  }

  bot.once("spawn", () => {
    botConnected = true;
    lastConnectTime = new Date().toISOString();
    console.log("[Bot] Spawned. Attempting login...");
    setTimeout(tryLogin, 1500);
  });

  bot.on("message", (jsonMsg) => {
    const text = jsonMsg.toString().toLowerCase();
    console.log("[Server]", text);

    if (text.includes("not registered") || text.includes("register")) {
      tryRegister();
    } else if (text.includes("login") || text.includes("log in") || text.includes("please authenticate")) {
      tryLogin();
    } else if (
      text.includes("logged in") || text.includes("successfully") ||
      text.includes("welcome") || text.includes("authenticated")
    ) {
      if (!authenticated) {
        authenticated = true;
        console.log("[Bot] Authenticated! Anti-AFK active.");
        startAntiAfk();
      }
    }
  });

  bot.on("chat", (username, message) => {
    console.log(`[Chat] <${username}> ${message}`);
  });

  bot.on("kicked", (reason) => {
    botConnected = false;
    clearAntiAfk();
    authenticated = false;
    console.log("[Bot] Kicked:", reason, "- Reconnecting...");
    scheduleReconnect();
  });

  bot.on("error", (err) => {
    botConnected = false;
    clearAntiAfk();
    authenticated = false;
    console.log("[Bot] Error:", err.message, "- Reconnecting...");
    scheduleReconnect();
  });

  bot.on("end", (reason) => {
    botConnected = false;
    clearAntiAfk();
    authenticated = false;
    console.log("[Bot] Disconnected:", reason, "- Reconnecting...");
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  restartCount++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createBot();
  }, RECONNECT_DELAY_MS);
}

const app = express();
const WEB_PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Minecraft bot is running!");
});

app.get("/status", (req, res) => {
  res.json({
    connected: botConnected,
    authenticated: botAuthenticated,
    uptime: Date.now() - startTime,
    lastConnectTime: lastConnectTime,
    restartCount: restartCount,
    timestamp: new Date().toISOString(),
  });
});

app.listen(WEB_PORT, () => {
  console.log(`[Web] Server listening on port ${WEB_PORT}`);
  createBot();
});

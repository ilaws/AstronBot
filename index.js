require("dotenv").config();

const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

app.command("/astronbot-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/astronbot-apod", async ({ ack, respond }) => {
  
});

app.command("/astronbot-catfact", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `Cat Fact:\n${response.data.fact}` });
  } catch (err) {
    await respond({ text: "Failed to fetch a cat fact." });
  }
});

app.command("/astronbot-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`Available Commands:
/astronbot-apod - Get today's Astronomy Picture of the Day
/astronbot-help - Show available commands
/astronbot-ping - Check bot latency`
  });
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();
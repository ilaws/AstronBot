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
  await ack();
  let attempts = 0;
  try {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        attempts++;
        response = await axios.get("https://science.nasa.gov/wp-json/wp/v2/apod-basic/", {
          params: { api_key: process.env.NASA_API_KEY || "DEMO_KEY" }
        });
        break;
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (attempt < 2 && status !== undefined && status >= 500 && status < 600) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    const apodData = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!apodData) {
      throw new Error("NASA APOD response did not contain an entry.");
    }
    const imageUrl = apodData.media_type === "image" ? apodData.hdurl : undefined;

    await respond({
      text: apodData.title,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${apodData.title}*`
          }
        },
        ...(imageUrl
          ? [{
              type: "image",
              image_url: imageUrl,
              alt_text: apodData.title
            }]
          : [])
      ]
    });
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const responseData = axios.isAxiosError(err) ? err.response?.data : undefined;
    const apiMessage = typeof responseData?.error?.message === "string"
      ? responseData.error.message.slice(0, 200)
      : undefined;
    const requestId = axios.isAxiosError(err)
      ? err.response?.headers["x-api-umbrella-request-id"]
      : undefined;
    console.error("NASA APOD request failed.", { status, attempts, apiMessage, requestId });

    let text = "Failed to fetch the Astronomy Picture of the Day. Check the bot logs for the request status.";
    if (status === 429) {
      text = "NASA's APOD API rate limit has been reached. Set NASA_API_KEY to your own NASA API key and restart the bot, or try again later.";
    } else if (status !== undefined && status >= 500) {
      text = "NASA's APOD service is temporarily unavailable. Please try again shortly.";
    }
    await respond({ text });
  }
});

app.command("/astronbot-epic", async ({ ack, respond }) => {
  await ack();
  try {
    const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
    const response = await axios.get("https://api.nasa.gov/EPIC/api/natural", {
      params: { api_key: apiKey }
    });
    const epicData = response.data[0];
    if (!epicData?.date || !epicData?.image) {
      throw new Error("NASA EPIC response did not contain image metadata.");
    }

    const [year, month, day] = epicData.date.slice(0, 10).split("-");
    const imageUrl = new URL(
      `https://api.nasa.gov/EPIC/archive/natural/${year}/${month}/${day}/png/${epicData.image}.png`
    );
    imageUrl.searchParams.set("api_key", apiKey);

    await respond({
      text: "NASA EPIC — Latest image of Earth",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*NASA EPIC — Latest image of Earth*"
          }
        },
        {
          type: "image",
          image_url: imageUrl.toString(),
          alt_text: "Latest image of Earth captured by NASA's EPIC camera"
        }
      ]
    });
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const responseData = axios.isAxiosError(err) ? err.response?.data : undefined;
    const apiMessage = typeof responseData?.error?.message === "string"
      ? responseData.error.message.slice(0, 200)
      : undefined;
    console.error("NASA EPIC request failed.", { status, apiMessage });

    const text = status === 429
      ? "NASA's EPIC API rate limit has been reached. Try again later."
      : "Failed to fetch the latest NASA EPIC image. Check the bot logs for the request status.";
    await respond({ text });
  }
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
/astronbot-epic - Show an Earth image from NASA's EPIC camera
/astronbot-help - Show available commands
/astronbot-ping - Check bot latency`
  });
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();
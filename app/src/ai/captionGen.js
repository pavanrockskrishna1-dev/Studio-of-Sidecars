export async function generateCaption({ productName, stageLook, lookPreset, occasion, propCount, shotCount, apiKey }) {
  if (!apiKey) throw new Error("No Groq API key");
  const parts = [
    `Product: ${productName}`,
    stageLook === "night" ? "night scene" : stageLook === "day" ? "outdoor scene" : "clean studio",
    lookPreset && lookPreset !== "off" ? `${lookPreset} look` : null,
    occasion && occasion !== "none" ? `${occasion} mood` : null,
    propCount > 0 ? `${propCount} props in scene` : null,
  ].filter(Boolean);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      temperature: 0.75,
      max_tokens: 250,
      response_format: { type: "text" },
      messages: [
        {
          role: "system",
          content: "You are a social media copywriter for street food and café brands. Write punchy, warm Instagram captions. Output only the caption text — no labels, no intro."
        },
        {
          role: "user",
          content: `Write an Instagram caption (2–3 short sentences + 6–8 hashtags on a new line) for a product reel. Context: ${parts.join(", ")}.`
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  let text = data?.choices?.[0]?.message?.content ?? "";
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

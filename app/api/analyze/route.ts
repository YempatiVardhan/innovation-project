import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const description = (formData.get("description") as string) || "";

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const imageBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const dataUrl = `data:${image.type || "image/jpeg"};base64,${base64Image}`;

    const prompt = `You are an experienced veterinarian AI assistant. Analyze the animal in the image and assess its health.

${description ? `Owner's description/question: ${description}\n` : ""}

Please provide:
1. What type of animal you see
2. Observable health indicators (appearance, posture, visible symptoms if any)
3. Health assessment and any concerns
4. Practical recommendations for the owner
5. A health score from 1-10 (10 being perfectly healthy)

Format your response as JSON with this structure:
{
  "animalType": "string",
  "healthScore": number,
  "healthStatus": "Excellent|Good|Fair|Poor|Critical",
  "observations": ["string"],
  "concerns": ["string"],
  "recommendations": ["string"],
  "summary": "string"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return Response.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}

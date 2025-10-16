export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Missing 'to' or 'message' field" });
    }

    const engagesparkURL = "https://api.engagespark.com/v1/sms-messages";

    // Send SMS request
    const response = await fetch(engagesparkURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.ENGAGESPARK_API_KEY}`,
      },
      body: JSON.stringify({
        organizationId: process.env.ENGAGESPARK_ORG_ID,
        recipients: [to],
        messageText: message,
      }),
    });

    // Get raw response
    const raw = await response.text();
    console.log("📡 EngageSpark raw response:", raw); // <-- check this in your terminal

    // Try parsing JSON safely
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.warn("⚠️ Non-JSON response received from EngageSpark");
      data = { raw };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data,
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("💥 API Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received SMS hook payload:", JSON.stringify(payload, null, 2));

    // Extract phone and OTP from Supabase Auth hook payload
    const { user, sms } = payload;
    const phone = user?.phone;
    const otp = sms?.otp;

    if (!phone || !otp) {
      console.error("Missing phone or OTP in payload");
      return new Response(
        JSON.stringify({ error: "Missing phone or OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY") || "";
    const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL") || "";

    if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
      console.error("Missing Infobip configuration");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean the base URL (remove https:// if present and any trailing slashes)
    const cleanBaseUrl = INFOBIP_BASE_URL
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .trim();

    // Clean API key - ensure it's ASCII-safe
    const cleanApiKey = INFOBIP_API_KEY.trim().replace(/[^\x20-\x7E]/g, '');

    // Format phone number (ensure it has + prefix)
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    // Send SMS via Infobip
    const infobipUrl = `https://${cleanBaseUrl}/sms/2/text/advanced`;
    
    const smsPayload = {
      messages: [
        {
          destinations: [{ to: formattedPhone }],
          from: "DHOS",
          text: `Your DHOS verification code is: ${otp}. This code expires in 10 minutes.`,
        },
      ],
    };

    console.log("Sending SMS to:", formattedPhone);
    console.log("Using Infobip URL:", infobipUrl);
    console.log("API Key length:", cleanApiKey.length);

    const response = await fetch(infobipUrl, {
      method: "POST",
      headers: {
        "Authorization": "App " + cleanApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const result = await response.json();
    console.log("Infobip response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("Infobip API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if message was accepted
    const messageStatus = result.messages?.[0]?.status;
    console.log("SMS sent successfully, status:", messageStatus);
    
    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.messageId, status: messageStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-sms function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

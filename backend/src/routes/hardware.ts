import { Hono } from "hono";

export const hardwareRoute = new Hono();

// Dynamic getters to ensure env vars are fresh
const getHardwareApi = () => process.env.HARDWARE_API || "";
const getFetchConfig = () => {
  const token = process.env.HARDWARE_TOKEN;
  const config: any = { headers: {} };
  if (token) config.headers.Authorization = token;
  return config;
};

// 1. GET /devices
hardwareRoute.get("/devices", async (c) => {
  const api = getHardwareApi();
  console.log(`[HARDWARE] Fetching devices from ${api}/devices`);
  try {
    const response = await fetch(`${api}/devices`, getFetchConfig());
    console.log(`[HARDWARE] Status: ${response.status}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`[HARDWARE] API Error Body: ${text}`);
      throw new Error("Hardware API Error");
    }
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error(`[HARDWARE] Error:`, error);
    return c.json({ error: "Failed to fetch devices" }, 500);
  }
});

// 2. GET /data
hardwareRoute.get("/data/:deviceId", async (c) => {
  const deviceId = c.req.param("deviceId");
  const api = getHardwareApi();
  console.log(
    `[HARDWARE] Fetching data for ${deviceId} from ${api}/data?device_id=${deviceId}`,
  );
  try {
    const response = await fetch(
      `${api}/data?device_id=${deviceId}`,
      getFetchConfig(),
    );
    console.log(`[HARDWARE] Status: ${response.status}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`[HARDWARE] API Error Body: ${text}`);
      throw new Error("Hardware API Error");
    }
    const data = await response.json();
    console.log(`[HARDWARE] Data:`, data);
    return c.json(data);
  } catch (error) {
    console.error(`[HARDWARE] Error:`, error);
    return c.json({ error: "Failed to fetch data for device" }, 500);
  }
});

// 3. GET /history
hardwareRoute.get("/history/:deviceId", async (c) => {
  const deviceId = c.req.param("deviceId");
  const api = getHardwareApi();
  console.log(
    `[HARDWARE] Fetching history for ${deviceId} from ${api}/history?device_id=${deviceId}`,
  );
  try {
    const response = await fetch(
      `${api}/history?device_id=${deviceId}`,
      getFetchConfig(),
    );
    console.log(`[HARDWARE] Status: ${response.status}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`[HARDWARE] API Error Body: ${text}`);
      throw new Error("Hardware API Error");
    }
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error(`[HARDWARE] Error:`, error);
    return c.json({ error: "Failed to fetch history for device" }, 500);
  }
});

// 4. GET /live (SSE Proxy)
hardwareRoute.get("/live/:deviceId", async (c) => {
  const deviceId = c.req.param("deviceId");
  const api = getHardwareApi();
  console.log(
    `[HARDWARE] Proxying SSE for ${deviceId} from ${api}/live?device_id=${deviceId}`,
  );
  try {
    const response = await fetch(
      `${api}/live?device_id=${deviceId}`,
      getFetchConfig(),
    );
    console.log(`[HARDWARE] Status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[HARDWARE] SSE API Error Body: ${text}`);
      return c.json(
        { error: "Hardware API SSE Error" },
        response.status as any,
      );
    }

    if (!response.body) {
      console.error(`[HARDWARE] No stream body for ${deviceId}`);
      return c.json({ error: "No stream body returned" }, 500);
    }

    // Creating our own streaming response from the proxied fetch
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(`[HARDWARE] SSE Proxy Error:`, error);
    return c.json({ error: "Failed to proxy SSE stream" }, 500);
  }
});


import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { signAlipayRequest, verifyAlipayNotify } from "./src/utils/alipay";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes ---

  // 1. Alipay Create Order
  app.post("/api/pay/create", async (req, res) => {
    try {
      const { amount = "19.90", subject = "电商宝 Pro 无限制算力包" } = req.body;
      const out_trade_no = `DSB${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Get origin from request headers or env
      const origin = req.get('origin') || `http://localhost:${PORT}`;

      // Beijing Time
      const d = new Date(Date.now() + 8 * 3600 * 1000);
      const timestamp = d.toISOString().replace('T', ' ').substring(0, 19);

      const params: Record<string, string> = {
        app_id: process.env.ALIPAY_APP_ID || "",
        method: "alipay.trade.precreate",
        format: "JSON",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: timestamp,
        version: "1.0",
        notify_url: `${origin}/api/pay/notify`,
        biz_content: JSON.stringify({
          out_trade_no: out_trade_no,
          total_amount: String(amount),
          subject: subject
        })
      };

      const keys = Object.keys(params).sort();
      const signStr = keys.map(k => `${k}=${params[k]}`).join('&');
      const sign = await signAlipayRequest(signStr, process.env.ALIPAY_PRIVATE_KEY || "");
      params.sign = sign;

      const searchParams = new URLSearchParams();
      for (const key of Object.keys(params)) {
        searchParams.append(key, params[key]);
      }

      const response = await fetch("https://openapi.alipay.com/gateway.do", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        },
        body: searchParams.toString()
      });

      const data: any = await response.json();
      const alipayResponse = data.alipay_trade_precreate_response;

      if (alipayResponse && alipayResponse.code === "10000") {
        res.json({
          code: 200,
          qr_code: alipayResponse.qr_code,
          out_trade_no: out_trade_no
        });
      } else {
        res.status(500).json({ code: 500, msg: "Alipay error", details: alipayResponse || data });
      }
    } catch (error: any) {
      console.error("Alipay create error:", error);
      res.status(500).json({ code: 500, msg: error.message });
    }
  });

  // 2. Alipay Query Order
  app.get("/api/pay/query", async (req, res) => {
    try {
      const { out_trade_no } = req.query;
      if (!out_trade_no) return res.status(400).json({ msg: "Missing out_trade_no" });

      const d = new Date(Date.now() + 8 * 3600 * 1000);
      const timestamp = d.toISOString().replace('T', ' ').substring(0, 19);

      const params: Record<string, string> = {
        app_id: process.env.ALIPAY_APP_ID || "",
        method: "alipay.trade.query",
        format: "JSON",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: timestamp,
        version: "1.0",
        biz_content: JSON.stringify({ out_trade_no })
      };

      const keys = Object.keys(params).sort();
      const signStr = keys.map(k => `${k}=${params[k]}`).join('&');
      const sign = await signAlipayRequest(signStr, process.env.ALIPAY_PRIVATE_KEY || "");
      params.sign = sign;

      const queryParams = new URLSearchParams();
      for (const key of Object.keys(params)) {
        queryParams.append(key, params[key]);
      }

      const response = await fetch(`https://openapi.alipay.com/gateway.do?${queryParams.toString()}`);
      const data: any = await response.json();
      const result = data.alipay_trade_query_response;

      res.json({
        code: result.code === "10000" ? 200 : 500,
        trade_status: result.trade_status,
        message: result.sub_msg
      });
    } catch (err: any) {
      res.status(500).json({ code: 500, error: err.message });
    }
  });

  // 3. Alipay Notify
  app.post("/api/pay/notify", async (req, res) => {
    try {
      const params = req.body;
      const isValid = await verifyAlipayNotify(params, process.env.ALIPAY_PUBLIC_KEY || "");
      
      if (isValid && (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED')) {
        console.log(`[ALIPAY SUCCESS] Order: ${params.out_trade_no}`);
        return res.send("success");
      }
    } catch (e) {
      console.error("[ALIPAY NOTIFY ERROR]:", e);
    }
    res.send("fail");
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

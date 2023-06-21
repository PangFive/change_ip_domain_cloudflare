import Fastify from "fastify";
import cors from "@fastify/cors";
import * as cfddns from "./ddns.js"; // ganti njs-cf-ddns.js dengan file yang dibikin
import schedule from "node-schedule";
import { runJobAbsen } from "./absen.js";
import "dotenv/config";
import qs from "qs";
import axios from "axios";
import formbody from "@fastify/formbody";
import { setEnvValue, now, getEnvValue } from "./helper.js";
import { exec } from "child_process";

const fastify = Fastify({
  logger: false,
});

await fastify.register(cors, {
  origin: "*",
});

fastify.register(formbody);

const portApp = process.env.PORT;

exec("warp-cli disconnect", (error, stdout, stderr) => {});

fastify.get("/ippublic", async (req, res) => {
  try {
    const ip = await cfddns.getV4();

    res.send({ ip: ip });
  } catch (err) {
    res.send({
      status: "error",
      message: err.message,
      data: err?.data,
    });
  }
});

fastify.get("/wrapon", async (req, res) => {
  exec("warp-cli connect", (error, stdout, stderr) => {});

  res.send({ status: "warp On" });
});

fastify.get("/wrapoff", async (req, res) => {
  exec("warp-cli disconnect", (error, stdout, stderr) => {});

  res.send({ status: "warp Off" });
});

fastify.get("/lastping", async function (req, res) {
  var lastping = getEnvValue("LAST_RUN");
  res.send({ lastping });
});

fastify.get("/cors", async function (req, res) {
  let url = decodeURIComponent(qs.stringify(req.query));
  if (!url.includes("?") && url.slice(-1) == "=") {
    url = url.replace("=", "");
  }

  let config = {
    headers: {
      "User-Agent": "okhttp/3.14.9",
    },
  };

  if (req.headers["content-type"] != undefined) {
    config.headers["Content-Type"] = req.headers["content-type"];
  }

  if (req.headers["authorization"] != undefined) {
    config.headers["Authorization"] = req.headers["authorization"];
  }

  if (req.headers["x-client-id"] != undefined) {
    config.headers["x-client-id"] = req.headers["x-client-id"];
  }

  if (req.headers["x-api-key"] != undefined) {
    config.headers["x-api-key"] = req.headers["x-api-key"];
  }

  try {
    await axios.get(url, config).then((response) => {
      res.statusCode = response.status;
      let data = response.data;
      res.send({ ...data });
    });
  } catch (err) {
    res.statusCode = err.response.status;
    res.send({
      status: "error",
      message: err.message,
      data: err?.data,
    });
  }
});

fastify.post("/cors", async (req, res) => {
  let url = decodeURIComponent(qs.stringify(req.query));
  if (!url.includes("?") && url.slice(-1) == "=") {
    url = url.replace("=", "");
  }
  let body = req.body;

  let config = {
    headers: {
      "User-Agent": "okhttp/3.14.9",
    },
  };

  if (req.headers["content-type"] != undefined) {
    config.headers["Accept"] = req.headers["content-type"];
    config.headers["Content-Type"] = req.headers["content-type"];
  }

  if (req.headers["authorization"] != undefined) {
    config.headers["Authorization"] = req.headers["authorization"];
  }

  if (req.headers["x-client-id"] != undefined) {
    config.headers["x-client-id"] = req.headers["x-client-id"];
  }

  if (config.headers["Content-Type"].includes("x-www-form-urlencoded")) {
    body = qs.stringify(body);
  }

  try {
    await axios.post(url, body, config).then((response) => {
      res.statusCode = response.status;
      let data = response.data;
      res.send({ ...data });
    });
  } catch (err) {
    res.statusCode = err.response.status;
    res.send({
      status: "error",
      message: err.message,
      data: err?.data,
    });
  }
});

fastify.put("/cors", async (req, res) => {
  let url = decodeURIComponent(qs.stringify(req.query));
  if (!url.includes("?") && url.slice(-1) == "=") {
    url = url.replace("=", "");
  }

  let config = {
    headers: {
      "User-Agent": "okhttp/3.14.9",
    },
  };

  if (req.headers["content-type"] != undefined) {
    config.headers["Accept"] = req.headers["content-type"];
    config.headers["Content-Type"] = req.headers["content-type"];
  }

  if (req.headers["authorization"] != undefined) {
    config.headers["Authorization"] = req.headers["authorization"];
  }

  if (req.headers["x-client-id"] != undefined) {
    config.headers["x-client-id"] = req.headers["x-client-id"];
  }

  try {
    await axios.put(url, req.body, config).then((response) => {
      res.statusCode = response.status;
      let data = response.data;
      res.send({ ...data });
    });
  } catch (err) {
    res.statusCode = err.response.status;
    res.send({
      status: "error",
      message: err.message,
      data: err?.data,
    });
  }
});

const pingCron = async () => {
  try {
    axios.get(process.env.URL_PING_MONITOR);
  } catch (err) {}
};

if (process.env.RUN_DNS == "true") {
  const options = {
    wanIPv4Site: process.env.wanIPv4Site,
    // The website which used to get your current public IPv4 address.
    // Default: https://ipv4.icanhazip.com
    autoSwitch: false,
    //If you don't have any public IPv6 address
    //program will use IPv4 automaticly or it will throw an exception.
    //Default: false.
    cfKey: process.env.cfKey,
    //Your Cloudflare API key
    email: process.env.email,
    //Your Cloudflare email
    zoneName: process.env.zoneName,
    //Your Cloudflare zone name
    recordType: process.env.recordType,
    //The type of record you want to update.
    //Default: A
    recordName: process.env.recordName,
    //The name of the record you want to update.
    TTL: 60,
    //The TTL of the record you want to update.
    //Default: 60
    proxied: true,
    //Default: false
  };

  const updateDNS = () => {
    cfddns
      .update(options)
      .then((ret) => {
        console.log(ret); //true | false
      })
      .catch((err) => {
        console.error(err);
      });
  };

  updateDNS();

  if (process.env.RUN_DNS_SCHEDULE == "true") {
    schedule.scheduleJob("* * * * *", function () {
      updateDNS();
    });
  }
}

if (process.env.RUN_ABSEN == "true") {
  console.log("run task " + now());
  setEnvValue("LAST_RUN", now().getTime());

  schedule.scheduleJob("* * * * *", function () {
    setEnvValue("LAST_RUN", now().getTime());
    runJobAbsen();
  });
}

// Run the server!
fastify.listen({ port: portApp }, function (err, address) {
  console.log("jalan port " + portApp);
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

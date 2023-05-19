import Fastify from "fastify";
import cors from "@fastify/cors";
import * as cfddns from "./ddns.js"; // ganti njs-cf-ddns.js dengan file yang dibikin
import schedule from "node-schedule";
import { runJobAbsen } from "./absen.js";
import "dotenv/config";
import qs from "qs";
import axios from "axios";
import formbody from "@fastify/formbody";

const fastify = Fastify({
  logger: false,
});

await fastify.register(cors, {
  origin: "*",
});

fastify.register(formbody);

const portApp = process.env.PORT;

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

fastify.get("/proxy", async function (req, res) {
  //   let url = decodeURIComponent(qs.stringify(req.query));
  //   if (!url.includes("?") && url.slice(-1) == "=") {
  //     url = url.replace("=", "");
  //   }

  //   let config = {
  //     headers: {
  //       "User-Agent": "okhttp/3.14.9",
  //     },
  //   };

  //   if (req.headers["content-type"] != undefined) {
  //     config.headers["Content-Type"] = req.headers["content-type"];
  //   }

  //   if (req.headers["authorization"] != undefined) {
  //     config.headers["Authorization"] = req.headers["authorization"];
  //   }

  //   if (req.headers["x-client-id"] != undefined) {
  //     config.headers["x-client-id"] = req.headers["x-client-id"];
  //   }

  //   if (req.headers["x-api-key"] != undefined) {
  //     config.headers["x-api-key"] = req.headers["x-api-key"];
  //   }

  //   try {
  //     await axios.get(url, config).then((response) => {
  //       res.statusCode = response.status;
  //       let data = response.data;
  //       res.send({ ...data });
  //     });
  //   } catch (err) {
  //     res.statusCode = err.response.status;
  //     res.send({
  //       status: "error",
  //       message: err.message,
  //       data: err?.data,
  //     });
  //   }
  const options = { method: "GET" };

  await fetch(
    "https://map.bpkp.go.id/api/v6/presensi?niplama=201800378&tanggal_awal=2023-05-10&api_token=t1e2KhzoIed59PBnmGf7rli6EQlvjUOMvDvOMIpj0nB94YOoT9WKk5oBgsxjrwMh",
    options
  )
    .then((response) => response.json())
    .then((response) => res.send({ response }))
    .catch((err) => console.error(err));
});

fastify.post("/proxy", async (req, res) => {
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

fastify.put("/proxy", async (req, res) => {
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
  console.log("run task");
  axios.get(process.env.URL_PING_MONITOR);

  schedule.scheduleJob("* * * * *", function () {
    axios.get(process.env.URL_PING_MONITOR);
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

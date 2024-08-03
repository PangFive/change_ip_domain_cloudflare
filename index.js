import Fastify from "fastify";
import cors from "@fastify/cors";
import * as cfddns from "./ddns.js"; // ganti njs-cf-ddns.js dengan file yang dibikin
import schedule from "node-schedule";
import { runJobAbsen } from "./absen.js";
import "dotenv/config";
import qs from "qs";
import axios from "axios";
import formbody from "@fastify/formbody";
import {
  setEnvValue,
  now,
  getEnvValue,
  convertCookie,
  getJsonData,
} from "./helper.js";
import { exec } from "child_process";

let visitors = 0;

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
    await axios
      .get("https://www.cloudflare.com/cdn-cgi/trace/")
      .then(function (response) {
        let raw = response.data.split("\n");
        let data = {};
        for (const line of raw) {
          const [key, value] = line.split("=");
          data[key] = value;
        }
        res.send({ ...data, visitors: visitors });
      })
      .catch(function (error) {
        console.error(error);
      });
  } catch (err) {
    res.send({
      status: "error",
      message: err.message,
      data: err?.data,
    });
  }
});

fastify.get("/ippublic/count", async (req, res) => {
  visitors++;
  res.send({ visitors: visitors });
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
      Connection : "Keep-Alive"
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

  if (req.headers["x-user-agent"] != undefined) {
    config.headers["User-Agent"] = req.headers["x-user-agent"];
  }

  if (req.headers["x-host"] != undefined) {
    config.headers["Host"] = req.headers["x-host"];
  }

  if (req.headers["x-referer"] != undefined) {
    config.headers["Referer"] = req.headers["x-referer"];
  }

  if (req.headers["x-origin"] != undefined) {
    config.headers["Origin"] = req.headers["x-origin"];
  }

  try {
    await axios.get(url, config).then((response) => {
      console.log(response)
      if (response.data == "tidak memiliki otoritas") {
        const error = new Error("tidak memiliki otoritas");
        error.response = { status: 401 };
        throw error;
      }
      res.statusCode = response.status;
      let data = response.data;
      res.send({ ...data });
    });
  } catch (err) {
    res.statusCode = err.response?.status;
    res.send({
      status: "error",
      message: err.message,
      data: err?.data,
    });
  }
});

fastify.post("/cors/presensi", async (req, res) => {
  let url = decodeURIComponent(qs.stringify(req.query));
  if (!url.includes("?") && url.slice(-1) == "=") {
    url = url.replace("=", "");
  }
  let body = req.body;

  let config = {
    headers: {
      "X-Requested-With": "com.eshabe.simpegbatam",
    },
    maxRedirects: 0,
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

  if (req.headers["x-user-agent"] != undefined) {
    config.headers["User-Agent"] = req.headers["x-user-agent"];
  }

  if (req.headers["x-host"] != undefined) {
    config.headers["Host"] = req.headers["x-host"];
  }

  if (req.headers["x-referer"] != undefined) {
    config.headers["Referer"] = req.headers["x-referer"];
  }

  if (req.headers["x-origin"] != undefined) {
    config.headers["Origin"] = req.headers["x-origin"];
  }

  try {
    await axios
      .post(url, body, config)
      .then((response) => {})
      .catch(async (error) => {
        const url = error.response.headers.location || "https://simpeg.batam.go.id/wdms";
        const cookie = convertCookie(error.response.headers["set-cookie"]);
        const option = {
          headers: {
            Cookie: cookie,
            ...config.headers,
          },
        };

        await axios.get(url, option).then(function (response) {
          const html = response.data;
          const data = getJsonData(html);
          res.statusCode = response.status;
          res.send(data);
        });
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

fastify.get("/cors/lokasi", async (req, res) => {
  const url = `https://www.google.com/search?tbm=map&hl=id&gl=id&q=${req.query["lat"]},${req.query["long"]}`;

  try {
    await axios.get(url).then(async function (response) {
      let data = response.data;
      data = JSON.parse(data.replace(`)]}'`, ""));
      const alamat = data[0][1][0][14][183][2][2][0].split(",");
      const kota = alamat[1].trim();
      const provinsi = alamat[2].trim();
      let timezone = null;
      let isTimeZone = false;

      if (req.query.gmt == "true") {
        isTimeZone = true;
      }

      if (isTimeZone) {
        const urlTz = `https://www.google.com/search?tbm=map&hl=id&gl=id&q=${provinsi}`;
        await axios.get(urlTz).then((response) => {
          let data = response.data;
          data = JSON.parse(data.replace(`)]}'`, ""));
          const gmt = data[0][5][1][0][1][0];
          timezone = gmt == "WIB" ? 7 : gmt == "WITA" ? 8 : 9;
        });
      }

      res.statusCode = response.status;
      res.send({ kota, provinsi, timezone });
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
    headers: {},
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

  if (req.headers["x-user-agent"] != undefined) {
    config.headers["User-Agent"] = req.headers["x-user-agent"];
  }

  if (req.headers["x-host"] != undefined) {
    config.headers["Host"] = req.headers["x-host"];
  }

  if (req.headers["x-referer"] != undefined) {
    config.headers["Referer"] = req.headers["x-referer"];
  }

  if (req.headers["x-origin"] != undefined) {
    config.headers["Origin"] = req.headers["x-origin"];
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
    headers: {},
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

  if (req.headers["x-user-agent"] != undefined) {
    config.headers["User-Agent"] = req.headers["x-user-agent"];
  }

  if (req.headers["x-host"] != undefined) {
    config.headers["Host"] = req.headers["x-host"];
  }

  if (req.headers["x-referer"] != undefined) {
    config.headers["Referer"] = req.headers["x-referer"];
  }

  if (req.headers["x-origin"] != undefined) {
    config.headers["Origin"] = req.headers["x-origin"];
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
  const timeDelay = Number(process.env.TIME_DELAY_ABSEN);

  if (process.env.DELAY_ABSEN == "true") {
    setTimeout(function () {
      runJobAbsen();
    }, timeDelay);
  } else {
    runJobAbsen();
  }

  schedule.scheduleJob("* * * * *", function () {
    setEnvValue("LAST_RUN", now().getTime());

    if (process.env.DELAY_ABSEN == "true") {
      setTimeout(function () {
        runJobAbsen();
      }, timeDelay);
    } else {
      runJobAbsen();
    }
  });
}

if (process.env.WARP == "true") {
  exec("warp-cli connect", (error, stdout, stderr) => {});
}

// Run the server!
fastify.listen({ port: portApp }, function (err, address) {
  console.log("jalan port " + portApp);
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

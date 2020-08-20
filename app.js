let express = require("express");
const bodyParser = require("body-parser");
let cors = require("cors");
let app = express();
const fs = require('fs');
const yaml = require("js-yaml");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const port = 2020;

app.get("/", (request, response) => {
  response.send("IEA backend running");
});

app.get("/getdata", async (request, response) => {
  console.log("getting data");
  let data;
  try {
    let fileContents = fs.readFileSync("./data.yaml", "utf8");
    data = yaml.safeLoad(fileContents);
  } catch (e) {
    console.log(e);
    data = {
      content: 'bs data'
    }
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.write(JSON.stringify(data));
  response.end();
});

app.listen(port, function () {
  console.log(`listening on port ${port}`);
});

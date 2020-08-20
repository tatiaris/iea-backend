let express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
let cors = require("cors");
let app = express();
const fs = require("fs");
const yaml = require("js-yaml");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.get("/", (request, response) => {
  response.send("IEA backend running");
});

app.get("/get-data", async (request, response) => {
  let data;
  try {
    let fileContents = fs.readFileSync("./uploads/data.yaml", "utf8");
    data = yaml.safeLoad(fileContents);
  } catch (e) {
    console.log(e);
    data = {
      content: "err data",
    };
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.write(JSON.stringify(data));
  response.end();
});

app.post("/upload-data", async (req, res) => {
  console.log("uploading data");
  try {
    if (!req.files) {
      res.send({
        status: false,
        message: "No file uploaded",
      });
    } else {
      let data_file = req.files.data_file;
      console.log("received file", data_file.name);
      data_file.mv("./uploads/data.yaml");
      res.send({
        status: true,
        message: "File is uploaded",
        data: {
          name: data_file.name,
          mimetype: data_file.mimetype,
          size: data_file.size
        },
      });
    }
  } catch (err) {
    console.log("something went wrong");
    res.status(500).send(err);
  }
});

app.listen(process.env.PORT || 2020);
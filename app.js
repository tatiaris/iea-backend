let express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
let cors = require("cors");
let app = express();
const fs = require("fs");
const neatCsv = require('neat-csv');
const yaml = require("js-yaml");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(
  fileUpload({
    createParentPath: true,
  })
);

const get_file_type = (f_name) => {
  return f_name.substring(f_name.indexOf('.') + 1)
}

const clean_data = (str) => {
  str.replace(`"`, `""`);
  if (str.includes(`,`)) str = `"${str}"`;
  return str;
}

const send_yaml_data = (f_name, response) => {
  const fileContents = fs.readFileSync(`./uploads/${f_name}`, "utf8");
  data = yaml.safeLoad(fileContents, response)
  response.writeHead(200, { "Content-Type": "application/json" });
  response.write(JSON.stringify(data));
  response.end();
}
const send_json_data = (f_name, response) => {
  const fileContents = fs.readFileSync(`./uploads/${f_name}`, "utf8");
  data = JSON.parse(fileContents, response)
  response.writeHead(200, { "Content-Type": "application/json" });
  response.write(JSON.stringify(data));
  response.end();
}
const send_csv_data = (f_name, response) => {
  let obj_data = {
    observations: []
  }
  fs.readFile(`./uploads/${f_name}`, async (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    let csv_data = await neatCsv(data);
    for (let i = 0; i < csv_data.length; i++) {
      const row = csv_data[i];
      let observation_exists = false;
      for (let j = 0; !observation_exists && j < obj_data.observations.length; j++) {
        let observation = obj_data.observations[j];
        // check if observation exists
        if (row.observation == observation.title) {
          observation_exists = true;
          let episode_exists = false;
          // check if episode exists
          for (let k = 0; !episode_exists && k < observation.episode_parts.length; k++) {
            let episode = observation.episode_parts[k];
            if (row.episode == episode.label) {
              episode_exists = true;
              // add interaction
              episode.interactions.push({
                initiator: row.initiator,
                technology: row.technology,
                receiver: row.receiver,
                duration: row.duration,
                conversation: row.conversation
              })
            }
          }
          if (!episode_exists) {
            observation.episode_parts.push({
              label: row.episode,
              interactions: [
                {
                  initiator: row.initiator,
                  technology: row.technology,
                  receiver: row.receiver,
                  duration: row.duration,
                  conversation: row.conversation
                }
              ]
            })
          }
        }
      }
      if (!observation_exists) {
        obj_data.observations.push({
          title: row.observation,
          episode_parts: [
            {
              label: row.episode,
              interactions: [
                {
                  initiator: row.initiator,
                  technology: row.technology,
                  receiver: row.receiver,
                  duration: row.duration,
                  conversation: row.conversation
                }
              ]
            }
          ]
        })
      }
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write(JSON.stringify(obj_data));
    response.end();
  })
}

app.get("/", (request, response) => {
  response.send("IEA backend running");
});

app.get("/get-data", async (request, response) => {
  let data;
  let file_name = request.query.src_file;
  const file_type = get_file_type(file_name);
  try {
    if (file_type == 'yaml') send_yaml_data(file_name, response);
    else if (file_type == 'json') send_json_data(file_name, response);
    else if (file_type == 'csv') send_csv_data(file_name, response);

  } catch (e) {
    console.log(e);
    data = {
      content: "err data",
    };
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write(JSON.stringify(data));
    response.end();
  }
});

app.post("/upload-data", async (req, res) => {
  try {
    if (!req.files) {
      res.send({
        status: false,
        message: "No file uploaded",
      });
    } else {
      let data_file = req.files.data_file;

      data_file.mv(`./uploads/${data_file.name}`);
      res.send();
    }
  } catch (err) {
    console.log("something went wrong");
    res.status(500).send(err);
  }
});

app.get("/convert-yaml-csv", async (req, res) => {
  console.log("converting yaml data to csv");
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

  let csv_data = `observation, episode part, initiator, technology, receiver, duration, conversation`;

  for (let i = 0; i < data.observations.length; i++) {
    const observation = data.observations[i];
    for (let j = 0; j < observation.episode_parts.length; j++) {
      const episode_part = observation.episode_parts[j];
      for (let k = 0; k < episode_part.interactions.length; k++) {
        const interaction = episode_part.interactions[k];
        csv_data += `
        ${observation.title}, ${episode_part.label}, ${interaction.initiator}, ${interaction.technology}, ${interaction.receiver}, ${interaction.duration}, ${clean_data(interaction.conversation)}`;
      }
    }
  }

  data = {
    csv_content: csv_data
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.write(JSON.stringify(data));
  res.end();
});

app.listen(process.env.PORT || 2020);
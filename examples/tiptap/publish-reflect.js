const { spawn } = require("child_process");
const fs = require("fs");
var path = require("path");

const appBaseName = "reflect-type";
const refName = getEnv(
  process.env.VERCEL_GIT_COMMIT_REF,
  "VERCEL_GIT_COMMIT_REF"
);

const appName = `${appBaseName}-${refName}`
  .toLowerCase()
  .replace(/^[^a-z]/, "")
  .replace(/[^a-z0-9-]/g, "-");

publish();

async function publish() {
  const output = JSON.parse(
    await runCommand("npx", [
      "reflect",
      "publish",
      "--server-path=./src/reflect/index.ts",
      "--reflect-channel=canary",
      `--app=${appName}`,
      "--auth-key-from-env=REFLECT_AUTH_KEY",
      "--output=json",
    ])
  );
  if (output.success) {
    fs.writeFileSync("./.env", `NEXT_PUBLIC_REFLECT_URL=${output.url}`);
  }

  console.log("wrote env file at: ", path.resolve("./.env"));
  console.log(fs.readFileSync("./.env").toString());
}

function runCommand(command, args) {
  console.log("running command: " + command + " " + args.join(" "));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
      process.stdout.write(data);
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve(output);
      }
    });
  });
}

function getEnv(v, name) {
  if (!v) {
    throw new Error("Missing required env var: " + name);
  }
  return v;
}

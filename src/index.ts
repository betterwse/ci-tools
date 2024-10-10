#!/usr/bin/env node
require("./junit-parser");
require("./spotbugs-parser");
require("./checkstyle-parser");

import { commandHandler } from "./command-handler";

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.splice(1);

commandHandler
  .execute(command, commandArgs)
  .then((res) => {
    if (res.errorCount > 0) {
      console.error(`Validation found ${res.errorCount} issues :/`);
      process.exit(1);
    }
    console.log(`Successfully executed ${command}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
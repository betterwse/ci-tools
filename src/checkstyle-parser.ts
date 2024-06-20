import path from "path";
const fs = require('fs').promises;
var dots = require("dot").process({ path: path.join(__dirname, "templates")});

import { CommandResult, commandHandler } from "./command-handler";
import { parseParserOptions } from "./common";
import { error } from "console";

const COMMAND_NAME = "checkstyle";

const checkStyleParser = async (args: string[]): Promise<CommandResult> => {
    throw new Error("asdfa");
}


commandHandler.register(COMMAND_NAME, checkStyleParser);
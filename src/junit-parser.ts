import { CommandResult, commandHandler } from "./command-handler";

const COMMAND_NAME = "junit";

const junitParser = async (args: string[]): Promise<CommandResult> => {
  return {
    exitStatus: 1,
    
  }
}

commandHandler.register(COMMAND_NAME, junitParser);




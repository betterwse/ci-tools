import { OptDict } from "./common";

export type CommandExecutor = (commandArgs: string[]) => Promise<CommandResult>;
export interface CommandResult {
  errorCount: number;
  output?: string[];
}

class CommandHandler {
  private readonly commands: OptDict<CommandExecutor> = {};

  execute(commandName: string, args: string[]): Promise<CommandResult> {
    const handler = this.commands[commandName];
    if (handler == null) {
      throw new Error("command not found");
    }
    return handler(args);
  }

  register(commandName: string, executor: CommandExecutor): void {
    console.log("regiter " + commandName);
    if (this.commands[commandName] != null) {
      throw new Error("command named already registered");
    }
    this.commands[commandName] = executor;
  }

}


export const commandHandler = new CommandHandler();

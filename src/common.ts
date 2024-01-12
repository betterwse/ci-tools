export interface OptDict<T> {
  [key: string]: T | undefined;
}

export interface ParserOptions {
  [key: string]: string | string[];
  outDir: string;
  files: string[];
}

const COMMAND_PREFIX = "--";

const isParserOptions = (res: any): res is ParserOptions => {
  return res.outDir != null && res.files?.length != null
}

const toArgValue = (values: string[]): string | string[] => {
  if (values.length === 1) {
    return values[0];
  }
  return values;
}

const toArgName = (arg: string): string => {
  return arg.replace(COMMAND_PREFIX, "");
}

export const parseParserOptions = (args: string[]): ParserOptions  => {
  const res: OptDict<string | string[]> = {};
  let argName: string | undefined = undefined;
  let argValues: string[] = [];

  while (args.length > 0) {
    const arg = args.shift();
    if (arg != null) {
      if (arg.startsWith(COMMAND_PREFIX)) {
        // New arg, save
        if (argName != null) {
          res[argName] = toArgValue(argValues);
        }
        // clear
        argValues = [];
        // and store
        argName = toArgName(arg);
      } else {
        argValues.push(arg);
      }
    }
  }
  if (argName != null) {
    res[argName] = toArgValue(argValues);
  }
  if (isParserOptions(res)) {
    return res;
  }

  throw new Error("failed to parse command options");
}
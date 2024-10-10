import path from "path";
const fs = require('fs').promises;

export interface OptDict<T> {
  [key: string]: T | undefined;
}

export interface ParserOptions {
  [key: string]: string | string[];
  outDir: string;
  sourceDir: string;
}

const COMMAND_PREFIX = "--";

const isParserOptions = (res: any): res is ParserOptions => {
  return res.outDir != null && res.sourceDir != null
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



export const readSourceDir = async (dirName: string, nameFilter: RegExp, result: string[] = []): Promise<string[]> => {

  const content = await fs.readdir(dirName);
  for (const f of content) {
    const stat = await fs.stat(path.join(dirName, f));
  
    if (stat.isDirectory()) {
      await readSourceDir(path.join(dirName, f), nameFilter, result)
    } else if (stat.isFile()) {
      if (nameFilter.test(f)) {
        result.push(path.join(dirName, f));
      }
    }  
  }
  return result;

}
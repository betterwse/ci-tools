import path from "path";
const fs = require('fs').promises;
var dots = require("dot").process({ path: path.join(__dirname, "templates")});

import { CommandResult, commandHandler } from "./command-handler";
import { parseParserOptions } from "./common";

const COMMAND_NAME = "spotbugs";

interface SpotBugsResultItem {
  groupName: string[];
  sourceFile: string;
  sourceLine: number;
  bugId: string;
  bugDescription: string;
}

const ROW_PARSER = new RegExp(/(.*): (.*)[Aa]t(.*):\[line ([0-9]+)/);
interface GroupCollector {
  collecting: boolean;
  result: string[];
}

const parseFile = async (fileName: string): Promise<SpotBugsResultItem[]> => {
  const groupName: string[] = fileName
    .split("/")
    .reverse()
    .reduce((prev: GroupCollector, curr) => {
      if (curr.endsWith(".xml")) {
        prev.result.push(curr.replace(".xml", ""));
      } else if (curr === "build") {
        return {
          collecting: true,
          result: prev.result,
        }
      } else if (curr === "bw-service") {
        // Done
        return {
          collecting: false,
          result: prev.result,
        }
      } else if (prev.collecting) {
        prev.result.push(curr);
      }
      return prev;
      
    }, {collecting: false, result: []})
    .result
    .reverse();
  

  const data = await fs.readFile(fileName, "utf8");
  return data
    .split("\n")
    .filter((row) => row != null && row.length > 0)
    .map((row): SpotBugsResultItem => {
      const parts = row.match(ROW_PARSER);
      if (parts == null) {
        return {
          groupName,
          sourceFile: "UNKNOWN",
          sourceLine:-1,
          bugId: "UNKNOWN",
          bugDescription: row,
        }
      }
      return {
        groupName,
        sourceFile: parts[3]?.trim() ?? "UNKNOWN",
        sourceLine: parseInt(parts[4] ?? -1),
        bugId: parts[1]?.trim() ?? "UNKNOWN",
        bugDescription: parts[2]?.trim() ?? "UNKNOWN",
      }
    });
}



interface SpotBugsResultGroup {
  groupPartName: string;
  name: string;
  children: SpotBugsResultGroup[];
  items: SpotBugsResultItem[];
}

const renderGroup = (group: SpotBugsResultGroup, level = 0): string => {
  const children = group.children.map((c) => renderGroup(c, level + 1)).join("");
  return dots.spotbugsGroup({
    name: group.name,
    children: children,
    items: group.items,
    level,
  });
}


const spotbugsParser = async (args: string[]): Promise<CommandResult> => {
  const options = parseParserOptions(args);

  // Collect all items
  const items: SpotBugsResultItem[] = []; 
  await Promise.all(options.files.map(async (file) => {
    const parsedItems = await parseFile(file);
    items.push(...parsedItems);
  }));

  // Prepare data, sort and group
  const groupRoot: SpotBugsResultGroup = {
    groupPartName: "",
    name: "Spotbugs Result",
    children: [],
    items: [],
  };
  items.forEach((item) => {
    const groupEntry: SpotBugsResultGroup = item.groupName
      .reduce((groupItem, i) => {
        const child = groupItem.children.find((c) => c.groupPartName === i);
        if (child != null) {
          return child;
        } 

        // Create new entry
        const newChild = {
          groupPartName: i,
          name: groupItem.groupPartName + "/" + i,
          children: [],
          items: [],
        };
        groupItem.children.push(newChild);
        return newChild;
      }, groupRoot);
    groupEntry.items.push(item);
  });

  // Generate
  const content = renderGroup(groupRoot);
  const report = dots.spotbugs({
    content,
  });
  await fs.writeFile(path.join(options.outDir, "spotbugs.html"), report);


  //console.log(JSON.stringify(groupRoot, null, 2));

  // Generate report
  //console.log(dots.spotbugs({
  //  result: groupRoot,
 //}));

  return {
    exitStatus: 1,
    
  }
}

commandHandler.register(COMMAND_NAME, spotbugsParser);




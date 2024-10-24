import path from "path";
const fs = require('fs').promises;
var dots = require("dot").process({ path: path.join(__dirname, "templates")});

import { CommandResult, commandHandler } from "./command-handler";
import { parseParserOptions, readSourceDir } from "./common";

const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");
const COMMAND_NAME = "checkstyle";


interface CheckstyleResultItem {
  groupName: string[];
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  bugDescription: string;
  severity: string;
}


interface CheckstyleResultGroup {
  groupPartName: string;
  name: string;
  children: CheckstyleResultGroup[];
  items: CheckstyleResultItem[];
  itemCount: number;
}

const renderGroup = (group: CheckstyleResultGroup, level = 0): string => {
  const children = group.children.map((c) => renderGroup(c, level + 1)).join("");
  if(level === 0){
    return dots.checkstyleTitle({
      name: group.name,
      children: children,
      items: group.items,
      level,
      itemCount: group.itemCount,
    });
  }
  return dots.checkstyleGroup({
    name: group.name,
    children: children,
    items: group.items,
    level,
    itemCount: group.itemCount,
  });
}

const checkStyleParser = async (args: string[]): Promise<CommandResult> => {

  //get data
  const options = parseParserOptions(args);
  const files = await readSourceDir(path.join(options.sourceDir), new RegExp(/.*\.xml$/));

  const errors: any[] = [];
  for (const file of files) {
    const data = await fs.readFile(file, "UTF-8");

    const parserOptions = {
      ignoreAttributes: false, 
      attributeNamePrefix : ""
    };

    const parser = new XMLParser(parserOptions);
    const result = parser.parse(data, true)
    const items = Array.isArray(result.checkstyle.file) ? result.checkstyle.file : [result.checkstyle.file];
    errors.push(...items.filter(e=>e.error));
  }

  const formattedErrors = errors
  .flatMap((row): CheckstyleResultItem [] => {
    const groupName: string [] = row.name
    .split("/src/")
    .map((element, i) =>{
      if(i === 0){
        return element.split("/").reverse()[0]

      }
      return element.split("/")[0]
    })
    const rowErrors = Array.isArray(row.error)?row.error:[row.error]; 

    return rowErrors.map((error): CheckstyleResultItem =>{
      return {
      groupName: groupName,
      sourceFile: row.name.split("/").reverse()[0],
      sourceLine: parseInt(error.line),
      sourceColumn: parseInt(error.column),
      bugDescription: error.message,
      severity: error.severity,
      }
    })    
  });
  
  
  // Prepare data, sort and group
  const groupRoot: CheckstyleResultGroup = {
    groupPartName: "",
    name: "Checkstyle Result",
    children: [],
    items: [],
    itemCount: 0,
  };
  formattedErrors.forEach((item) => {
    const groupEntry: CheckstyleResultGroup = item.groupName
      .reduce((groupItem, i) => {
        const child = groupItem.children.find((c) => c.groupPartName === i);
        if (child != null) {
          return child;
        } 

        // Create new entry
        const newChild = {
          groupPartName: i,
          name: i,
          children: [],
          items: [],
          itemCount: 0,
        };
        groupItem.children.push(newChild);
        return newChild;
      }, groupRoot);
    groupEntry.items.push(item);
  });
  calculateItemCount(groupRoot);

  // Generate
  const content = renderGroup(groupRoot);
  const report = dots.checkstyle({
    content,
  });
  await fs.writeFile(path.join(options.outDir, "checkstyle.html"), report);

  return {
    errorCount: groupRoot.itemCount,
  }
}




const calculateItemCount = (node: CheckstyleResultGroup):number=>{
  const childcount = node.children.reduce((p, c) =>{
    return calculateItemCount(c) + p
  }, 0)
  node.itemCount = childcount + node.items.length;
  return node.itemCount;
}


commandHandler.register(COMMAND_NAME, checkStyleParser);
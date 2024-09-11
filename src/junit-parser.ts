import path from "path";
const fs = require('fs').promises;
var dots = require("dot").process({ path: path.join(__dirname, "templates")});

import { CommandResult, commandHandler } from "./command-handler";
import { parseParserOptions } from "./common";

const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");
const COMMAND_NAME = "junit";

type resultType =  "error"|"failure"|"skipped"|"success";
interface JunitResultItem {
  groupName: string[];
  testName: string;
  bugDescription: string;
  result: resultType;
}

interface JunitResultGroup {
  groupPartName: string;
  name: string;
  children: JunitResultGroup[];
  items: JunitResultItem[];
  itemCount: {
    tests: number;
    skipped: number;
    failures: number;
    errors: number;
  }
}

const renderGroup = (group: JunitResultGroup, level = 0, add : string[] = []): string => {  
  if((group.children.length === 1 || group.items.length === 0)){
    add.push(group.children[0].name); 
    if(level !== 0){
      return renderGroup(group.children[0], level+1, add)
    }
  } 
  
  if(level === 0){
    const children = group.children.map((c) => renderGroup(c, level + 1,add)).join("");
    return dots.junitTitle({
      name: group.name,
      children: children,
      items: group.items,
      level,
      itemCount: group.itemCount,
    });
  }

  const children = group.children.map((c) => renderGroup(c, level + 1)).join("");
  return dots.junitGroup({
    name: add.length?add.join("/"):group.name,
    children: children,
    items: group.items,
    level,
    itemCount: group.itemCount,
  });
}


const junitParser = async (args: string[]): Promise<CommandResult> => {
  let results:any[] = [];
  //get data
  const options = parseParserOptions(args);

  for(let file of options.files){

    const data = await fs.readFile(file, "UTF-8");

    const parserOptions = {
      ignoreAttributes: false, 
      attributeNamePrefix : ""
    };

    const parser = new XMLParser(parserOptions);
    let parsed = parser.parse(data, true).testsuite.testcase;
    if(!Array.isArray(parsed)){
      parsed = [parsed];
    }
    results = [...results, ...parsed];
  }

  const formattedErrors = results
  .map((row): JunitResultItem => {
    const groupName: string[] = row.classname.split(".");
    let result:resultType = "success";
    if(row.failure){
      result = "failure";
    } else if(row.skipped){
      result = "skipped";
    } else if(row.error){
      result = "error";
    }

    return {
      groupName,
      testName: row.name, 
      bugDescription: row.failure?.message,
      result,
    }
  })
    

  // Prepare data, sort and group
  const groupRoot: JunitResultGroup = {
    groupPartName: "",
    name: "Junit Result",
    children: [],
    items: [],
    itemCount: {
      tests: 0,
      skipped: 0,
      failures: 0,
      errors: 0,
    },
  };
  formattedErrors.forEach((item) => {
    const groupEntry: JunitResultGroup = item.groupName
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
          itemCount: {tests:0,skipped:0,failures:0,errors:0},
        };
        groupItem.children.push(newChild);
        return newChild;
      }, groupRoot);
    groupEntry.items.push(item);
  });
  calculateItemCount(groupRoot);
  // Generate
  const content = renderGroup(groupRoot);
  const report = dots.junit({
    content,
  });
  await fs.writeFile(path.join(options.outDir, "junit.html"), report);

  return {
    exitStatus: 1,
  }

}

const calculateItemCount = (node: JunitResultGroup)=>{
  const childcount = node.children.reduce((p, c) =>{
    const a = calculateItemCount(c);
    return {
      tests: a.tests + p.tests,
      skipped: a.skipped + p.skipped,
      failures: a.failures + p.failures,
      errors: a.errors + p.errors,
    }
  }, {tests:0,skipped:0,failures:0,errors:0,})

  let itemResults = node.items.reduce((p,c)=> {
    switch(c.result){
      case "skipped":
        p.skipped++;
        break;
      case "failure":
        p.failures++;
        break;
      case "error":
        p.errors++;
        break;
    }
    return p;
  },  {tests:0,skipped:0,failures:0,errors:0,})
  node.itemCount = {
    tests: childcount.tests + node.items.length,
    skipped: childcount.skipped + itemResults.skipped,
    failures: childcount.failures + itemResults.failures,
    errors: childcount.errors + itemResults.errors,
  }
  return node.itemCount;
}


commandHandler.register(COMMAND_NAME, junitParser);




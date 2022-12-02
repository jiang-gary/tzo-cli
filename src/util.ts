const ora = require("ora");
const fs = require("fs-extra");
const path = require("path");
import { FileStat } from "fs-extra";

function sleep(n: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, n);
  });
}

export async function loading(message: string, fn, ...args) {
  const spinner = ora(message).start();
  // 开始加载
  try {
    let executeRes = await fn(...args);
    spinner.succeed();
    return executeRes;
  } catch (error) {
    spinner.fail("request fail, reTrying");
    await sleep(1000);
    return loading(message, fn, ...args);
  }
}

export function clearConsole() {
  const readline = require("readline");
  if (process.stdout.isTTY) {
    const blank = "\n".repeat(process.stdout.rows);
    console.log(blank);
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  }
}

export function readDirWithFileTypes(folder: string): FileStat[] {
  const list = fs.readdirSync(folder);
  const res = list.map((name) => {
    const stat = fs.statSync(path.join(folder, name));
    return {
      name,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
    };
  });
  return res;
}

export function getRootPath(): string {
  return path.resolve(__dirname, "../");
}

export function getPkgVersion(): string {
  return require(path.join(getRootPath(), "package.json")).version;
}

export const getAllFilesInFolder = async (
  folder: string,
  filter: string[] = []
): Promise<string[]> => {
  let files: string[] = [];
  const list = readDirWithFileTypes(folder);

  await Promise.all(
    list.map(async (item) => {
      const itemPath = path.join(folder, item.name);
      if (item.isDirectory) {
        const _files = await getAllFilesInFolder(itemPath, filter);
        files = [...files, ..._files];
      } else if (item.isFile) {
        if (!filter.find((rule) => rule === item.name)) files.push(itemPath);
      }
    })
  );

  return files;
};

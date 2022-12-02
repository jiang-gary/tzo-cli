import * as ora from "ora";

import { LYLB_TZO_UI, TARO_JS_CLI, TEMPLATE_CREATOR } from "./constants";
import * as download from "download-git-repo";
const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const axios = require("axios");

import { readDirWithFileTypes } from "./util";

const TEMP_DOWNLOAD_FOLDER = "taro-temp";

export interface ITemplates {
  name: string;
  platforms?: string | string[];
  desc?: string;
}

export default function fetchTemplate(
  templateSource: string,
  templateRootPath: string
) {
  const tempPath = path.join(templateRootPath, TEMP_DOWNLOAD_FOLDER);
  let name: string;
  return new Promise<void>(async (resolve) => {
    if (!fs.existsSync(templateRootPath)) await fs.mkdir(templateRootPath);
    if (fs.existsSync(tempPath)) await fs.remove(tempPath);
    await fs.mkdir(tempPath);

    const spinner = ora(`正从${templateSource} 拉取远程模板...`).start();

    name = path.basename(templateSource);

    download(
      templateSource,
      path.join(tempPath, name),
      { clone: true },
      async (error) => {
        if (error) {
          console.log(error);
          spinner.color = "red";
          spinner.fail(chalk.red("拉取远程模板仓库失败"));
          await fs.remove(tempPath);
          return resolve();
        }
        spinner.color = "green";
        spinner.succeed(`${chalk.grey("拉取远程模板仓库成功呢！")}`);
        return resolve();
      }
    );
  }).then(async () => {
    const templateFolder = name ? path.join(tempPath, name) : "";
    if (!fs.existsSync(templateFolder)) return Promise.resolve([]);
    const files = readDirWithFileTypes(templateFolder)
      .filter(
        (file) =>
          !file.name.startsWith(".") &&
          file.isDirectory &&
          file.name !== "__MACOSX"
      )
      .map((file) => file.name);
    await Promise.all(
      files.map((file) => {
        const src = path.join(templateFolder, file);
        const dest = path.join(templateRootPath, file);
        return fs.move(src, dest, { overwrite: true });
      })
    );
    await fs.remove(tempPath);
    const res: ITemplates[] = files.map((name) => {
      const creatorFile = path.join(templateRootPath, name, TEMPLATE_CREATOR);
      if (!fs.existsSync(creatorFile)) return { name };
      const { platforms = "", desc = "" } = require(creatorFile);
      return {
        name,
        platforms,
        desc,
      };
    });
    return Promise.resolve(res);
  });
}

export async function getTzoUiVersion(
  versionType: string = "beta"
): Promise<string> {
  try {
    const spinner = ora(`获取组件库版本信息`).start();
    const res = await axios.get(LYLB_TZO_UI);
    // console.log(res);
    if (res.status === 200) {
      const versionInfo = res.data["dist-tags"];
      const currentVersion = versionInfo[versionType];
      spinner.succeed(`${chalk.green("获取组件版本信息成功")}`);
      return Promise.resolve(currentVersion);
    } else {
      return Promise.resolve("");
    }
    // spinner.fail("失败", res);
  } catch (e) {
    console.log(e);
    return Promise.resolve("");
  }
}

export async function getTaroJsVersion(
  versionType: string = "latest"
): Promise<string> {
  try {
    const spinner = ora(`获取Taro版本信息`).start();
    const res = await axios.get(TARO_JS_CLI);
    if (res.status === 200) {
      const versionInfo = res.data["dist-tags"];
      const currentVersion = versionInfo[versionType];
      spinner.succeed(`${chalk.green("获取组件版本信息成功")}`);
      return Promise.resolve(currentVersion);
    } else {
      return Promise.resolve("");
    }
    // spinner.fail("失败", res);
  } catch (e) {
    console.log(e);
    return Promise.resolve("");
  }
}

const path = require("path");
const fs = require("fs-extra");

const Inquirer = require("inquirer");

import { loading } from "./util";
import Project, { IProjectConf } from "./project";

module.exports = async function (name: string, options: any) {
  // 获取当前的工作目录
  const cwd = process.cwd();
  const targetDirectory = path.join(cwd, name);

  if (fs.existsSync(targetDirectory)) {
    if (options.force) {
      // 当配置强制覆盖
      await fs.remove(targetDirectory);
    } else {
      let { isOverwrite } = await Inquirer.prompt([
        {
          name: "isOverwrite",
          type: "list",
          message: "文件夹已存在，是否清除已有文件夹",
          choices: [
            { name: "Overwrite", value: true },
            { name: "cancel", value: false },
          ],
        },
      ]);
      if (!isOverwrite) {
        console.log("cancel");
        return;
      } else {
        await loading(
          `Remove ${name},please wait a minute`,
          fs.remove,
          targetDirectory
        );
        console.log("移除成功");
      }
    }
  }
  const conf: Partial<IProjectConf> = {
    projectName: name,
    projectDir: cwd,
  };
  const creator = new Project(conf);
  creator.create();
};

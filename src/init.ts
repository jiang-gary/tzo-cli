import Creator from "./creator";
import { IProjectConf } from "./project";
import * as path from "path";
import * as fs from "fs-extra";
import * as chalk from "chalk";
import * as ora from "ora";
import { getAllFilesInFolder } from "./util";
import { getTzoUiVersion, getTaroJsVersion } from "./api";
import { exec } from "child_process";
import { LYLB_TZO_UI_VER, TARO_JS_CLI_VER } from "./constants";
import packagesManagement from "./config/packagesManagement";

export const TEMPLATE_CREATOR = "template_creator.js";
const CONFIG_DIR_NAME = "config";
const styleExtMap = {
  sass: "scss",
  less: "less",
  stylus: "styl",
  none: "css",
};
const doNotCopyFiles = [".DS_Store", ".npmrc", TEMPLATE_CREATOR];
const PACKAGE_JSON_ALIAS_REG = /\/pkg$/;

// 创建文件方法
function createFiles(
  creator: Creator,
  files: string[],
  handler,
  options: IProjectConf & {
    templatePath: string;
    projectPath: string;
    pageName: string;
    period: string;
    version?: string;
    tzoUiVersion: string;
  }
): string[] {
  const {
    description,
    projectName,
    version,
    taroVersion,
    css,
    date,
    typescript,
    template,
    templatePath,
    projectPath,
    pageName,
    framework,
    compiler,
    tzoUiVersion,
  } = options;
  const logs: string[] = [];
  const globalChangeExt = Boolean(handler);
  const currentStyleExt = (css && styleExtMap[css]) || "css";

  // 遍历所有文件进行处理
  files.forEach(async (file) => {
    const fileRePath = file
      .replace(templatePath, "")
      .replace(new RegExp(`\\${path.sep}`, "g"), "/");

    let externalConfig: any = null;
    // 去除vue文件
    if (file.endsWith(".vue")) {
      return;
    }
    // 跑自定义的逻辑  确定是否创建这个文件
    if (handler && typeof handler[fileRePath] === "function") {
      externalConfig = handler[fileRePath](options);
      if (!externalConfig) return;
    }

    let changeExt = globalChangeExt;
    if (externalConfig && typeof externalConfig === "object") {
      if (externalConfig.changeExt === false) {
        changeExt = false;
      }
    }

    // 合并自定义  config
    const config = Object.assign(
      {},
      {
        description,
        projectName,
        version,
        css,
        cssExt: currentStyleExt,
        date,
        typescript,
        template,
        pageName,
        framework,
        taroVersion,
        compiler,
        tzoUiVersion,
      },
      externalConfig
    );

    let destRePath = fileRePath;

    destRePath = destRePath.replace(/^\//, "");

    if (
      typescript &&
      changeExt &&
      !destRePath.startsWith(`${CONFIG_DIR_NAME}`) &&
      (path.extname(destRePath) === ".js" ||
        path.extname(destRePath) === ".jsx") &&
      !(
        destRePath.endsWith("babel.config.js") ||
        destRePath.endsWith(".eslintrc.js")
      )
    ) {
      destRePath = destRePath.replace(".js", ".ts");
    }
    if (changeExt && path.extname(destRePath).includes(".css")) {
      destRePath = destRePath.replace("css", `${currentStyleExt}`);
    }

    // 兼容 Nodejs 13+ 调用 require 时 package.json 格式不能非法
    if (taroVersion === "taro2" && PACKAGE_JSON_ALIAS_REG.test(fileRePath)) {
      destRePath = path.join(
        fileRePath.replace(PACKAGE_JSON_ALIAS_REG, "/package.json")
      );
      console.log(destRePath);
    }

    creator.template(
      template as string,
      fileRePath,
      path.join(projectPath, destRePath),
      config
    );
    const destinationPath = creator.destinationPath(
      path.join(projectPath, destRePath)
    );

    logs.push(
      `${chalk.green("✔ ")}${chalk.grey(`创建文件: ${destinationPath}`)}`
    );
  });
  return logs;
}

export async function createApp(creator: Creator, params: IProjectConf, cb) {
  const {
    projectName,
    projectDir,
    template,
    autoInstall = true,
    framework,
    taroVersion,
  } = params;

  const logs: string[] = [];

  // 项目目录
  const projectPath = path.join(projectDir, projectName);
  const templatePath = creator.templatePath(template as string);

  const version =
    (await getTaroJsVersion(
      (taroVersion as string) === "taro2" ? "2.x" : "latest"
    )) || TARO_JS_CLI_VER;

  const tzoUiVersion =
    (await getTzoUiVersion(
      (taroVersion as string) === "taro2" ? "latest" : "beta"
    )) || LYLB_TZO_UI_VER;

  // 遍历出模板中的所有文件
  const files = await getAllFilesInFolder(templatePath, doNotCopyFiles);

  // 引入模板中的自定义逻辑
  const handlerPath = path.join(templatePath, TEMPLATE_CREATOR);
  const handler = fs.existsSync(handlerPath) ? require(handlerPath) : null;

  // wei

  logs.push(
    ...createFiles(creator, files, handler, {
      ...params,
      framework,
      version,
      templatePath,
      projectPath,
      tzoUiVersion,
      pageName: "index",
      taroVersion,
      period: "createApp",
    })
  );

  creator.fs.commit(async () => {
    // logs
    console.log();
    console.log(
      `${chalk.green("✔ ")}${chalk.grey(
        `创建项目: ${chalk.grey.bold(projectName)}`
      )}`
    );
    logs.forEach((log) => console.log(log));

    console.log();

    // git init
    const gitInitSpinner = ora(
      `cd ${chalk.cyan.bold(projectName)},执行 ${chalk.cyan.bold("git init")}`
    ).start();
    process.chdir(projectPath);
    const gitInit = exec("git init");
    gitInit.on("close", (code) => {
      if (code === 0) {
        gitInitSpinner.color = "green";
        gitInitSpinner.succeed(gitInit.stdout!.read());
      } else {
        gitInitSpinner.color = "red";
        gitInitSpinner.fail(gitInit.stderr!.read());
      }
    });

    const callSuccess = () => {
      console.log(
        chalk.green(`创建项目 ${chalk.green.bold(projectName)} 成功！`)
      );
      console.log(
        chalk.green(
          `请进入项目目录 ${chalk.green.bold(projectName)} 开始工作吧！😝`
        )
      );
      if (typeof cb === "function") {
        cb();
      }
    };

    if (autoInstall) {
      const command: string = packagesManagement[taroVersion as string].command;
      const installSpinner = ora(
        `执行安装依赖 ${chalk.cyan.bold(command)}, 需要一会...`
      ).start();
      const child = exec(command, (error) => {
        if (error) {
          installSpinner.color = "red";
          installSpinner.fail(chalk.red("安装项目依赖失败，请自行重新安装！"));
          console.log(error);
        } else {
          installSpinner.color = "green";
          installSpinner.succeed("安装成功");
        }
        callSuccess();
      });
      child.stdout!.on("data", function (data) {
        installSpinner.stop();
        console.log(data.replace(/\n$/, ""));
        installSpinner.start();
      });
      child.stderr!.on("data", function (data) {
        installSpinner.warn(data.replace(/\n$/, ""));
        installSpinner.start();
      });
    } else {
      callSuccess();
    }
  });
}

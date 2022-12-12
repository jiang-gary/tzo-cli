const Inquirer = require("inquirer");
import { clearConsole } from "./util";
import fetchTemplate, { ITemplates } from "./api";
import { SOURCE_DIR } from "./constants";
const chalk = require("chalk");
const fs = require("fs-extra");
import Creator from "./creator";
import { createApp } from "./init";

export interface IProjectConf {
  projectName: string;
  projectDir: string;
  description?: string;
  typescript?: boolean;
  framework?: string;
  taroVersion: string | null;
  compiler?: string;
  css?: "none" | "sass" | "stylus" | "less";
  templateSource?: string;
  clone?: boolean;
  template?: string | null;
  npm?: string;
  src?: string;
  date?: string;
  sourceRoot?: string;
  autoInstall?: boolean;
}

export default class Project extends Creator {
  public conf: IProjectConf;
  // 项目名称及项目路径
  constructor(options: Partial<IProjectConf>) {
    super(options.sourceRoot);
    this.conf = Object.assign(
      {
        projectName: "",
        projectDir: "",
        taroVersion: null,
        framework: "react",
        npm: "npm",
        compiler: "webpack5",
        template: "default",
        date: "",
        src: "",
        templateSource:
          "direct:https://gitee.com/o2team/taro-project-templates.git#v3.5",
      },
      options
    );
  }
  name: string;
  target: string;
  async create() {
    clearConsole();
    console.log(chalk.green("即将创建一个taro的新项目！！！"));
    console.log();
    try {
      const answers = await this.ask();
      this.conf.template =
        answers.taroVersion === "taro2" ? "default-taro2" : "default";
      const date = new Date();
      this.conf = Object.assign(this.conf, answers);
      this.conf.date = `${date.getFullYear()}-${
        date.getMonth() + 1
      }-${date.getDate()}`;
      this.write();
    } catch (error) {
      console.log(chalk.red("创建项目失败：", error));
    }
  }

  async ask() {
    let prompts: Record<string, unknown>[] = [];
    const conf = this.conf;
    this.askTaroVersion(conf, prompts);
    this.askProjectName(conf, prompts);
    this.askDescription(conf, prompts);
    this.askTypescript(conf, prompts);
    this.askCSS(conf, prompts);
    const answers = await Inquirer.prompt(prompts);
    // 清空 重新收集
    // prompts = [];
    // const templates = await this.fetchTemplates();
    // await this.askTemplate(conf, prompts, templates);
    // const templateChoiceAnswer = await Inquirer.prompt(prompts);
    return {
      ...answers,
      // ...templateChoiceAnswer,
    };
  }

  askTaroVersion = function (conf, prompts) {
    const taroChoices = ["taro2", "taro3"];
    if ((typeof conf.taroVersion as string | undefined) !== "string") {
      prompts.push({
        type: "list",
        name: "taroVersion",
        message: "请选择 Taro的版本",
        choices: taroChoices,
      });
    }
  };

  askProjectName = function (conf, prompts) {
    if ((typeof conf.projectName as string | undefined) !== "string") {
      prompts.push({
        type: "input",
        name: "projectName",
        message: "请输入项目名称！",
        validate(input) {
          if (!input) {
            return "项目名不能为空！";
          }
          if (fs.existsSync(input)) {
            return "当前目录已经存在同名项目，请换一个项目名！";
          }
          return true;
        },
      });
    } else if (fs.existsSync(conf.projectName)) {
      prompts.push({
        type: "input",
        name: "projectName",
        message: "当前目录已经存在同名项目，请换一个项目名！",
        validate(input) {
          if (!input) {
            return "项目名不能为空！";
          }
          if (fs.existsSync(input)) {
            return "项目名依然重复！";
          }
          return true;
        },
      });
    }
  };

  askDescription = function (conf, prompts) {
    if (typeof conf.description !== "string") {
      prompts.push({
        type: "input",
        name: "description",
        message: "请输入项目介绍",
      });
    }
  };

  askTypescript = function (conf, prompts) {
    if (typeof conf.typescript !== "boolean") {
      prompts.push({
        type: "confirm",
        name: "typescript",
        message: "是否需要使用 TypeScript ？",
      });
    }
  };

  askCSS = function (conf, prompts) {
    const cssChoices = [
      {
        name: "Sass",
        value: "sass",
      },
      {
        name: "Less",
        value: "less",
      },
      {
        name: "Stylus",
        value: "stylus",
      },
      {
        name: "无",
        value: "none",
      },
    ];

    if ((typeof conf.css as string | undefined) !== "string") {
      prompts.push({
        type: "list",
        name: "css",
        message: "请选择 CSS 预处理器（Sass/Less/Stylus）",
        choices: cssChoices,
      });
    }
  };

  async fetchTemplates(): Promise<ITemplates[]> {
    const { templateSource } = this.conf;
    // console.log(this.conf);
    const templatePath = this.templatePath("");
    const templateChoices = await fetchTemplate(
      templateSource as string,
      templatePath
    );
    const newTemplateChoices: ITemplates[] = templateChoices.filter(
      (templateChoice) => {
        const { platforms } = templateChoice;
        // console.log(platforms);
        if (typeof platforms === "string" && platforms) {
          return templateChoice.platforms === "react";
        } else if (platforms instanceof Array) {
          return templateChoice.platforms?.includes("react");
        } else {
          return true;
        }
      }
    );
    return newTemplateChoices;
  }

  askTemplate = function (conf, prompts, list: ITemplates[] = []) {
    const choices = [
      {
        name: "默认模板",
        value: "default",
      },
      ...list.map((item) => ({
        name: item.desc ? `${item.name}（${item.desc}）` : item.name,
        value: item.name,
      })),
    ];

    if ((typeof conf.template as "string" | undefined) !== "string") {
      prompts.push({
        type: "list",
        name: "template",
        message: "请选择模板",
        choices,
      });
    }
  };

  write(cb?: () => void) {
    this.conf.src = SOURCE_DIR;
    createApp(this, this.conf, cb).catch((err) => console.log(err));
  }
}

import * as fs from "fs-extra";
import * as memFs from "mem-fs";
import * as editor from "mem-fs-editor";
import * as _ from "lodash";
import * as path from "path";
import { getRootPath } from "./util";

export default class Creator {
  fs: editor.Editor;
  protected _rootPath: string;
  private _destinationRoot: string;
  constructor(sourceRoot?: string) {
    // 创建内存空间
    const store = memFs.create();
    this.fs = editor.create(store);
    this.sourceRoot(sourceRoot || path.join(getRootPath()));
    this.init();
  }
  init() {}
  sourceRoot(rootPath?: string) {
    if (typeof rootPath === "string") {
      this._rootPath = path.resolve(rootPath);
    }
    if (!fs.existsSync(this._rootPath)) {
      fs.ensureDirSync(this._rootPath);
    }
    return this._rootPath;
  }
  templatePath(...args: string[]): string {
    let filepath = path.join.apply(path, args);
    if (!path.isAbsolute(filepath)) {
      filepath = path.join(this._rootPath, "templates", filepath);
    }
    return filepath;
  }
  template(
    template: string,
    source: string,
    dest: string,
    data?: Record<any, any>,
    options?
  ) {
    if (typeof dest !== "string") {
      options = data;
      data = dest;
      dest = source;
    }
    const src = this.templatePath(template, source);
    if (!fs.existsSync(src)) return;
    this.fs.copyTpl(
      src,
      this.destinationPath(dest),
      Object.assign({ _ }, this, data),
      options
    );
    return this;
  }

  destinationRoot(rootPath?: string): string {
    if (typeof rootPath === "string") {
      this._destinationRoot = path.resolve(rootPath);
      if (!fs.existsSync(rootPath)) {
        fs.ensureDirSync(rootPath);
      }
      process.chdir(rootPath);
    }
    return this._destinationRoot || process.cwd();
  }

  destinationPath(...args: string[]): string {
    let filepath = path.join.apply(path, args);
    if (!path.isAbsolute(filepath)) {
      filepath = path.join(this.destinationRoot(), filepath);
    }
    if (filepath.endsWith("package.json.tmpl")) {
      filepath = filepath.replace(".tmpl", "");
    }
    const basename = path.basename(filepath);
    if (basename.startsWith("_")) {
      filepath = path.join(path.dirname(filepath), basename.replace(/^_/, "."));
    }
    return filepath;
  }

  write() {}
}

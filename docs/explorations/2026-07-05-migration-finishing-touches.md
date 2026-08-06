# document26.pages.dev 迁移收尾:线上地址引用更新

> 2026-07-05

迁移主体(CF Pages 新站 + 旧站跳转器)上线后,把仓库里指向旧地址 `ranuts.github.io/document` 的对外引用统一改到 `document26.pages.dev`。

## 改动

| 文件           | 改动                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `package.json` | `homepage` → `https://document26.pages.dev/`(npm 页 / 工具链读取的规范主页) |
| `readme.md`    | Live Demo badge 链接 + "Try it online" → document26.pages.dev               |
| `readme.zh.md` | 在线体验 badge + 链接 → document26.pages.dev                                |
| `CLAUDE.md`    | 线上地址 → document26.pages.dev(注明旧址已跳转至此)                         |

**故意保留旧 URL 的地方**:`redirect/{index,404}.html` 的注释——它们描述的正是"从 `ranuts.github.io/document` 搬走",改了反而语义错。

## 仓库设置(代码外)

- GitHub repo **Website 字段** → `https://document26.pages.dev/`(`gh repo edit`)
- 删除远端分支 `release/v0.0.4`:v7 线已在 `main` 维护,该分支不再需要(CI 触发已全部统一到 main)

## 仍待用户在外部后台做

- **GSC 地址变更**:旧 property → document26.pages.dev,加速 SEO 权重转移 + sitemap 提交

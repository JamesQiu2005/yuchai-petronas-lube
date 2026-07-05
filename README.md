# 玉柴马石油 · 特种润滑解决方案（演示站点）

面向销售演示的静态官网，托管于 GitHub Pages。所有页面正文都由 **Markdown 文件** 渲染，配有一个 **内容管理面板**，非技术人员也能上传 Markdown 更新网站。

线上地址：<https://jamesqiu2005.github.io/yuchai-petronas-lube/>

---

## 一、内容怎么存放

每个页面的正文 = 一个 Markdown 文件（在 `content/` 目录下）。页面打开时，浏览器读取对应的 `.md` 并渲染成带样式的网页——**改内容 = 改 Markdown 文件**，不用碰 HTML。

| 页面 | 内容文件 |
| --- | --- |
| 首页（中段介绍/优势/产品） | `content/pages/home.md` |
| 钢铁冶金 | `content/pages/steel.md` |
| 精密传动与机器人 | `content/pages/precision.md` |
| 电动工具 | `content/pages/power-tools.md` |
| 汽车工业 | `content/pages/automotive.md` |
| 盾构装备 | `content/pages/tbm.md` |
| 关于我们 | `content/pages/about.md` |
| 每个客户案例 | `content/cases/<名字>.md` |
| 案例索引（卡片列表） | `content/cases/manifest.json` |

### Markdown 小约定
- **产品型号用反引号包起来**，例如 `` `G.BESLUX CROWN 系列` ``，会自动渲染成青色药丸标签。
- 表格用标准 Markdown 表格；第一行是表头，会自动套用规格表样式。
- 页面文件开头的 `--- ... ---` 是配置块（标题、页头文字、标签），照着现有文件的格式改即可。
- 行业方案页的左侧目录导航，会根据 `##` 标题**自动生成**，无需手写。

---

## 二、给爸爸的更新方式（内容管理面板）

打开 **`/admin.html`**（例如 <https://jamesqiu2005.github.io/yuchai-petronas-lube/admin.html> ）。
> ⚠️ 这个网址不要发给别人。账号密码都是 `admin`，只是一道简单门槛。

面板里可以：
1. 左侧选择要改的分类（客户案例 / 首页 / 某个行业方案 / 关于我们）；
2. 直接**上传用 Kimi 编辑好的 `.md` 文件**，或在编辑框里改，右侧实时预览；
3. 客户案例填好上方表单（标题、客户、指标等），正文按模板写；
4. 点“发布”。约 1 分钟后网站自动更新。

### 发布有两种方式
- **令牌一键发布（推荐）**：粘贴一次 GitHub 令牌，之后每次点“发布到网站”即可自动提交。令牌只存在自己浏览器里。
  创建令牌：GitHub → Settings → Developer settings → **Fine-grained tokens** → 只授予本仓库 `yuchai-petronas-lube` 的 **Contents 读写** 权限。
- **下载文件手动提交**：不想用令牌时，点“下载 .md 文件”，再到 GitHub 仓库对应目录 `Add file → Upload files` 上传提交。

> 若某些网络下打不开 GitHub（api.github.com），用“下载文件”方式即可。

---

## 三、给开发者：本地构建

页面外壳（导航/页脚）由脚本生成，内容由 Markdown 驱动，**无需打包工具、无 CDN 依赖**（纯系统字体 + 自托管 `marked`，国内可正常访问）。

```bash
# 1) 如改了 site-src/fragments/*.html（设计源），重新生成 Markdown 内容：
python3 site-src/convert.py
# 2) 如改了页面外壳/导航结构，重新生成 HTML 外壳：
python3 site-src/build.py
# 3) 本地预览：
cd site && python3 -m http.server 8000   # 打开 http://localhost:8000
```

- 样式：`assets/css/style.css`
- 页面交互（导航、动效、温度带）：`assets/js/main.js`
- Markdown 渲染引擎：`assets/js/md-render.js`（读取 md → 渲染 → 重上设计系统样式）
- Markdown 解析库：`assets/js/vendor/marked.min.js`（自托管）
- 内容管理面板：`admin.html`

日常只改 Markdown 内容的话，**第 1、2 步都不需要**——直接改 `content/**.md` 提交即可。

---

## 四、上线前待办

1. **联系方式**：`content/pages/about.md` 与页脚中的电话/邮箱为占位文本，替换为真实信息。
2. **客户案例**：`content/cases/*.md` 三个案例为示例数据（页面已标注“示例”），取得客户授权后替换为真实数据。
3. **实景图片**：目前配图为原创矢量插画（无版权风险）。如需替换为实拍图，放入 `assets/img/` 并在 Markdown 里用 `![说明](../assets/img/文件名.jpg)` 引用——请勿使用带水印或未授权的图库图片。

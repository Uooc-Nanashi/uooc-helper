# UOOC 优课学习助手（优课联盟 / 优课在线）

[![通过 GitHub Raw 安装](https://img.shields.io/badge/%E9%80%9A%E8%BF%87_Github_Raw_%E5%AE%89%E8%A3%85-uooc--helper.user.js-green)](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)

[![获取测试版](https://img.shields.io/badge/%e8%8e%b7%e5%8f%96%e6%b5%8b%e8%af%95%e7%89%88-pre--releases%2fuooc--helper.user.js-yellow)](https://github.com/Uooc-Nanashi/uooc-helper/tree/main/pre-releases)

Tampermonkey / Violentmonkey / ScriptCat 用户脚本，用于优课在线（UOOC）学习平台。

## 功能

- 可全自动完成课程
- 课程目录扫描解析、断点续扫
- 视频后台播放、自动倍速播放
- 多方案智能答题：内置免费的 DeepSeek 网页版、豆包网页版支持，也可通过配置使用大模型 API
- 自动提交测验（含智能验证）
- 完善的本地缓存系统，避免遍历操作过多导致资源浪费
- 适配 AI 自动化修复/拓展脚本功能的代码改动应用器：当网页结构布局发生变动时，可零基础自行使用AI修复，无需等待更新

## 安装

### 第一步：安装一个用户脚本管理器

任选其一即可，已装过其中任何一个可跳过：

| 管理器 | 下载地址 |
|---|---|
| **Tampermonkey**（推荐） | [tampermonkey.net](https://www.tampermonkey.net/) |
| **Violentmonkey** | [violentmonkey.github.io](https://violentmonkey.github.io/) |
| **ScriptCat** | [scriptcat.org](https://scriptcat.org/) |

各浏览器扩展商店里搜索名称也可安装

在基于 Chrome 的浏览器中使用脚本的用户，请务必确保启用用户脚本管理器拓展程序的 **"允许用户脚本"** 选项（在 Chrome 138+ 中可通过扩展设置找到）或 启用拓展的 开发者模式。

### 第二步：安装脚本

确保管理器已启用后，点击下面任一方式安装：

**方式一：一键安装**

[点击安装脚本](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)

管理器会在等待片刻后弹出安装确认页，点击「安装」或「确定」即可。

**方式二：手动安装**（推荐，一键安装失败时使用）

1. 打开 [脚本源码](https://github.com/Uooc-Nanashi/uooc-helper/blob/main/uooc-helper.user.js)
2. 全选 `Ctrl+A`，复制 `Ctrl+C`
3. 在拓展页里点击管理器图标 → 添加新脚本/新建脚本
4. 全选删掉默认模板，粘贴 `Ctrl+V` 脚本
5. 保存 `Ctrl+S` 

### 安装后

刷新优课在线课程页面，右下角出现「UOOC 学习助手」面板即成功。

## 快速入门

1. 打开任意课程页`uooc.net.cn`
2. 页面右下角出现「UOOC 学习助手」面板
3. 首次使用：进入 `设置 / 智能闯关设置 / AI 方案`，选择脚本内置的 DeepSeek 网页版或豆包网页版方案，或打开 `管理 AI 方案`，根据文档自行配置网页版和 API 方案。
4. 如需脚本完全自动化，推荐将 `设置 / 智能闯关设置 / 提交方式` 改为 `自动提交`
5. 点击 `任务选择 / 「开始递归」`

## 数据安全

本脚本不收集任何个人信息，所有设置与缓存仅存储在本地浏览器 `localStorage`。

## 常见问题

**Q：`方式一：一键安装`卡在「Script Installation」中间页？**

中间页是 Tampermonkey 的正常中转页，它会把 raw 链接转发到安装对话框。卡住通常是以下原因：

* **网络慢或超时**（常见）：`raw.githubusercontent.com` 在国内访问不稳定。你可以前往[国内脚本库](https://scriptcat.org/zh-CN/script-show-page/8524)下载，也可以使用代理或者镜像站。
* 安装来源限制：Tampermonkey 设置 → 高级 → 安全 → 「允许脚本来源」，添加 `https://raw.githubusercontent.com/*` 后重试。
* 弹窗被拦截：检查地址栏右侧是否有被拦截的弹窗提示，允许后重试。

若以上仍无效，**改用「方式二：手动安装」即可**（这是 Tampermonkey 支持的标准安装方式，与一键安装等效）。

**Q：装完没反应？**

进入 UOOC 网页版，刷新 UOOC 页面；若仍无反应，请检查浏览器右上角管理器图标是否为启用状态，并检查脚本设置页中是否排除了脚本头 `@match` 里需要的域名。

**Q：脚本功能异常？**

请在 [本项目的 Github Issues ](https://github.com/Uooc-Nanashi/uooc-helper/issues) 里反馈，完整说明问题，建议附上脚本日志或控制台的错误信息（提交时请注意**删除个人信息**) 。


## 许可证

[GPL-3.0-or-later](https://www.gnu.org/licenses/gpl-3.0.html#license-text)

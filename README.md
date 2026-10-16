# UOOC 学习助手（优课联盟 / 优课在线）

[![安装脚本](https://img.shields.io/badge/安装-uooc--helper.user.js-green)](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)

Tampermonkey / Violentmonkey / ScriptCat 用户脚本，用于优课在线（UOOC）学习平台。

## 功能

- 课程目录递归扫描、断点续扫
- 视频自动播放（可调速）
- 智能答题：内置 DeepSeek 网页版、豆包网页版支持，也可通过配置使用大模型 API
- 自动提交测验（含智能验证）
- 完善的本地缓存系统，避免遍历操作过多导致资源浪费
- 适配 AI 自动化修复/拓展脚本功能的代码改动应用器：当网页结构布局更改时，可零基础自行使用AI修复，无需等待更新

## 安装

### 第一步：安装一个用户脚本管理器

任选其一即可，已装过其中任何一个可跳过：

| 管理器 | 下载地址 |
|---|---|
| **Tampermonkey**（推荐） | [tampermonkey.net](https://www.tampermonkey.net/) |
| **Violentmonkey** | [violentmonkey.github.io](https://violentmonkey.github.io/) |
| **ScriptCat** | [scriptcat.org](https://scriptcat.org/) |

各浏览器扩展商店里搜索名称也可安装

对于在基于 Chrome 的浏览器中使用 Tampermonkey 扩展（版本 5.3+）的用户，必须启用 **"允许用户脚本"**（在 Chrome 138+ 中可通过扩展设置找到）或 开发者模式。

### 第二步：安装脚本

确保管理器已启用后，点击下面任一方式安装：

**方式一：一键安装**

[点击安装脚本](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)

管理器会弹出安装确认页，点「安装」或「确定」即可。

**方式二：手动安装**（一键安装失败时用）

1. 打开 [脚本源码](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)
2. 全选（Ctrl+A）复制
3. 点管理器图标 → 「添加新脚本」/「新建脚本」
4. 全选删掉默认模板，粘贴脚本
5. Ctrl+S 保存

### 安装后

刷新优课在线课程页面，右下角出现「UOOC 学习助手」面板即成功。

## 快速入门

1. 打开任意课程页`uooc.net.cn`
2. 页面右下角出现「UOOC 学习助手」面板
3. 首次使用：`设置 / 智能闯关设置 / AI 方案`，选择脚本内置的 DeepSeek 网页版或豆包网页版方案，或打开`管理 AI 方案`，根据文档自行配置网页版和 API 方案。
4. 如果需要脚本完全自动化，推荐将`设置 / 智能闯关设置 / 提交方式`改为`自动提交`
5. 点击「▶ 开始递归」

## 数据安全

本脚本不收集任何个人信息，所有设置与缓存仅存储在本地浏览器 `localStorage`。

## 常见问题

**Q：一键安装后卡在「Script Installation」中间页？**

中间页是 Tampermonkey 的正常中转页，它会把 raw 链接转发到安装对话框。卡住通常是以下原因：

- **网络慢或超时**（常见）：`raw.githubusercontent.com` 在国内访问不稳定。请使用代理或者镜像站。
- **安装来源限制**：Tampermonkey 设置 → 高级 → 安全 → 「允许脚本来源」，添加 `https://raw.githubusercontent.com/*` 后重试。
- **弹窗被拦截**：检查地址栏右侧是否有被拦截的弹窗提示，允许后重试。

若以上仍无效，改用「方式二：手动安装」即可（这是 Tampermonkey 支持的标准安装方式，与一键安装等效）。

**Q：装完没反应？**

刷新 UOOC 页面；若仍无反应，检查浏览器右上角管理器图标是否为启用状态。

**Q：脚本功能异常？**

请在 [Issues](https://github.com/Uooc-Nanashi/uooc-helper/issues) 里反馈，完整说明问题，建议附上脚本日志或控制台的错误信息（请注意提交时**删除个人信息**)。


## 许可证

[GPL-3.0-or-later](LICENSE)

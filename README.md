# UOOC 学习助手（优课联盟 / 优课在线）

[![安装脚本](https://img.shields.io/badge/安装-uooc--helper.user.js-green)](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)

Tampermonkey / Violentmonkey / ScriptCat用户脚本，用于优课在线（UOOC）学习平台。

## 功能

- 课程目录递归扫描、断点续扫
- 视频自动播放（可调速）
- 智能答题：内置 DeepSeek 网页版、豆包网页版支持，也支持导入 OpenAI 兼容 API
- 自动提交测验（含智能验证）
- 完善的本地缓存系统，避免遍历操作过多导致资源浪费
- 适配AI自动化修复/拓展脚本功能的代码改动应用器：当网页结构布局更改时，可零基础自行使用AI修复，无需等待更新

## 安装

### 方式一：一键安装（推荐）

1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展并启用
2. [点击安装脚本](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)
3. Tampermonkey 会弹出安装页，点「安装」即可

### 方式二：手动安装（一键安装失败时用）

1. 打开 [脚本源码](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)
2. 全选（Ctrl+A）复制
3. 自行前往 Tampermonkey 等拓展的管理页添加新脚本
4. 全选删掉模板，粘贴脚本
5. Ctrl+S 保存

### 安装后

刷新优课在线课程页面，右下角出现「UOOC 学习助手」面板即成功。

## 使用

1. 打开任意课程页面（uooc.net.cn）
2. 页面右下角出现「UOOC 学习助手」面板
3. 首次使用：设置 ⚙️ → AI 方案，选 DeepSeek 网页版或豆包网页版，或自行配置 API
4. 点击「▶ 开始递归」

## 数据安全

本脚本不收集任何个人信息，所有设置与缓存仅存储在本地浏览器 `localStorage`。

## 许可证

[GPL-3.0-or-later](LICENSE)

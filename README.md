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

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. [点击安装脚本](https://raw.githubusercontent.com/Uooc-Nanashi/uooc-helper/main/uooc-helper.user.js)
3. 刷新优课在线课程页面

## 使用

1. 打开任意课程页面（uooc.net.cn）
2. 页面右下角出现「UOOC 学习助手」面板
3. 首次使用：设置 ⚙️ → AI 方案，选 DeepSeek 网页版或豆包网页版，或自行配置 API
4. 点击「▶ 开始递归」

## 数据安全

本脚本不收集任何个人信息，所有设置与缓存仅存储在本地浏览器 `localStorage`。

## 许可证

[GPL-3.0-or-later](LICENSE)

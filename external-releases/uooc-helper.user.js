// ==UserScript==
// @name         UOOC 学习助手
// @namespace    https://github.com/Uooc-Nanashi/uooc-helper
// @version      1.0.1.e
// @description  UOOC 刷课脚本（专门适配优课联盟 / 优课在线 ）| 提供无需API的完全免费方案 · 开源 · 非商业 | 全自动完成课程 · 视频自动播放 · 智能完成测验（大模型网页版 + API 双方案）· 内置功能修复与扩展工具
// @tag          uooc auto-script 优课在线
// @author       Uooc-Nanashi
// @homepageURL  https://github.com/Uooc-Nanashi/uooc-helper
// @supportURL   https://github.com/Uooc-Nanashi/uooc-helper/issues
// @match        *://www.uooc.net.cn/*
// @match        *://uooc.net.cn/*
// @match        *://*.uooc.net.cn/*
// @match        *://uooc.online/*
// @match        *://*.uooc.online/*
// @match        *://chat.deepseek.com/*
// @match        *://www.doubao.com/*
// @match        *://doubao.com/*
// @match        *://*.doubao.com/*
// @grant        none
// @license      GPL-3.0-or-later
// ==/UserScript==

/* ============================================================
 * 【全局注意事项与用户要求】—— 修改本脚本前请先读完
 *
 * 【一、用户明确提出的要求】（已实现，修改时不要破坏）
 *   1. 缓存查看界面：内容可选中复制，但禁止用户手动更改
 *      —— 容器用 <div class="code-render uooc-selectable">，不要改成 <textarea>
 *   2. 缓存格式统一为 JSON；键顺序：version/courseId/courseName/timestamp 放最前
 *      —— 见 QuizCache.save / saveScanCache 的 ordered / payload 构造
 *   3. 移动版视图：整体界面尺寸缩小，但保持相对桌面端的宽高比；
 *      控件大小比桌面端稍大但不要太大
 *      —— 见 CSS 里 body.uooc-mobile-view #uooc-helper-panel 的变量
 *   4. 数值输入 / 选项设置项：悬浮在控件上时对应圆角矩阵区域变亮，
 *      颜色强度与开关 / 外链按钮的悬浮变亮效果一致
 *      —— 见 input[type="number"]:hover / select:hover
 *   5. 方案管理器 + 代码改动应用器：宽度过小时顶部按钮只保留图标
 *      —— 见 .toolbar button .btn-text 的 @media (max-width:900px)
 *   6. 方案管理器 + 代码改动应用器：竖屏时把靠后的输入区域置于下方
 *      —— 见 .main / .grid 的 @media (max-width:700px) and (orientation:portrait)
 *   7. 文档目录：悬浮变亮区域与当前所属标题的高亮区域尺寸相同
 *      —— 见 .toc-indicator 的 left:0; right:0
 *   8. 文档标题不带版本号；正文里的 §N 引用可点击跳转
 *      —— 见 DOC_DATA 的 h1 项无 ver 字段；linkifyRefs 处理 §N
 *   9. 应用器文档：内容精简，重点放前面，细节放后面
 *  10. 方案管理器：只有内置方案才显示"内置方案不可修改或删除…"提示
 *      —— 见 renderEditor 里按 m.builtin 判断
 *  11. AI 网页右上角显示小型进度条和状态文字（第 N/M 题 · 阶段）
 *      —— 见 initDeepSeekBridge 里 _ensureStatusBar / _tickAsk
 *  12. AI 网页在后台时也要正常应答（不受浏览器标签节流影响）
 *      —— 见 TICK 事件驱动机制：主页面定期 postMessage TICK 唤醒桥接器
 *  13. 智能答题过程中，AI 页的进度栏会实时显示"生成中…Ns / 等待回答…Ns"
 *  14. 应用器：旧代码 / 改动点为空时，在各自区域下半部分显示「从剪切板粘贴」
 *      按钮（占下半区、不覆盖整块）；有内容时隐藏
 *      —— 见 .paste-btn 与 bindPasteButtons
 *  15. 应用器：报告里未找到的 FIND 预览文字标红（显示效果，不改原文）
 *      —— 见 .rep-preview 样式
 *  16. 智能闯关缓存：taskId 不稳定（数字 ID vs 带时间戳标题）时，写入前按题目
 *      hash 合并到已有 taskpoint，避免同一测验分裂成多条
 *      —— 见 QuizSolver.start / recordCompletedQuizzes 的 effectiveTaskId
 *  17. AI 页右上角进度条显示总进度（已完成 / 总数）；阶段文字含
 *      "生成中…Ns / 解析回答…Ns / 等待回答…Ns / 等待 AI 开始回答…Ns"
 *      —— 见 _ensureStatusBar / _showStatus / _tickAsk
 *  18. http 类型方案不打开任何窗口，直接 fetch；webpage 类型打开 config.url
 *      对应网页；_ensurePopup 对 http 类型返回 null（不要 fallback 到 deepseek）
 *      —— 见 MethodBridge.openConversation / _ensurePopup；QuizSolver._openWithFallback
 *  19. 智能闯关日志内嵌在「智能闯关」选项卡底部（与题目缓存 / 记录已完成测验同页），
 *      可展开 / 收起；不使用独立全屏子页面
 *      —— 见 UI 里 chLogWrap / toggleChLog
 *  20. http 类型的完整通信信息写入智能闯关日志：端点、模型、脱敏 Authorization、
 *      系统提示词、用户提示词、其他参数、状态码、耗时、原始响应、提取回答
 *      —— 见 _httpAsk 里的 _quizLog；主脚本 LLM_BRIDGE.onQuizLog 转发到 UI
 *  21. 设置页通用区：新增「复制当前页 outerHTML」——递归收集所有 iframe 的
 *      contentDocument 后拼成带 data-iframe-src 的 div，跨域 iframe 保留原样
 *      —— 见 collectOuterHTMLWithIframes / copyTextToClipboard / copyHtmlRow
 *  22. 设置页保存 / 恢复默认按钮吸附在设置页底部（position: sticky; bottom: 0），
 *      滚动设置项时始终可见
 *      —— 见 setBtnRow 的 style
 *  23. 视频倍率设置项：描述里提示"过高会导致页面停留时间达不到平台要求，
 *      任务点无法完成"
 *  24. AI 方案刷新按钮与「管理 AI 方案」外链按钮宽度一致（26px）、圆角一致、
 *      hover 效果一致
 *      —— 见 .select-refresh-btn 与 .uooc-extlink-icon
 *  25. 复制按钮默认灰绿 #6b8e6f；成功→深绿、失败→红，3 秒后回灰绿；
 *      悬浮时整个设置行与按钮同时提亮
 *      —— 见 copyHtmlRow 里 COPY_BG_DEFAULT / COPY_BG_OK / COPY_BG_ERR
 *  26. API Key 遮罩：中等暗度（rgba(35,42,52,0.72) + blur(3px)），
 *      能看出字符长度轮廓但读不出内容；点右侧眼睛按钮切换显隐
 *  27. 预设模型系列：未选中时各字段用通用文案（不含具体厂商词）；
 *      选中某项或 endpoint/model 命中关键词时，切为对应厂商的文案与特化卡片
 *      —— 见 PRESETS 注册表 / GENERIC_TEXTS / detectPresetByFieldValues / applyPresetTexts
 *  28. systemPrompt：webpage 与 http 都支持；非空时替代 buildPrompt 里的
 *      默认首句「你是一名答题助手…」；为空时才使用默认句
 *      —— 见 buildPrompt 与 BUILTIN_METHODS
 *  29. 方案管理器：保存按钮在表单内容与上次保存一致时显示「已保存」（灰绿禁用）；
 *      表单任何输入 / 粘贴 / 剪切 / 失焦提交都立即恢复为绿色可用
 *      —— 见 refreshSaveButtonState / _savedSnapshot
 *  30. 方案管理器：删除前弹居中模态「二次确认」，按钮红（确定删除）/ 浅蓝（取消）；
 *      确认后删除并跳到相邻方案
 *      —— 见 modal-overlay 与 modal-confirm / modal-cancel
 *  31. 应用器文档开头说明其用途：页面元素布局改动时，把脚本源码 + 新 outerHTML
 *      发给 AI，AI 只需输出改动点（FIND / REPLACE 块），不必输出完整脚本
 *      —— 见 _buildPatcherHtml 的 DOC_DATA 开头的 callout
 *  32. 移动版视图面板宽度 500px
 *
 * 【二、修改时容易踩的坑】
 *   A. 【模板字面量嵌套】主脚本用模板字面量生成 HTML（_buildPatcherHtml 等），
 *      内部不能出现反引号和 ${...}，也不能出现三个连续的 #
 *      —— 这就是为什么生成器里用 H = "\u0023" 拼出 ###
 *   B. 【改动点应用器】改动点的 FIND 必须与旧代码逐字符一致；
 *      FIND/REPLACE 中若含三个连续的 #，会被误解析为分隔符
 *      —— 这就是为什么应用器内部用 T = H + H + H 拼出 ###
 *   C. 【字符串级联】含反斜杠的字符串在复制/粘贴时可能被折叠。
 *      推荐用字符类规避（[0-9] 代替 \d，[.] 代替 \.）防止解析错误
 *   D. 【缓存键冲突】getTaskpointInfo 的 taskId 在不同阶段可能不同
 *      （数字 ID vs 带时间戳的标题）。写入缓存前必须先按题目 hash
 *      检查已有 taskpoint，找到就合并，避免同一测验分裂成两条
 *      —— 见 QuizSolver.start / recordCompletedQuizzes 的 effectiveTaskId
 *   E. 【后台节流】setTimeout/setInterval 在后台标签会被拉长到 1s+。
 *      涉及 AI 页等待的循环一律优先靠"主页面 TICK + 桥接器响应"驱动
 *      —— 见 MethodBridge.ask 的 ticker / 桥接器 TICK 分支
 *   F. 【@match 白名单】新增的 AI 服务域名必须出现在脚本头部 @match；
 *      否则桥接器无法注入，智能答题会报"AI 桥接器未响应"
 *   G. 【Tampermonkey 排除域名】用户可在 TM 设置里排除域名。错误提示
 *      应引导用户检查这一项 —— 见 _waitReady / _ensurePopup 的错误信息
 *   H. 【内置方案只读】BUILTIN_METHODS 中的方案不可修改/删除
 *   I. 【代码渲染器】缩进竖线在缩进起始处（不是结束处）
 *      —— 见 .code-render .cl::before 的 repeating-linear-gradient
 *   J. 【移动端目录】点开后只占屏幕左侧一段，不覆盖整屏
 *   K. 【同名相斥】任何新加的 setInterval / setTimeout 都要在对应流程
 *      退出时清理，避免逻辑嵌套 —— 见 window.__uooc_tick_timer
 *   L. 【模板字面量中的换行】拼接 HTML 的模板字面量里若需要 \n，一律写
 *      String.fromCharCode(10)，不要写 "\n"。单 \n 在模板字面量里会被
 *      解释成真换行；若这段输出落在内嵌 <script> 的字符串字面量中，JS 解析
 *      器会因字符串跨行直接抛 SyntaxError，导致整个页面脚本失效。
 *      这是本脚本曾多次瘫痪的根因 —— 见 ensureGuiForm 里 ].join(String.fromCharCode(10))
 *
 * 【三、版本号与日志】
 *   脚本头部 @version 和 init() 里的 log 版本号应同步更新
 *
 * 【四、AI 协助修改脚本时的响应规范】
 *   当用户请 AI 帮忙修改本脚本时，AI 的标准回答应包含以下三部分，
 *   以便用户直接把内容粘进「代码改动应用器」。
 *
 *   1. 改动点代码块 —— 每处改动一个代码块，格式如下
 *      （下方示例为规避工具自身的分隔符解析，井号之间加了空格；
 *        实际书写时请去掉空格，即三个连续井号）：
 *
 *        # # # DESC # # # 可选，简短说明本块做什么
 *        # # # FIND # # #
 *        需要被替换的原始代码（必须与脚本源码逐字符一致）
 *        # # # REPLACE # # #
 *        替换后的新代码
 *        # # # END # # #
 *
 *      - FIND 越短越稳，优先单行或几行；避免整段函数，容易因空白差异匹配失败；
 *      - FIND 若可能匹配到多处，需带上足够的上下文行让它唯一；
 *      - FIND / REPLACE 中若必须出现三个连续井号，请拆成字符串拼接规避；
 *      - REPLACE 中若需要换行，请用 String.fromCharCode(10)，不要写裸反斜杠 n；
 *      - 内嵌 HTML 属性中的双引号请改用单引号或 HTML 实体，避免破坏外层字符串。
 *
 *   2. 改动说明 —— 每处改动逐条列出：
 *      - 改动位置（函数名 / 代码块）；
 *      - 改动目的（解决什么问题）；
 *      - 若存在副作用或限制，明确写出。
 *
 *   3. 改动方法 —— 告诉用户如何把改动点落地：
 *      - 打开「设置 → 打开代码改动应用器」；
 *      - 旧代码粘贴当前脚本源码全文；改动点粘贴 1. 中所有代码块；
 *      - 点「应用改动」后检查报告是否为「成功 N / 警告 0 / 失败 0」；
 *      - 通过后点「复制结果」，覆盖回 Tampermonkey，保存；
 *      - 涉及桥接器或 AI 方案选择器改动：关闭旧 AI 窗口并重新打开；
 *        涉及页面脚本逻辑改动：刷新课程页面。
 *
 *   若改动点较多，AI 应说明建议的应用顺序，并提示哪些可合并提交、
 *   哪些必须分次提交（例如 FIND 会互相覆盖时）。
 * ============================================================ */

(function () {
    "use strict";

    /* ============================================================
     * 【工具函数】sleep 以函数声明方式定义，完全提升，避免 TDZ
     * ============================================================ */
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    /* ============================================================
     * 【AI 页面独立入口】注入 chat.deepseek.com / *.doubao.com 时仅启动桥接器
     * 桥接器本身是通用的：全靠主页面通过 CONFIG 下发 selectors / wait
     * ============================================================ */
    if (location.hostname === "chat.deepseek.com"
        || location.hostname === "www.doubao.com"
        || location.hostname === "doubao.com"
        || /\.doubao\.com$/.test(location.hostname)) {
        initDeepSeekBridge();
        return;
    }

    /* ============================================================
     * 【防重复注入】
     * ============================================================ */
    if (window.top !== window.self) return;
    if (document.getElementById("uooc-helper-panel")) return;

    /* 【新版页面检测】/home/learn/new/ 开头 */
    const _isNewPage = location.pathname.startsWith("/home/learn/new/");

    /* ============================================================
     * 【工具函数】
     * ============================================================ */
    const $el = id => document.getElementById(id);
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }
    function getVideoEl() {
        return document.getElementById("player_html5_api") ||
               document.querySelector("video#player_html5_api") ||
               document.querySelector(".video-js video") ||
               document.querySelector("video");
    }
    /* 收集含 iframe 的 outerHTML，用于「复制当前页 outerHTML」 */
    async function collectOuterHTMLWithIframes() {
        const clone = document.documentElement.cloneNode(true);

        /* 1) 给脚本自身注入的元素打标记（data-uooc-self="1"），保留但标记，便于 AI 识别 */
        const _SELF_SELECTORS = [
            "#uooc-helper-panel",
            "#uooc-ask-status",
            "#uooc-status-style",
            "#uooc-bridge-badge",
            "#uooc-force-aspect-style",
            "#uooc-global-style"
        ];
        for (const _sel of _SELF_SELECTORS) {
            try {
                const _nodes = clone.querySelectorAll(_sel);
                for (let _i = 0; _i < _nodes.length; _i++) {
                    const _n = _nodes[_i];
                    if (_n && _n.setAttribute) _n.setAttribute("data-uooc-self", "1");
                }
            } catch (e) {}
        }
        try {
            if (clone.classList && clone.classList.contains("uooc-force-aspect")) {
                clone.setAttribute("data-uooc-self-class", "uooc-force-aspect");
            }
            const _bodyEl = clone.querySelector("body");
            if (_bodyEl && _bodyEl.classList && _bodyEl.classList.contains("uooc-mobile-view")) {
                _bodyEl.setAttribute("data-uooc-self-class", "uooc-mobile-view");
            }
        } catch (e) {}

        /* 2) 递归收集 Shadow DOM：把每个 shadowRoot 序列化为 <div data-shadow-root="open"> */
        _collectShadowRoots(document.documentElement, clone);

        /* 3) 递归展开 iframe 内容 */
        await _expandIframesInClone(document, clone);

        return clone.outerHTML;
    }

    function _collectShadowRoots(srcRoot, cloneRoot) {
        try {
            const srcEls = srcRoot.querySelectorAll("*");
            const cloneEls = cloneRoot.querySelectorAll("*");
            if (srcEls.length !== cloneEls.length) return;
            for (let i = 0; i < srcEls.length; i++) {
                const srcEl = srcEls[i];
                const cloneEl = cloneEls[i];
                if (!srcEl || !cloneEl || !srcEl.shadowRoot) continue;
                const sr = srcEl.shadowRoot;
                const srClone = document.createElement("div");
                srClone.setAttribute("data-shadow-root", "open");
                const children = Array.from(sr.children || []);
                for (const ch of children) {
                    srClone.appendChild(ch.cloneNode(true));
                }
                cloneEl.appendChild(srClone);
                _collectShadowRoots(sr, srClone);
            }
        } catch (e) {}
    }

    async function _expandIframesInClone(srcRoot, cloneRoot) {
        const iframes = srcRoot.querySelectorAll("iframe");
        const cloneIframes = cloneRoot.querySelectorAll("iframe");
        for (let i = 0; i < iframes.length; i++) {
            const iframe = iframes[i];
            const src = iframe.getAttribute("src");
            if (!iframe.contentDocument || iframe.contentDocument.readyState !== "complete") {
                await new Promise(resolve => {
                    let done = false;
                    const fin = () => { if (!done) { done = true; resolve(); } };
                    try { iframe.addEventListener("load", fin, { once: true }); } catch (e) {}
                    setTimeout(fin, 3000);
                });
            }
            let doc = null;
            try { doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); } catch (e) {}
            if (!doc || !doc.documentElement) continue;
            const target = cloneIframes[i];
            if (!target) continue;
            const subClone = doc.documentElement.cloneNode(true);
            _collectShadowRoots(doc.documentElement, subClone);
            await _expandIframesInClone(doc, subClone);
            const wrapper = document.createElement("div");
            wrapper.setAttribute("data-iframe-src", src || "");
            wrapper.innerHTML = subClone.outerHTML;
            try { target.replaceWith(wrapper); } catch (e) {}
        }
    }
    async function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
        }
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0;";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        try { document.body.removeChild(ta); } catch (e) {}
        if (!ok) throw new Error("剪贴板写入失败，请确认页面处于聚焦状态");
        return true;
    }
    /* 主页面内 JSON 代码渲染（与 AI 方案管理器文档视图同款）
       注意：本函数刻意不使用任何含有双反斜杠的正则，避免改动点在复制过程中被破坏 */
    function _renderCodeHTML(text) {
        try {
            const escapeHTML = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const NL = String.fromCharCode(10);
            const highlightLine = (raw) => {
                try {
                    let s = escapeHTML(raw);
                    const _parts = [];
                    const _PH = "\u0001";
                    s = s.replace(/"([^"]*)"(:)?/g, (m, inner, colon) => {
                        const token = colon
                            ? '<span class="tok-key">"' + inner + '"</span><span class="tok-punc">:</span>'
                            : '<span class="tok-str">"' + inner + '"</span>';
                        const idx = _parts.length;
                        _parts.push(token);
                        return _PH + idx + _PH;
                    });
                    s = s.replace(/(^|[^0-9A-Za-z_"\u0001-])([0-9]+(?:[.][0-9]+)?)/g, (m, pre, num) => pre + '<span class="tok-num">' + num + '</span>');
                    s = s.replace(new RegExp(_PH + "([0-9]+)" + _PH, "g"), (m, idx) => _parts[Number(idx)] || "");
                    return s;
                } catch (e) { return escapeHTML(raw); }
            };
            const lines = String(text || "").split(NL);
            const out = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const m = line.match(/^([ ]*)/);
                const indentStr = m ? m[1] : "";
                const level = Math.floor(indentStr.length / 2);
                const content = line.slice(indentStr.length);
                out.push('<div class="cl" style="--indent:' + level + '"><span class="ln">' + (i + 1) + '</span>' + highlightLine(content) + '</div>');
            }
            return out.join("");
        } catch (e) {
            return '<div style="padding:8px;color:#ef5350;white-space:pre-wrap;">JSON 渲染失败：' + (e && e.message ? e.message : e) + '</div>';
        }
    }
    function _renderCodeTo(el, text) {
        if (!el) return;
        try { el.innerHTML = _renderCodeHTML(text); }
        catch (e) { el.textContent = "JSON 渲染失败：" + (e && e.message ? e.message : e); }
    }

    /* 【设置模块】—— 修改前见脚本顶部【全局注意事项与用户要求】
     * ============================================================
     * 【设置模块】存储键 uooc_helper_settings_v1
     *   包含：自动更新间隔、播放速度、移动版视图、强制页面尺寸、
     *         智能闯关常态化显示
     * ============================================================ */
    const SETTINGS_KEY = "uooc_helper_settings_v1";
    function _defaultSettings() {
        return {
            autoScanInterval: 15,
            videoPlaybackRate: 2,
            mobileView: false,
            forceAspect: "none",
            challengeAlwaysVisible: false,
            submitMode: "manual",
        };
    }
    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return _defaultSettings();
            const s = JSON.parse(raw);
            const d = _defaultSettings();
            return {
                autoScanInterval: Number(s.autoScanInterval) > 0 ? Number(s.autoScanInterval) : d.autoScanInterval,
                videoPlaybackRate: Number(s.videoPlaybackRate) > 0 ? Number(s.videoPlaybackRate) : d.videoPlaybackRate,
                mobileView: s.mobileView === true,
                forceAspect: ["none", "16:9", "4:3"].includes(s.forceAspect) ? s.forceAspect : "none",
                challengeAlwaysVisible: s.challengeAlwaysVisible === true,
                submitMode: s.submitMode === "auto" ? "auto" : "manual",
            };
        } catch (e) { return _defaultSettings(); }
    }
    function saveSettings(s) {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); return true; }
        catch (e) { return false; }
    }
    let _settings = loadSettings();
    function getSettings() { return _settings; }
    function setSettings(patch) {
        _settings = Object.assign({}, _settings, patch);
        saveSettings(_settings);
        return _settings;
    }
    /* 提交方式以全局设置为权威来源。
       历史上曾存在 QuizCache（按课程存储）里，导致切换课程后偏好丢失、
       课程 ID 未识别时无法保存。现统一以 settings.submitMode 为准，
       QuizCache 中的同名字段仅作为向后兼容写入。 */
    function _getSubmitMode() {
        try {
            const s = getSettings();
            if (s && (s.submitMode === "auto" || s.submitMode === "manual")) return s.submitMode;
        } catch (e) {}
        return "manual";
    }

    /* ============================================================
     * 【注入 CSS】
     *   - 章节进度条闪烁动画
     *   - 面板 CSS 变量（桌面端 / 移动版）
     *   - 触屏优化
     *   - 日志可选中复制
     *   - 卡片分类 + 悬浮高亮
     *   - 子页面打开时抬高面板
     * ============================================================ */
    (function injectGlobalCss() {
        const css = `
            @keyframes uooc-blink-yellow {
                0%, 100% { background-color: #ffc107; }
                50%      { background-color: #fff59d; }
            }
            .uooc-blink-yellow { animation: uooc-blink-yellow 1.2s ease-in-out infinite; }

            #uooc-helper-panel {
                --uooc-panel-width: 420px;
                --uooc-fs: 12px;
                --uooc-fs-sm: 11px;
                --uooc-fs-xs: 10.5px;
                --uooc-tab-py: 8px;
                --uooc-btn-py: 10px;
                --uooc-btn-fs: 12px;
                --uooc-row-py: 8px;
                --uooc-dot: 12px;
                --uooc-gap: 8px;
                --uooc-touch-hit: auto;
                --uooc-header-py: 7px;
                --uooc-toggle-w: 48px;
                --uooc-toggle-h: 26px;
                --uooc-toggle-knob: 20px;
                --uooc-toggle-radius: 13px;
                --uooc-toggle-knob-on: 25px;
            }
            body.uooc-mobile-view #uooc-helper-panel {
                --uooc-panel-width: 500px;
                --uooc-fs: 13px;
                --uooc-fs-sm: 12px;
                --uooc-fs-xs: 11px;
                --uooc-tab-py: 11px;
                --uooc-btn-py: 13px;
                --uooc-btn-fs: 13px;
                --uooc-row-py: 11px;
                --uooc-dot: 14px;
                --uooc-gap: 9px;
                --uooc-touch-hit: 36px;
                --uooc-header-py: 9px;
                --uooc-toggle-w: 54px;
                --uooc-toggle-h: 28px;
                --uooc-toggle-knob: 22px;
                --uooc-toggle-radius: 14px;
                --uooc-toggle-knob-on: 28px;
            }
            #uooc-helper-panel,
            #uooc-helper-panel * {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                -webkit-user-select: none;
                user-select: none;
            }
            #uooc-helper-panel input,
            #uooc-helper-panel textarea,
            #uooc-helper-panel select,
            #uooc-helper-panel [contenteditable="true"] {
                -webkit-user-select: text;
                user-select: text;
                touch-action: auto;
            }
            #uooc-helper-panel .uooc-scroll {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                scrollbar-width: thin;
                scrollbar-color: #3a4a56 #161c22;
            }
            #uooc-helper-panel .uooc-scroll::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            #uooc-helper-panel .uooc-scroll::-webkit-scrollbar-track {
                background: #161c22;
                border-radius: 4px;
            }
            #uooc-helper-panel .uooc-scroll::-webkit-scrollbar-thumb {
                background: #3a4a56;
                border-radius: 4px;
                border: 2px solid #161c22;
            }
            #uooc-helper-panel .uooc-scroll::-webkit-scrollbar-thumb:hover {
                background: #4dd0e1;
            }
            #uooc-helper-panel .uooc-scroll::-webkit-scrollbar-corner {
                background: #161c22;
            }
            /* 日志允许选中复制 */
            #uooc-helper-panel .uooc-selectable,
            #uooc-helper-panel .uooc-selectable * {
                -webkit-user-select: text !important;
                user-select: text !important;
                cursor: text;
                -webkit-touch-callout: default;
            }
            /* 子页面打开时抬高面板高度 */
            #uooc-helper-panel.uooc-subpage-open { min-height: 70vh; }
            /* 设置页卡片容器 */
            #uooc-helper-panel .uooc-card {
                background: #1a2028;
                border: 1px solid #2a2f36;
                border-radius: 8px;
                padding: 8px 6px;
                margin-bottom: 6px;
                flex-shrink: 0;
            }
            #uooc-helper-panel .uooc-card-title {
                font-size: var(--uooc-fs-sm);
                font-weight: bold;
                color: #4dd0e1;
                padding: 3px 5px 6px;
                border-bottom: 1px solid #2a2f36;
            }
            /* 设置项悬浮高亮 */
            #uooc-helper-panel .uooc-setting-row {
                padding: 6px;
                border-radius: 6px;
                transition: background .15s;
            }
            #uooc-helper-panel .uooc-setting-row:hover { background: rgba(255,255,255,0.05); }
            #uooc-helper-panel .uooc-setting-row button:not(:disabled):hover { filter: brightness(1.18); }
            #uooc-helper-panel .uooc-setting-row button:not(:disabled) { transition: filter .15s, background .15s; }
            #uooc-helper-panel .uooc-toggle-label {
                border-radius: var(--uooc-toggle-radius);
                transition: box-shadow .15s;
            }
            #uooc-helper-panel .uooc-toggle-label:hover { box-shadow: 0 0 0 4px rgba(255,255,255,0.15); }
            /* 设置页控件：桌面端最小高度 30px */
            #uooc-helper-panel .uooc-setting-row input[type="number"],
            #uooc-helper-panel .uooc-setting-row select {
                min-height: 30px;
            }
            #uooc-helper-panel .uooc-extlink-icon {
                border-radius: 7px;
                transition: background .15s;
            }
            #uooc-helper-panel .uooc-extlink-icon:hover { background: rgba(255,255,255,0.15); }
            /* AI 方案选择框 + 刷新按钮 */
            #uooc-helper-panel .select-refresh-row { display:flex; gap:6px; align-items:stretch; }
            #uooc-helper-panel .select-refresh-btn { width:26px; flex:0 0 auto; padding:0; border:1px solid #2a2f36; background:#0d1014; color:#e6e6e6; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:0; transition:background .15s, color .15s; min-height:var(--uooc-touch-hit); }
            #uooc-helper-panel .select-refresh-btn svg { display:block; }
            #uooc-helper-panel .select-refresh-btn:hover { background:rgba(255,255,255,0.15); color:#e6e6e6; }
            @keyframes uooc-refresh-spin {
                0% { transform: rotate(0deg); }
                60% { transform: rotate(400deg); }
                100% { transform: rotate(360deg); }
            }
            #uooc-helper-panel .select-refresh-btn.spinning svg { animation: uooc-refresh-spin .7s cubic-bezier(.34,1.3,.64,1); }
            /* 数值/选项设置项悬浮变亮 */
            #uooc-helper-panel input[type="number"],
            #uooc-helper-panel select {
                transition: background .15s, border-color .15s, box-shadow .15s;
            }
            #uooc-helper-panel input[type="number"]:hover,
            #uooc-helper-panel select:hover {
                background: #1a2330;
                border-color: #3a4a56;
                box-shadow: 0 0 0 3px rgba(255,255,255,0.08);
            }
            /* 数值/选项设置项悬浮变亮 */
            #uooc-helper-panel input[type="number"],
            #uooc-helper-panel select {
                transition: background .15s, border-color .15s, box-shadow .15s;
            }
            #uooc-helper-panel input[type="number"]:hover,
            #uooc-helper-panel select:hover {
                background: #1a2330;
                border-color: #3a4a56;
                box-shadow: 0 0 0 3px rgba(255,255,255,0.08);
            }
            /* 缓存查看用 JSON 代码渲染 */
            #uooc-helper-panel .code-render { font-family: "JetBrains Mono", "Consolas", monospace; font-size: 11.5px; line-height: 1.7; background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 10px 0; overflow: auto; color: #c9d1d9; }
            #uooc-helper-panel .code-render .cl { position: relative; padding-left: calc(46px + var(--indent, 0) * 18px); padding-right: 16px; white-space: pre; min-height: 1.7em; }
            #uooc-helper-panel .code-render .cl:hover { background: rgba(255,255,255,0.03); }
            #uooc-helper-panel .code-render .cl > .ln { position: absolute; left: 0; top: 0; width: 36px; text-align: right; padding-right: 8px; color: #484f58; user-select: none; font-size: 11px; }
            #uooc-helper-panel .code-render .cl::before { content: ""; position: absolute; left: 46px; top: 0; bottom: 0; width: calc(var(--indent, 0) * 18px); background: repeating-linear-gradient(90deg, rgba(110,130,160,0.28) 0, rgba(110,130,160,0.28) 1px, transparent 1px, transparent 18px); pointer-events: none; }
            #uooc-helper-panel .code-render .tok-key  { color: #79c0ff; font-weight: bold; }
            #uooc-helper-panel .code-render .tok-str  { color: #a5d6a7; }
            #uooc-helper-panel .code-render .tok-num  { color: #ffb74d; }
            #uooc-helper-panel .code-render .tok-kw   { color: #ce93d8; font-weight: bold; }
            #uooc-helper-panel .code-render .tok-punc { color: #8b949e; }
        `;
        const st = document.createElement("style");
        st.id = "uooc-global-style";
        st.textContent = css;
        (document.head || document.documentElement).appendChild(st);
    })();

    /* ============================================================
     * 【颜色常量】
     * ============================================================ */
    const C = {
        interactiveBg:    "#c8e6c9",
        interactiveBgOn:  "#81c784",
        interactiveFg:    "#1b5e20",
        interactiveBd:    "#66bb6a",
        disabledBg:       "#37474f",
        disabledFg:       "#78909c",
        disabledBd:       "#455a64",
        runBg:            "#2e7d32",
        runFg:            "#ffffff",
        pauseBg:          "#546e7a",
        pauseFg:          "#ffffff",
        tabBg:            "#546e7a",
        tabActiveBg:      "#78909c",
        tabFg:            "#ffffff",
        tabBd:            "#37474f",
        segEmpty:            "#616161",
        segChallengePending: "#607d8b",
        segOk:               "linear-gradient(90deg,#26a69a,#4db6ac)",
        segProcessing:       "#ffeb3b",
        segErr:              "#ef5350",
        segChallenge:        "#ffc107",
        clearBtnBg:          "rgba(84,110,122,0.92)",
        clearBtnBgHover:     "rgba(84,110,122,1)",
        redirectBg:          "#c62828",
        redirectBgHover:     "#d32f2f",
        redirectFg:          "#ffffff",
        quizProgressDone:    "#4a5a4f",
        quizProgressEmpty:   "#37474f",
        toggleOn:            "#7a9b7d",
        toggleOff:           "#37474f"
    };

    /* 【闯关限制标记名称】 */
    const CHALLENGE_MARKER_NAME = "存在待扫描任务被闯关模式限制";

    /* ============================================================
     * 【AI 方案存储与内置方案】
     *   - 存储键：uooc_helper_ai_methods_v1
     *   - 结构：{ version: "1.0", methods: [MethodDescriptor...] }
     *   - activeMethodId：当前使用的方案 id
     * ============================================================ */
    const AI_METHODS_KEY = "uooc_helper_ai_methods_v1";
    const AI_ACTIVE_KEY  = "uooc_helper_ai_active_v1";

    const BUILTIN_METHODS = [
        {
            schemaVersion: "1.0",
            id: "builtin-deepseek-web",
            name: "DeepSeek 网页版",
            type: "webpage",
            builtin: true,
            description: "通过 DeepSeek 网页版进行问答（脚本自带，作为示例）",
            config: {
                url: "https://chat.deepseek.com/",
                windowName: "uooc_deepseek",
                systemPrompt: "你是一名严谨的答题助手，回答务必简洁、直接。"
            },
            selectors: {
                input: 'textarea[placeholder*="给 DeepSeek"], textarea[placeholder*="发送"], textarea[placeholder], textarea',
                send: '[role="button"]',
                sendScoring: ["class:ds-button--circle:+10", "class:ds-button--primary:+5", "class:ds-button--filled:+2"],
                response: ".ds-assistant-message-main-content",
                generatingText: "停止生成"
            },
            wait: {
                readyMs: 30000,
                responseStableMs: 2500,
                responseGraceMs: 20000
            }
        },
        {
            schemaVersion: "1.0",
            id: "builtin-doubao-web",
            name: "豆包网页版",
            type: "webpage",
            builtin: true,
            description: "通过豆包网页版（www.doubao.com）进行问答。输入框为 ProseMirror，选择器优先使用 data-testid / data-message-role / data-thinking-box，不依赖带 hash 的 class。",
            config: {
                url: "https://www.doubao.com/chat/",
                windowName: "uooc_doubao",
                systemPrompt: "你是一名严谨的答题助手，回答务必简洁、直接。"
            },
            selectors: {
                input: '#input-engine-container .ProseMirror[contenteditable="true"], [data-testid="chat_input_input"] [contenteditable="true"], [data-testid="chat_input_input"] .ProseMirror, [data-testid="chat_input"] .ProseMirror[contenteditable="true"], div.ProseMirror[contenteditable="true"], div.tiptap[contenteditable="true"], [contenteditable="true"][role="textbox"]',
                send: '[data-testid="chat_input_send_button"], #flow-end-msg-send',
                sendScoring: [],
                response: '[data-testid="receive_message"] [data-testid="message_text_content"], [data-message-role="assistant"] [data-testid="message_text_content"]',
                generatingText: "停止生成",
                stopBtn: '[data-testid="chat_input_local_break_button"]',
                messageList: '[data-testid="message-list"]'
            },
            wait: {
                readyMs: 30000,
                responseStableMs: 2500,
                responseGraceMs: 20000
            }
        }
    ];

    const MethodStore = (function () {
        function _loadAll() {
            try {
                const raw = localStorage.getItem(AI_METHODS_KEY);
                if (!raw) return { version: "1.0", methods: [] };
                const d = JSON.parse(raw);
                if (!d || !Array.isArray(d.methods)) return { version: "1.0", methods: [] };
                return d;
            } catch (e) { return { version: "1.0", methods: [] }; }
        }
        function _saveAll(d) {
            try { localStorage.setItem(AI_METHODS_KEY, JSON.stringify(d)); return true; }
            catch (e) { return false; }
        }
        function list() {
            const custom = _loadAll().methods || [];
            return BUILTIN_METHODS.concat(custom);
        }
        function get(id) {
            for (const m of BUILTIN_METHODS) if (m.id === id) return m;
            const custom = _loadAll().methods || [];
            return custom.find(m => m.id === id) || null;
        }
        function upsert(method) {
            if (!method || !method.id || !method.name) return { ok: false, error: "id/name 不能为空" };
            if (BUILTIN_METHODS.some(b => b.id === method.id)) return { ok: false, error: "内置方案 id 不可覆盖" };
            const d = _loadAll();
            const idx = d.methods.findIndex(m => m.id === method.id);
            method.builtin = false;
            if (idx >= 0) d.methods[idx] = method; else d.methods.push(method);
            return _saveAll(d) ? { ok: true } : { ok: false, error: "写入失败" };
        }
        function remove(id) {
            if (BUILTIN_METHODS.some(b => b.id === id)) return { ok: false, error: "内置方案不可删除" };
            const d = _loadAll();
            const n = d.methods.length;
            d.methods = d.methods.filter(m => m.id !== id);
            if (d.methods.length === n) return { ok: false, error: "未找到" };
            return _saveAll(d) ? { ok: true } : { ok: false, error: "写入失败" };
        }
        function getActiveId() {
            const id = localStorage.getItem(AI_ACTIVE_KEY);
            if (id && get(id)) return id;
            return BUILTIN_METHODS[0] ? BUILTIN_METHODS[0].id : null;
        }
        function setActiveId(id) {
            if (!get(id)) return false;
            try { localStorage.setItem(AI_ACTIVE_KEY, id); return true; }
            catch (e) { return false; }
        }
        function getActive() { return get(getActiveId()); }
        function validate(method) {
            if (!method || typeof method !== "object") return "不是对象";
            if (typeof method.id !== "string" || !method.id.trim()) return "缺少 id";
            if (typeof method.name !== "string" || !method.name.trim()) return "缺少 name";
            if (method.type !== "webpage" && method.type !== "http") return "type 必须为 webpage 或 http";
            if (method.type === "webpage") {
                if (!method.config || typeof method.config.url !== "string") return "webpage 类型需要 config.url";
                if (!method.selectors || typeof method.selectors.input !== "string") return "webpage 类型需要 selectors.input";
                if (typeof method.selectors.send !== "string") return "webpage 类型需要 selectors.send";
                if (typeof method.selectors.response !== "string") return "webpage 类型需要 selectors.response";
            }
            return null;
        }
        return { list, get, upsert, remove, getActiveId, setActiveId, getActive, validate };
    })();

    /* 【DeepSeek 桥接器】—— 修改前见顶部注意事项 A / E / K
     * ============================================================
     * 【DeepSeek 桥接器】chat.deepseek.com 内运行
     *   - 支持 CONFIG 消息：动态更新 selectors / wait
     *   - ASK：输入提示词 → 发送 → 等待回答 → 回传 ANSWER
     *   - 使用"内容稳定 2 秒"判定回答完成
     *   - 发送前等待上一次回答结束，避免打断
     * ============================================================ */
    function initDeepSeekBridge() {
        const TAG = "[UOOC-DS]";
        const LOG = (...a) => console.log(TAG, ...a);

        let processing = false;
        let _askState = null;
        let _method = {
            id: "",
            name: "",
            config: {},
            selectors: {
                input: 'textarea[placeholder*="给 DeepSeek"], textarea[placeholder*="发送"], textarea[placeholder], textarea',
                send: '[role="button"]',
                sendScoring: ["class:ds-button--circle:+10", "class:ds-button--primary:+5", "class:ds-button--filled:+2"],
                response: ".ds-assistant-message-main-content",
                generatingText: "停止生成"
            },
            wait: { readyMs: 15000, responseStableMs: 2500, responseGraceMs: 20000 }
        };

        function findInputArea() {
            const sels = String(_method.selectors.input || "").split(",").map(s => s.trim()).filter(Boolean);
            for (const s of sels) {
                try { const el = document.querySelector(s); if (el) return el; } catch (e) {}
            }
            return null;
        }
        function findSendButton() {
            const selStr = String(_method.selectors.send || "").trim();
            if (selStr) {
                try {
                    const btns = document.querySelectorAll(selStr);
                    let best = null, bestScore = -Infinity;
                    const rules = Array.isArray(_method.selectors.sendScoring) ? _method.selectors.sendScoring : [];
                    for (const btn of btns) {
                        const cls = btn.className;
                        if (typeof cls !== "string") continue;
                        const rect = btn.getBoundingClientRect();
                        if (rect.width < 4 || rect.height < 4) continue;
                        let score = 0;
                        for (const r of rules) {
                            const m = String(r).match(/^class:([^:+]+):([+-]?\d+)$/);
                            if (m && cls.includes(m[1])) score += Number(m[2]) || 0;
                        }
                        score += (rect.bottom / window.innerHeight) * 5;
                        score += (rect.right / window.innerWidth) * 5;
                        if (score > bestScore) { bestScore = score; best = btn; }
                    }
                    if (best) return best;
                } catch (e) {}
            }
            return null;
        }
        function findAssistantMessages() {
            const sels = String(_method.selectors.response || "").split(",").map(s => s.trim()).filter(Boolean);
            for (const s of sels) {
                try {
                    const main = document.querySelectorAll(s);
                    if (main.length > 0) return main;
                } catch (e) {}
            }
            return document.querySelectorAll(".ds-assistant-message-main-content");
        }
        function isGenerating() {
            /* 优先检查停止按钮（豆包：chat_input_local_break_button 出现即视为生成中） */
            try {
                const stopSel = String(_method.selectors.stopBtn || "").trim();
                if (stopSel) {
                    const btn = document.querySelector(stopSel);
                    if (btn) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) return true;
                    }
                }
            } catch (e) {}
            const t = document.body.innerText || "";
            const gen = String(_method.selectors.generatingText || "停止生成");
            if (gen) {
                /* 支持逗号分隔多个生成中关键词 */
                const parts = gen.split(",").map(s => s.trim()).filter(Boolean);
                for (const p of parts) if (p && t.includes(p)) return true;
            }
            return false;
        }

        /* 输入框读写：兼容 textarea / input 与 contenteditable（豆包 ProseMirror） */
        function _isContentEditable(input) {
            if (!input) return false;
            if (input.isContentEditable === true) return true;
            return String(input.getAttribute && input.getAttribute("contenteditable") || "").toLowerCase() === "true";
        }
        function _writeInputValue(input, value) {
            if (!input) return false;
            try {
                const tag = String(input.tagName || "").toLowerCase();
                if (_isContentEditable(input)) {
                    /* ProseMirror：必须先 focus，再走 execCommand insertText，最后补发 InputEvent 让 React 感知 */
                    try { input.focus(); } catch (e) {}
                    try {
                        const sel = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(input);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } catch (e) {}
                    let ok = false;
                    try { ok = document.execCommand("insertText", false, value); } catch (e) { ok = false; }
                    if (!ok) {
                        try { input.textContent = value; } catch (e) {}
                    }
                    try {
                        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
                    } catch (e) {
                        try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (e2) {}
                    }
                    try { input.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
                    return true;
                }
                if (tag === "textarea") {
                    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
                    setter.call(input, value);
                } else if (tag === "input") {
                    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
                    setter.call(input, value);
                } else {
                    input.value = value;
                }
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            } catch (e) { return false; }
        }
        function _readInputValue(input) {
            if (!input) return "";
            try {
                const tag = String(input.tagName || "").toLowerCase();
                if (tag === "textarea" || tag === "input") return String(input.value || "");
                if (_isContentEditable(input)) return String(input.innerText || input.textContent || "");
                return String(input.value || "");
            } catch (e) { return ""; }
        }
        function _isInputEmpty(input) { return _readInputValue(input).trim() === ""; }

        async function sendPrompt(prompt) {
            const input = findInputArea();
            if (!input) throw new Error("找不到输入框");
            let waitN = 0;
            while (isGenerating() && waitN < 120) { await sleep(500); waitN++; }
            if (!_writeInputValue(input, prompt)) throw new Error("写入输入框失败");
            await sleep(120);
            const btn = findSendButton();
            if (!btn) throw new Error("找不到发送按钮");
            btn.click();
        }

        function _finishAsk(msgEl) {
            if (!_askState) return;
            const st = _askState;
            _askState = null;
            const answer = extractAnswerText(msgEl);
            LOG("ANSWER:", answer.slice(0, 120));
            _showStatus({ title: _formatTitle(st.progress), phase: "已完成", pct: _pctAfterCurrent(st.progress), dot: "ok" });
            _hideStatus(1200);
            try { st.src?.postMessage({ __uooc_ds: true, type: "ANSWER", requestId: st.requestId, answer, url: location.href }, "*"); } catch (e) {}
        }
        function _failAsk(errMsg) {
            if (!_askState) return;
            const st = _askState;
            _askState = null;
            LOG("ERR:", errMsg);
            _showStatus({ title: _formatTitle(st.progress), phase: "失败：" + String(errMsg).slice(0, 60), pct: _formatPct(st.progress), dot: "err" });
            _hideStatus(3000);
            try { st.src?.postMessage({ __uooc_ds: true, type: "ANSWER", requestId: st.requestId, error: errMsg, url: location.href }, "*"); } catch (e) {}
        }
        function _checkAnswerOnce() {
            if (!_askState) return;
            const msgs = findAssistantMessages();
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const text = lastMsg ? (lastMsg.innerText || lastMsg.textContent || "").trim() : "";
            if (text === "" || text === (_askState.baselineLastText || "")) return;
            const STABLE_MS = (_method.wait && _method.wait.responseStableMs) || 2500;
            const GRACE_MS  = (_method.wait && _method.wait.responseGraceMs)  || 20000;
            if (!isGenerating() && text) {
                if (text === _askState.lastText) {
                    if (_askState.stableStart === 0) _askState.stableStart = Date.now();
                    const stableFor = Date.now() - _askState.stableStart;
                    if (stableFor >= STABLE_MS) {
                        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                        const lastLine = lines[lines.length - 1] || "";
                        if (lastLine.startsWith("【答案】")) { _finishAsk(lastMsg); return; }
                        if (stableFor >= STABLE_MS + GRACE_MS) { _finishAsk(lastMsg); return; }
                    }
                } else {
                    _askState.lastText = text;
                    _askState.stableStart = 0;
                }
            } else {
                _askState.stableStart = 0;
                _askState.lastText = text;
            }
        }
        function _ensureStatusBar() {
            if (document.getElementById("uooc-ask-status")) return;
            try {
                if (!document.getElementById("uooc-status-style")) {
                    const st = document.createElement("style");
                    st.id = "uooc-status-style";
                    st.textContent = "@keyframes uooc-status-pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.35); opacity:.55; } }";
                    (document.head || document.documentElement).appendChild(st);
                }
                const wrap = document.createElement("div");
                wrap.id = "uooc-ask-status";
                wrap.style.cssText = [
                    "position:fixed", "top:52px", "right:12px", "z-index:2147483646",
                    "min-width:220px", "max-width:300px",
                    "background:linear-gradient(135deg, rgba(22,26,30,0.98), rgba(15,18,22,0.98))",
                    "color:#e6e6e6",
                    "font-family:-apple-system,'Segoe UI','Microsoft YaHei',sans-serif",
                    "font-size:12px",
                    "border:1px solid rgba(77,208,225,0.28)",
                    "border-radius:10px",
                    "padding:10px 12px",
                    "box-shadow:0 6px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(77,208,225,0.06)",
                    "pointer-events:none",
                    "transition:opacity .3s, transform .3s",
                    "transform:translateY(-8px)",
                    "opacity:0",
                    "display:none"
                ].join(";");
                const head = document.createElement("div");
                head.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:5px;";
                const dot = document.createElement("span");
                dot.id = "uooc-ask-dot";
                dot.style.cssText = "width:8px;height:8px;border-radius:50%;background:#78909c;box-shadow:0 0 8px rgba(120,144,156,0.6);transition:background .3s, box-shadow .3s;flex:0 0 auto;";
                const title = document.createElement("span");
                title.id = "uooc-ask-title";
                title.style.cssText = "flex:1;font-weight:bold;font-size:12px;color:#cfd8dc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                title.textContent = "AI 助手";
                head.appendChild(dot);
                head.appendChild(title);
                const phase = document.createElement("div");
                phase.id = "uooc-ask-phase";
                phase.style.cssText = "font-size:11.5px;color:#90a4ae;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Consolas,monospace;";
                phase.textContent = "就绪";
                const track = document.createElement("div");
                track.style.cssText = "height:6px;background:#1a2128;border-radius:3px;overflow:hidden;position:relative;";
                const bar = document.createElement("div");
                bar.id = "uooc-ask-bar";
                bar.style.cssText = "height:100%;width:0%;background:linear-gradient(90deg,#26a69a,#4dd0e1);box-shadow:0 0 8px rgba(77,208,225,0.5);transition:width .4s cubic-bezier(.4,0,.2,1);border-radius:3px;";
                track.appendChild(bar);
                wrap.appendChild(head);
                wrap.appendChild(phase);
                wrap.appendChild(track);
                (document.body || document.documentElement).appendChild(wrap);
                window.__uooc_ask_status = wrap;
            } catch (e) {}
        }
        function _showStatus(opts) {
            if (typeof opts === "string") opts = { phase: opts };
            opts = opts || {};
            _ensureStatusBar();
            const w = window.__uooc_ask_status;
            if (!w) return;
            w.style.display = "block";
            requestAnimationFrame(() => {
                w.style.opacity = "1";
                w.style.transform = "translateY(0)";
            });
            const titleEl = document.getElementById("uooc-ask-title");
            const phaseEl = document.getElementById("uooc-ask-phase");
            const barEl = document.getElementById("uooc-ask-bar");
            const dotEl = document.getElementById("uooc-ask-dot");
            if (titleEl && opts.title != null) titleEl.textContent = String(opts.title);
            if (phaseEl && opts.phase != null) phaseEl.textContent = String(opts.phase);
            if (barEl && typeof opts.pct === "number") barEl.style.width = Math.max(0, Math.min(100, opts.pct)) + "%";
            if (dotEl) {
                const map = {
                    preparing: { c: "#78909c", g: "rgba(120,144,156,0.6)", pulse: false },
                    sending:   { c: "#42a5f5", g: "rgba(66,165,245,0.7)",  pulse: false },
                    waiting:   { c: "#4dd0e1", g: "rgba(77,208,225,0.85)",  pulse: true  },
                    ok:        { c: "#66bb6a", g: "rgba(102,187,106,0.8)",  pulse: false },
                    err:       { c: "#ef5350", g: "rgba(239,83,80,0.8)",    pulse: false }
                };
                const s = map[opts.dot] || map.preparing;
                dotEl.style.background = s.c;
                dotEl.style.boxShadow = "0 0 8px " + s.g;
                dotEl.style.animation = s.pulse ? "uooc-status-pulse 1.4s ease-in-out infinite" : "";
            }
        }
        function _hideStatus(delayMs) {
            setTimeout(() => {
                const w = window.__uooc_ask_status;
                if (!w) return;
                w.style.opacity = "0";
                setTimeout(() => { try { w.style.display = "none"; } catch (e) {} }, 320);
            }, delayMs || 0);
        }
        function _formatTitle(progress) {
            if (!progress) return "AI 助手";
            if (progress.phase === "verify") {
                return progress.label ? String(progress.label) : "校验中…";
            }
            if (!progress.total) return "AI 助手";
            const cur = Math.min((Number(progress.done) || 0) + 1, Number(progress.total));
            let head = "第 " + cur + "/" + progress.total + " 题";
            if (progress.phase === "retry" && progress.retryAttempt) {
                head += "（重试 " + progress.retryAttempt + "/" + (progress.retryMax || 3) + "）";
            }
            const task = progress.task ? " · " + String(progress.task).slice(0, 24) : "";
            return head + task;
        }
        function _formatPct(progress) {
            if (!progress) return 0;
            if (progress.phase === "verify") return 100;
            if (!progress.total) return 0;
            return Math.round((Number(progress.done) || 0) / Number(progress.total) * 100);
        }
        function _pctAfterCurrent(progress) {
            if (!progress || !progress.total) return 0;
            var d = Math.min((Number(progress.done) || 0) + 1, Number(progress.total));
            return Math.round(d / Number(progress.total) * 100);
        }
        function _startAsk(requestId, src, timeoutMs, prompt, progress) {
            _askState = {
                requestId: requestId, src: src,
                t0: Date.now(), timeout: timeoutMs,
                phase: "preparing",
                phaseStart: Date.now(),
                prompt: prompt || "",
                progress: progress || null,
                lastText: "", stableStart: 0,
                sendAttempted: false,
                baselineLastText: (function () {
                    var msgs = findAssistantMessages();
                    if (msgs.length === 0) return "";
                    var last = msgs[msgs.length - 1];
                    return (last.innerText || last.textContent || "").trim();
                })()
            };
            _showStatus({ title: _formatTitle(_askState.progress), phase: "准备中…", pct: _formatPct(_askState.progress), dot: "preparing" });
            if (window.__uooc_tick_timer) { try { clearInterval(window.__uooc_tick_timer); } catch (e) {} }
            window.__uooc_tick_timer = setInterval(() => {
                if (!_askState) {
                    try { clearInterval(window.__uooc_tick_timer); } catch (e) {}
                    window.__uooc_tick_timer = null;
                    return;
                }
                _tickAsk();
            }, 400);
            _tickAsk();
        }
        function _tickAsk() {
            if (!_askState) return;
            const st = _askState;
            const elapsed = Date.now() - st.t0;
            if (elapsed > st.timeout) {
                _failAsk(`等待 DeepSeek 回答超时，最后文本尾部：${(st.lastText || "").slice(-200)}`);
                return;
            }
            if (st.phase === "preparing") {
                if (isGenerating()) {
                    _showStatus({ title: _formatTitle(st.progress), phase: "等待上一次回答结束…", pct: _formatPct(st.progress), dot: "preparing" });
                    return;
                }
                const input = findInputArea();
                if (!input) {
                    st.inputMissCount = (st.inputMissCount || 0) + 1;
                    if (st.inputMissCount < 10) {
                        _showStatus({ title: _formatTitle(st.progress), phase: "等待输入框出现（" + st.inputMissCount + "/10）", pct: _formatPct(st.progress), dot: "preparing" });
                        return;
                    }
                    _failAsk("找不到输入框（等待 4 秒后仍未出现）");
                    return;
                }
                st.inputMissCount = 0;
                if (!_writeInputValue(input, st.prompt)) {
                    _failAsk("写入输入框失败");
                    return;
                }
                st.phase = "sending";
                st.phaseStart = Date.now();
                _showStatus({ title: _formatTitle(st.progress), phase: "发送中…", pct: _formatPct(st.progress), dot: "sending" });
                return;
            }
            if (st.phase === "sending") {
                const inp = findInputArea();
                if (!inp) {
                    st.inputMissCount = (st.inputMissCount || 0) + 1;
                    if (st.inputMissCount < 10) {
                        _showStatus({ title: _formatTitle(st.progress), phase: "输入框暂时消失，等待恢复（" + st.inputMissCount + "/10）", pct: _formatPct(st.progress), dot: "sending" });
                        return;
                    }
                    _failAsk("输入框消失（等待 4 秒后仍未恢复）");
                    return;
                }
                st.inputMissCount = 0;
                if (_isInputEmpty(inp)) {
                    st.phase = "waitingAnswer";
                    st.phaseStart = Date.now();
                    st.lastText = "";
                    st.stableStart = 0;
                    _showStatus({ title: _formatTitle(st.progress), phase: "等待回答…", pct: _formatPct(st.progress), dot: "waiting" });
                    return;
                }
                const elapsed = Date.now() - st.phaseStart;
                if (elapsed < 500) return;
                if (!st.sendAttempted) {
                    st.sendAttempted = true;
                    try {
                        inp.focus();
                        inp.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 }));
                    } catch (e) {}
                    try {
                        const btn = findSendButton();
                        if (btn && !(btn.classList && btn.classList.contains("ds-button--disabled"))) btn.click();
                    } catch (e) {}
                }
                if (elapsed > 5000) {
                    _failAsk("发送失败：输入框内容未被清空（发送按钮可能处于禁用态）");
                }
                return;
            }
            if (st.phase === "waitingAnswer") {
                const waitingSec = Math.round((Date.now() - st.phaseStart) / 1000);
                const curMsgs = findAssistantMessages();
                const curLast = curMsgs.length > 0 ? curMsgs[curMsgs.length - 1] : null;
                const curLastText = curLast ? (curLast.innerText || curLast.textContent || "").trim() : "";
                const newAppeared = curLastText !== "" && curLastText !== (st.baselineLastText || "");
                let phaseText;
                if (!newAppeared) {
                    phaseText = "等待 AI 开始回答…（" + waitingSec + "s）";
                } else {
                    const gen = isGenerating();
                    phaseText = gen
                        ? "生成中…（" + waitingSec + "s）"
                        : (st.lastText ? "解析回答…（" + waitingSec + "s）" : "等待回答…（" + waitingSec + "s）");
                }
                _showStatus({ title: _formatTitle(st.progress), phase: phaseText, pct: _formatPct(st.progress), dot: "waiting" });
                _checkAnswerOnce();
            }
        }

        function extractAnswerText(msgEl) {
            if (!msgEl) return "";
            return (msgEl.innerText || msgEl.textContent || "").trim();
        }

        window.addEventListener("message", async (ev) => {
            const d = ev.data;
            if (!d || typeof d !== "object" || !d.__uooc_ds) return;
            const src = ev.source;

            if (d.type === "CONFIG" && d.method && typeof d.method === "object") {
                if (d.method.selectors && typeof d.method.selectors === "object") {
                    Object.assign(_method.selectors, d.method.selectors);
                }
                if (d.method.wait && typeof d.method.wait === "object") {
                    Object.assign(_method.wait, d.method.wait);
                }
                if (d.method.config && typeof d.method.config === "object") {
                    _method.config = Object.assign({}, _method.config, d.method.config);
                }
                if (d.method.name) _method.name = d.method.name;
                if (d.method.id) _method.id = d.method.id;
                LOG("CONFIG 已应用：", d.method.id || "(no id)");
                try { _refreshBridgeBadge(); } catch (e) {}
                try { src?.postMessage({ __uooc_ds: true, type: "CONFIG_OK", url: location.href }, "*"); } catch (e) {}
                return;
            }

            if (d.type === "PING") {
                try { _markBridgeReady(); } catch (e) {}
                try { src?.postMessage({ __uooc_ds: true, type: "PONG", version: "2.0", url: location.href }, "*"); } catch (e) {}
                return;
            }

            if (d.type === "TICK") {
                if (_askState && _askState.requestId === d.requestId) _tickAsk();
                return;
            }

            if (d.type === "ASK") {
                if (_askState) {
                    try { src?.postMessage({ __uooc_ds: true, type: "ANSWER", requestId: d.requestId, error: "busy" }, "*"); } catch (e) {}
                    return;
                }
                LOG("ASK:", (d.prompt || "").slice(0, 80));
                _startAsk(d.requestId, src, d.timeout || 120000, d.prompt || "", d.progress || null);
            }
        });

        /* 统一桥接器徽标（webpage 方案通用；方案可通过 config.badge 覆盖） */
        const _BADGE_DEFAULTS = {
            enabled: true,
            titlePrefix: "UOOC 桥接器",
            loadingText: "已加载（等待主页面）",
            readyText: "已就绪",
            loadingBg: "#ffc107",
            loadingFg: "#000000",
            readyBg: "#2e7d32",
            readyFg: "#ffffff",
            position: "top-right",
            hideAfterMs: 2500,
            readyFadeMs: 1500,
            draggable: true
        };
        function _getBadgeCfg() {
            let userCfg = {};
            try {
                if (_method && _method.config && _method.config.badge && typeof _method.config.badge === "object") {
                    userCfg = _method.config.badge;
                }
            } catch (e) {}
            const cfg = Object.assign({}, _BADGE_DEFAULTS, userCfg);
            if (!cfg.title) {
                if (_method && _method.name) cfg.title = _method.name;
                else if (_method && _method.id) cfg.title = _method.id;
                else cfg.title = "";
            }
            return cfg;
        }
        function _badgePositionCss(pos) {
            switch (pos) {
                case "top-left":     return "top:12px;left:12px;";
                case "bottom-right": return "bottom:12px;right:12px;";
                case "bottom-left":  return "bottom:12px;left:12px;";
                case "top-right":
                default:             return "top:12px;right:12px;";
            }
        }
        function _badgeLabel(cfg, text) {
            const parts = [String(cfg.titlePrefix || "UOOC 桥接器")];
            if (cfg.title) parts.push(String(cfg.title));
            parts.push(String(text));
            return parts.join(" · ");
        }
        function _bindBadgeDrag(badge) {
            let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
            function _start(cx, cy) {
                dragging = true; moved = false;
                sx = cx; sy = cy;
                const r = badge.getBoundingClientRect();
                ox = r.left; oy = r.top;
                badge.style.left = ox + "px";
                badge.style.top = oy + "px";
                badge.style.right = "auto";
                badge.style.bottom = "auto";
                try { badge.style.cursor = "grabbing"; } catch (e) {}
            }
            function _move(cx, cy) {
                if (!dragging) return;
                const dx = cx - sx, dy = cy - sy;
                if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) moved = true;
                badge.style.left = (ox + dx) + "px";
                badge.style.top = (oy + dy) + "px";
            }
            function _end() {
                if (!dragging) return;
                dragging = false;
                try { badge.style.cursor = "move"; } catch (e) {}
                if (moved) {
                    try { badge.dataset.dragged = "1"; } catch (e) {}
                    try {
                        if (window.__uooc_badge_hide_timer) { clearTimeout(window.__uooc_badge_hide_timer); window.__uooc_badge_hide_timer = null; }
                        if (window.__uooc_badge_fade_timer) { clearTimeout(window.__uooc_badge_fade_timer); window.__uooc_badge_fade_timer = null; }
                        badge.style.opacity = "1";
                    } catch (e) {}
                }
            }
            badge.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                _start(e.clientX, e.clientY);
                e.preventDefault();
            });
            document.addEventListener("mousemove", (e) => _move(e.clientX, e.clientY));
            document.addEventListener("mouseup", () => _end());
            badge.addEventListener("touchstart", (e) => {
                const t = e.touches[0];
                if (!t) return;
                _start(t.clientX, t.clientY);
                e.preventDefault();
            }, { passive: false });
            document.addEventListener("touchmove", (e) => {
                if (!dragging) return;
                const t = e.touches[0];
                if (!t) return;
                _move(t.clientX, t.clientY);
                e.preventDefault();
            }, { passive: false });
            document.addEventListener("touchend", () => _end());
            document.addEventListener("touchcancel", () => _end());
        }
        function _injectBridgeBadge() {
            try {
                const cfg = _getBadgeCfg();
                if (!cfg.enabled) return;
                if (document.getElementById("uooc-bridge-badge")) return;
                const badge = document.createElement("div");
                badge.id = "uooc-bridge-badge";
                badge.style.cssText = [
                    "position:fixed", _badgePositionCss(cfg.position),
                    "z-index:2147483647",
                    "padding:6px 12px", "border-radius:6px",
                    "font-family:Consolas,monospace", "font-size:12px",
                    "background:" + cfg.loadingBg, "color:" + cfg.loadingFg,
                    "font-weight:bold",
                    "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
                    "pointer-events:auto", "cursor:move",
                    "user-select:none", "-webkit-user-select:none",
                    "touch-action:none",
                    "transition:opacity .5s",
                    "max-width:60vw", "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap"
                ].join(";");
                badge.textContent = _badgeLabel(cfg, cfg.loadingText);
                (document.body || document.documentElement).appendChild(badge);
                window.__uooc_bridge_badge = badge;
                if (cfg.draggable) _bindBadgeDrag(badge);
            } catch (e) {}
        }
        function _refreshBridgeBadge() {
            try {
                const b = window.__uooc_bridge_badge;
                if (!b) return;
                if (b.dataset && b.dataset.ready === "1") return;
                const cfg = _getBadgeCfg();
                if (!cfg.enabled) {
                    try { b.remove(); } catch (e) {}
                    window.__uooc_bridge_badge = null;
                    return;
                }
                b.style.background = cfg.loadingBg;
                b.style.color = cfg.loadingFg;
                b.textContent = _badgeLabel(cfg, cfg.loadingText);
            } catch (e) {}
        }
        function _markBridgeReady() {
            const b = window.__uooc_bridge_badge;
            if (!b) return;
            if (b.dataset && b.dataset.ready === "1") return;
            try { b.dataset.ready = "1"; } catch (e) {}
            const cfg = _getBadgeCfg();
            b.style.background = cfg.readyBg;
            b.style.color = cfg.readyFg;
            b.textContent = _badgeLabel(cfg, cfg.readyText);
            if (cfg.hideAfterMs > 0 && !(b.dataset && b.dataset.dragged === "1")) {
                const fadeAt = Math.max(0, cfg.hideAfterMs - (cfg.readyFadeMs || 1000));
                window.__uooc_badge_fade_timer = setTimeout(() => { try { b.style.opacity = "0"; } catch (e) {} }, fadeAt);
                window.__uooc_badge_hide_timer = setTimeout(() => { try { b.remove(); } catch (e) {} }, cfg.hideAfterMs);
            }
        }
        _injectBridgeBadge();

        function _reportReady() {
            if (!window.opener) return;
            try { window.opener.postMessage({ __uooc_ds: true, type: "READY", version: "2.0", url: location.href }, "*"); } catch (e) {}
        }
        /* 立即上报 + 前 10 秒每秒再上报一次，确保主页面一定能收到 */
        _reportReady();
        let _readyTicks = 0;
        const _readyTimer = setInterval(() => {
            _reportReady();
            _readyTicks++;
            if (_readyTicks >= 10) clearInterval(_readyTimer);
        }, 1000);
        LOG("桥接器已加载 v2.0");
    }

    /* 【MethodBridge】—— 修改前见顶部注意事项 E / F / G
     * ============================================================
     * 【MethodBridge】由 Method Descriptor 驱动的 LLM 客户端
     *   - 兼容旧接口 openConversation / closePopup / isOpen / focus /
     *     getCurrentUrl / requestUrl / ask
     *   - 每次 openConversation 时把 selectors/wait 通过 CONFIG 推送给桥接器
     *   - 桥接器上报 location.href（跨域时主页面无法直接读取 popup.location）
     * ============================================================ */
    const MethodBridge = (function () {
        let popup = null;
        let ready = false;
        let pending = new Map();
        let seq = 0;
        let lastKnownUrl = "";
        let currentMethod = null;
        let configSent = false;
        /* 【修复】用内部变量记录 popup 对应的 methodId，
           不再向跨域的 popup 挂自定义属性（会被同源策略拦截） */
        let popupMethodId = null;

        function _ensurePopup(method) {
            currentMethod = method || MethodStore.getActive();
            if (!currentMethod) throw new Error("没有可用的 AI 方案（请先在设置中选择或创建）");
            if (currentMethod.type === "http") return null;
            const url = (currentMethod.config && currentMethod.config.url) || "https://chat.deepseek.com/";
            const baseName = (currentMethod.config && currentMethod.config.windowName) || "uooc_ai_window";
            /* 窗口 name 拼上 methodId：不同方案用不同窗口，天然避免复用错误窗口 */
            const name = baseName + "_" + currentMethod.id;
            if (popup && !popup.closed && popupMethodId === currentMethod.id) return popup;
            if (popup && !popup.closed) { try { popup.close(); } catch (e) {} }
            popup = window.open(url, name);
            if (!popup) throw new Error(
                "无法打开 AI 窗口：可能被浏览器弹窗拦截，或 Tampermonkey 排除了该域名导致脚本未注入。" +
                "请检查地址栏右侧的弹窗拦截提示，并确认 Tampermonkey 未把该 AI 域名加入「排除的域名」。"
            );
            popupMethodId = currentMethod.id;
            /* 立即 focus，避免被浏览器放到后台导致 JS 暂停 */
            try { popup.focus(); } catch (e) {}
            ready = false;
            lastKnownUrl = "";
            configSent = false;
            return popup;
        }

        function _sendConfig() {
            if (!popup || popup.closed) return;
            if (!currentMethod) return;
            try {
                popup.postMessage({
                    __uooc_ds: true,
                    type: "CONFIG",
                    method: {
                        id: currentMethod.id,
                        name: currentMethod.name,
                        type: currentMethod.type,
                        selectors: currentMethod.selectors,
                        wait: currentMethod.wait,
                        config: currentMethod.config
                    }
                }, "*");
                configSent = true;
            } catch (e) {}
        }

        let _onLog = null;
        function _log(msg) { if (_onLog) _onLog(msg); }
        let _onQuizLog = null;
        function _quizLog(msg, type) { if (_onQuizLog) _onQuizLog(msg, type || "debug"); }

        window.addEventListener("message", (ev) => {
            const d = ev.data;
            if (!d || typeof d !== "object" || !d.__uooc_ds) return;
            if (typeof d.url === "string" && d.url) lastKnownUrl = d.url;
            if (d.type === "READY" || d.type === "PONG" || d.type === "CONFIG_OK") { ready = true; return; }
            if (d.type === "ANSWER" && d.requestId != null) {
                const p = pending.get(d.requestId);
                if (p) {
                    if (p.ticker) try { clearInterval(p.ticker); } catch (e) {}
                    pending.delete(d.requestId);
                    if (d.error) p.reject(new Error(d.error));
                    else p.resolve(d.answer);
                }
            }
        });

        async function _waitReady(timeoutMs) {
            if (!currentMethod) throw new Error("没有可用的 AI 方案");
            /* 默认超时提升到 30 秒，兼容慢加载环境 */
            const limit = timeoutMs || (currentMethod.wait && currentMethod.wait.readyMs) || 30000;
            const t0 = Date.now();
            let tick = 0;
            let _lastConfigSentAt = 0;
            _log(`等待 AI 桥接器就绪（上限 ${Math.round(limit / 1000)} 秒）…`);
            while (Date.now() - t0 < limit) {
                if (!popup || popup.closed) throw new Error("AI 窗口已关闭");
                /* 每 1.5 秒重发一次 CONFIG，确保桥接器收到最新 selectors/wait */
                if (Date.now() - _lastConfigSentAt > 1500) {
                    _sendConfig();
                    _lastConfigSentAt = Date.now();
                }
                try { popup.postMessage({ __uooc_ds: true, type: "PING" }, "*"); } catch (e) {}
                await sleep(400);
                if (ready) { _log("AI 桥接器已就绪"); return; }
                tick++;
                /* 每 5 个 tick（2 秒）打一次状态 */
                if (tick % 5 === 0) {
                    const sec = Math.round((Date.now() - t0) / 1000);
                    _log(`等待响应…（${sec}s / ${Math.round(limit / 1000)}s）`);
                }
            }
            {
                const tgt = (currentMethod && currentMethod.config && currentMethod.config.url) || "(未知)";
                throw new Error(
                    `AI 桥接器未响应（目标：${tgt}）。排查建议：` +
                    `① 检查 Tampermonkey 设置 → 安全性 →「排除的域名」是否包含该域名；` +
                    `② 检查脚本 @match 是否包含该域名、是否被 @exclude 排除；` +
                    `③ 切到 AI 窗口看右上角是否有「UOOC 桥接器 已加载」徽章；` +
                    `若没有徽章说明脚本未注入，请按上述 1–2 项处理并刷新 AI 窗口后重试。`
                );
            }
        }

        async function _httpAsk(method, prompt, timeoutMs) {
            const cfg = method.config || {};
            const endpoint = String(cfg.endpoint || "").trim();
            if (!endpoint) throw new Error("HTTP 方案缺少 config.endpoint");

            const httpMethod = String(cfg.method || "POST").toUpperCase();
            const headers = Object.assign({ "Content-Type": "application/json" }, cfg.headers || {});
            (function normalizeAuth() {
                const raw = String(headers.Authorization || headers.authorization || "").trim();
                delete headers.Authorization;
                delete headers.authorization;
                if (!raw) return;
                const hasScheme = /\s/.test(raw);
                headers.Authorization = hasScheme ? raw : ("Bearer " + raw);
            })();
            const messages = [];
            const sys = String(cfg.systemPrompt || "").trim();
            if (sys) messages.push({ role: "system", content: sys });
            messages.push({ role: "user", content: prompt });

            const body = { model: cfg.model || "deepseek-flash", messages, stream: false };
            if (Number.isFinite(Number(cfg.temperature))) body.temperature = Number(cfg.temperature);
            if (Number.isFinite(Number(cfg.maxTokens))) body.max_tokens = Number(cfg.maxTokens);
            if (Number.isFinite(Number(cfg.topP))) body.top_p = Number(cfg.topP);

            if (cfg.modelPreset === "deepseek" || cfg.modelPreset === "doubao") {
                const effort = String(cfg.reasoningEffort || "high");
                const thinking = String(cfg.thinking || "enabled");
                if (thinking === "disabled" || effort === "none" || effort === "minimal") {
                    body.thinking = { type: "disabled" };
                } else if (thinking === "auto" && cfg.modelPreset === "doubao") {
                    body.thinking = { type: "auto" };
                    if (effort) body.reasoning_effort = effort;
                } else {
                    body.thinking = { type: "enabled" };
                    body.reasoning_effort = effort;
                }
            }

            const _LF = String.fromCharCode(10);
            _quizLog("══════ 智能答题 HTTP 请求 ══════", "run");
            _quizLog("端点：" + httpMethod + " " + endpoint, "info");
            _quizLog("模型：" + body.model, "info");
            try {
                const safe = Object.assign({}, headers);
                ["Authorization", "authorization"].forEach(function (k) {
                    if (safe[k]) {
                        const a = String(safe[k]);
                        safe[k] = a.length > 12 ? (a.slice(0, 8) + "…" + a.slice(-4)) : "***";
                    }
                });
                _quizLog("请求头：" + JSON.stringify(safe), "info");
            } catch (e) {}
            if (sys) _quizLog("[系统提示词]" + _LF + sys, "info");
            _quizLog("[用户提示词]" + _LF + prompt, "info");
            try {
                const b = Object.assign({}, body);
                delete b.messages;
                _quizLog("其他参数：" + JSON.stringify(b), "info");
            } catch (e) {}

            const ac = new AbortController();
            const killTimer = setTimeout(() => { try { ac.abort(); } catch (e) {} }, timeoutMs);
            const _reqStart = Date.now();

            let resp;
            try {
                resp = await fetch(endpoint, {
                    method: httpMethod,
                    headers: headers,
                    body: httpMethod === "GET" ? undefined : JSON.stringify(body),
                    signal: ac.signal
                });
            } catch (e) {
                clearTimeout(killTimer);
                _quizLog("请求异常（" + (Date.now() - _reqStart) + "ms）：" + (e && e.message ? e.message : e), "err");
                throw new Error("HTTP 请求失败：" + (e && e.message ? e.message : e));
            }
            clearTimeout(killTimer);
            const _elapsed = Date.now() - _reqStart;

            if (!resp.ok) {
                let errText = "";
                try { errText = await resp.text(); } catch (e) {}
                _quizLog("HTTP " + resp.status + "（" + _elapsed + "ms）", "err");
                _quizLog("[错误响应体]" + _LF + String(errText).slice(0, 2000), "err");
                throw new Error("HTTP " + resp.status + "：" + errText.slice(0, 300));
            }
            _quizLog("HTTP " + resp.status + " 成功（" + _elapsed + "ms）", "ok");

            let data;
            try { data = await resp.json(); }
            catch (e) {
                _quizLog("响应不是合法 JSON", "err");
                throw new Error("响应不是合法 JSON");
            }

            try {
                const full = JSON.stringify(data);
                const maxLen = 4000;
                const shown = full.length > maxLen ? (full.slice(0, maxLen) + _LF + "…（共 " + full.length + " 字符，已截断）") : full;
                _quizLog("[原始响应]" + _LF + shown, "info");
            } catch (e) {}

            const pathArr = String(cfg.responsePath || "choices.0.message.content").split(".").filter(Boolean);
            let v = data;
            for (const k of pathArr) {
                if (v == null) break;
                v = v[k];
            }
            if (v == null) {
                _quizLog("未按 responsePath=" + cfg.responsePath + " 提取到内容", "err");
                throw new Error("未按 responsePath 提取到内容，响应尾部：" + JSON.stringify(data).slice(-300));
            }
            const _ans = String(v);
            try {
                const maxLen = 2000;
                const shown = _ans.length > maxLen ? (_ans.slice(0, maxLen) + _LF + "…（共 " + _ans.length + " 字符，已截断）") : _ans;
                _quizLog("[提取回答]" + _LF + shown, "ok");
            } catch (e) {}
            _log("HTTP 响应完成");
            return _ans;
        }

        return {
            openConversation(url) {
                currentMethod = currentMethod || MethodStore.getActive();
                if (currentMethod && currentMethod.type === "http") return;
                _ensurePopup();
            },
            closePopup() {
                if (popup && !popup.closed) { try { popup.close(); } catch (e) {} }
                popup = null;
                ready = false;
                configSent = false;
                popupMethodId = null;
            },
            isOpen() { return !!(popup && !popup.closed); },
            focus() { if (popup && !popup.closed) { try { popup.focus(); } catch (e) {} } },
            getCurrentUrl() {
                if (lastKnownUrl) return lastKnownUrl;
                try { return popup && !popup.closed ? popup.location.href : null; } catch (e) { return null; }
            },
            async requestUrl(timeoutMs = 3000) {
                if (!popup || popup.closed) return null;
                const savedUrl = lastKnownUrl;
                lastKnownUrl = "";
                try { popup.postMessage({ __uooc_ds: true, type: "PING" }, "*"); }
                catch (e) { lastKnownUrl = savedUrl; return savedUrl || null; }
                const t0 = Date.now();
                while (Date.now() - t0 < timeoutMs) {
                    await sleep(120);
                    if (lastKnownUrl) return lastKnownUrl;
                }
                lastKnownUrl = savedUrl;
                return savedUrl || null;
            },
            onLog(fn) { _onLog = fn; },
            onQuizLog(fn) { _onQuizLog = fn; },
            async ask(prompt, timeoutMs = 120000, progress) {
                currentMethod = currentMethod || MethodStore.getActive();
                if (!currentMethod) throw new Error("没有可用的 AI 方案（请先在设置中选择或创建）");
                if (currentMethod.type === "http") {
                    return await _httpAsk(currentMethod, prompt, timeoutMs);
                }
                _ensurePopup();
                await _waitReady();
                const id = ++seq;
                return new Promise((resolve, reject) => {
                    const ticker = setInterval(() => {
                        if (!popup || popup.closed || !pending.has(id)) { clearInterval(ticker); return; }
                        try { popup.postMessage({ __uooc_ds: true, type: "TICK", requestId: id }, "*"); } catch (e) {}
                    }, 500);
                    pending.set(id, { resolve, reject, ticker });
                    try {
                        popup.postMessage({ __uooc_ds: true, type: "ASK", requestId: id, prompt, timeout: timeoutMs, progress: progress || null }, "*");
                    } catch (e) {
                        clearInterval(ticker);
                        pending.delete(id);
                        reject(e);
                    }
                    setTimeout(() => {
                        if (pending.has(id)) {
                            const p = pending.get(id);
                            if (p && p.ticker) try { clearInterval(p.ticker); } catch (e) {}
                            pending.delete(id);
                            reject(new Error("LLM 请求超时"));
                        }
                    }, timeoutMs + 5000);
                });
            }
        };
    })();

    /* 兼容别名：QuizSolver 中所有对 LLM_BRIDGE 的引用继续有效 */
    const LLM_BRIDGE = MethodBridge;

    /* 把 MethodBridge 的日志转发到 UI 面板 */
    if (typeof MethodBridge.onLog === "function") {
        MethodBridge.onLog((msg) => {
            try { if (typeof UI !== "undefined" && UI.log) UI.log("[AI] " + msg, "debug"); } catch (e) {}
        });
    }

    /* 【测验缓存】—— 修改前见顶部用户要求 1 / 2 与注意事项 D
     * ============================================================
     * 【测验缓存】按课程 ID 区分
     *   存储键：uooc_quiz_cache_<courseId>
     *   结构：{ version, courseId, submitMode, deepseekConversationUrl, taskpoints }
     * ============================================================ */
    const QUIZ_STORAGE_PREFIX = "uooc_quiz_cache_";
    const QUIZ_STORAGE_VERSION = "2.9";

    const QuizCache = (function () {
        function _key() {
            const cid = getCourseId();
            return cid ? QUIZ_STORAGE_PREFIX + cid : null;
        }
        function load() {
            const key = _key();
            if (!key) return null;
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                const d = JSON.parse(raw);
                if (!d || !String(d.version || "").startsWith(QUIZ_STORAGE_VERSION)) return null;
                if (!d.taskpoints || typeof d.taskpoints !== "object") d.taskpoints = {};
                if (!d.submitMode) d.submitMode = "manual";
                return d;
            } catch (e) { return null; }
        }
        function save(data) {
            const key = _key();
            if (!key) return false;
            try {
                let _courseName = "";
                try { _courseName = (typeof getCourseName === "function" ? getCourseName() : "") || ""; } catch (e) {}
                const ordered = {
                    version: QUIZ_STORAGE_VERSION,
                    courseId: getCourseId(),
                    courseName: _courseName,
                    timestamp: Date.now(),
                    submitMode: data.submitMode || "manual",
                    deepseekConversationUrl: data.deepseekConversationUrl || "",
                    taskpoints: data.taskpoints || {}
                };
                localStorage.setItem(key, JSON.stringify(ordered));
                return true;
            } catch (e) { return false; }
        }
        function ensure() {
            let d = load();
            if (!d) d = { version: QUIZ_STORAGE_VERSION, taskpoints: {}, submitMode: "manual", deepseekConversationUrl: "" };
            return d;
        }
        function clear() {
            const key = _key();
            if (!key) return false;
            try { localStorage.removeItem(key); return true; } catch (e) { return false; }
        }
        return { load, save, ensure, clear };
    })();

    /* ============================================================
     * 【测验文档定位】优先主文档 → data-iframe-src 内联 → iframe → frames
     * ============================================================ */
    function getQuizDoc() {
        try {
            if (document.querySelector(".testPaperShow .queContainer")) return document;
        } catch (e) {}
        try {
            const containers = document.querySelectorAll("[data-iframe-src]");
            for (const c of containers) {
                if (c.querySelector(".testPaperShow .queContainer")) return document;
            }
        } catch (e) {}
        const iframes = document.querySelectorAll("iframe");
        for (const f of iframes) {
            try {
                const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (doc && doc.querySelector(".testPaperShow .queContainer")) return doc;
            } catch (e) {}
        }
        try {
            const total = window.frames.length;
            for (let i = 0; i < total; i++) {
                try {
                    const doc = window.frames[i].document;
                    if (doc && doc.querySelector(".testPaperShow .queContainer")) return doc;
                } catch (e) {}
            }
        } catch (e) {}
        return null;
    }

    function getTaskpointInfo() {
        const doc = getQuizDoc();
        if (!doc) return { taskId: "unknown", title: "" };
        const win = doc.defaultView || window;
        let taskId = "";
        try { taskId = win.taskId || ""; } catch (e) {}
        let title = "";
        try {
            const t1 = doc.querySelector(".testPaper-Top .fl_left");
            if (t1) title = (t1.innerText || t1.textContent || "").trim();
        } catch (e) {}
        if (!title) {
            try {
                const t2 = doc.querySelector(".course-name");
                if (t2) title = (t2.innerText || t2.textContent || "").trim();
            } catch (e) {}
        }
        return { taskId: taskId || title || "unknown", title };
    }

    /* ============================================================
     * 【测验题目提取器】仅识别单选 / 多选 / 文本
     *   hash 只基于题干
     * ============================================================ */
    function _hashString(s) {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
        return (h >>> 0).toString(16);
    }

    function QuizExtractor_extract() {
        const doc = getQuizDoc();
        if (!doc) return [];
        const containers = doc.querySelectorAll(".testPaperShow .queContainer");
        const list = [];
        let qi = 0;
        for (const box of containers) {
            const qEl = box.querySelector(".ti-q-c");
            if (!qEl) continue;
            const questionText = (qEl.innerText || qEl.textContent || "").trim();
            if (!questionText) continue;

            let type = null;
            if (box.querySelector('input[type="radio"]')) type = "single";
            else if (box.querySelector('input[type="checkbox"]')) type = "multiple";
            else if (box.querySelector(".ue-container")) type = "text";
            if (!type) continue;

            const options = [];
            if (type === "single" || type === "multiple") {
                const opts = box.querySelectorAll(".ti-a");
                opts.forEach(opt => {
                    const labelEl = opt.querySelector(".ti-a-i");
                    const textEl = opt.querySelector(".ti-a-c");
                    let label = (labelEl?.innerText || "").trim().replace(/[\.\s].*/, "");
                    label = label.slice(0, 2);
                    const text = (textEl?.innerText || textEl?.textContent || "").trim();
                    options.push({ label, text });
                });
            }

            const hash = _hashString(questionText);
            list.push({ index: qi++, type, question: questionText, options, hash, boxEl: box });
        }
        return list;
    }

    /* ============================================================
     * 【选择题匹配逻辑】
     *   1. 题干哈希相同
     *   2. 选项文本集合一致（顺序无关）
     *   3. 按旧答案字母 → 选项文本 → 新选项字母 重排
     * ============================================================ */
    function _normText(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, " "); }

    function optionsEquivalent(o1, o2) {
        if (!Array.isArray(o1) || !Array.isArray(o2)) return false;
        if (o1.length !== o2.length) return false;
        const s1 = o1.map(o => _normText(o.text)).slice().sort();
        const s2 = o2.map(o => _normText(o.text)).slice().sort();
        for (let i = 0; i < s1.length; i++) if (s1[i] !== s2[i]) return false;
        return true;
    }

    function remapAnswer(ansLetters, oldOpts, newOpts) {
        if (!ansLetters) return null;
        const oldByLabel = new Map();
        for (const o of oldOpts) oldByLabel.set((o.label || "").toUpperCase(), _normText(o.text));
        const correctTexts = new Set();
        for (const L of String(ansLetters).toUpperCase().split("")) {
            const t = oldByLabel.get(L);
            if (t == null) return null;
            correctTexts.add(t);
        }
        const newLabels = [];
        for (const o of newOpts) {
            const t = _normText(o.text);
            if (correctTexts.has(t)) newLabels.push((o.label || "").toUpperCase());
        }
        if (newLabels.length !== correctTexts.size) return null;
        newLabels.sort();
        return newLabels.join("");
    }

    function findReusableAnswer(q, pool) {
        if (!Array.isArray(pool)) return null;
        for (const c of pool) {
            if (!c) continue;
            if (c.hash !== q.hash) continue;
            if (c.type !== q.type) continue;
            if (!c.answer) continue;
            if (q.type === "text") return c.answer;
            if (optionsEquivalent(c.options, q.options)) {
                const mapped = remapAnswer(c.answer, c.options, q.options);
                if (mapped != null) return mapped;
            }
        }
        return null;
    }

    /* ============================================================
     * 【提示词构造】要求 AI 在最后一段以「【答案】」开头
     * ============================================================ */
    function buildPrompt(q) {
        const header = [];
        let _sys = "";
        try {
            const _m = MethodStore.getActive();
            if (_m && _m.config && typeof _m.config.systemPrompt === "string") {
                _sys = _m.config.systemPrompt.trim();
            }
        } catch (e) {}
        header.push(_sys || "你是一名答题助手，请回答下面的题目。", "");
        if (q.type === "single" || q.type === "multiple") {
            const typeName = q.type === "single" ? "单选题" : "多选题";
            const optLines = q.options.map(o => `${o.label}. ${o.text}`).join("\n");
            const tailRule = q.type === "single"
                ? "该行中只写一个代表正确选项的大写字母（例如 A）"
                : "该行中只写代表所有正确选项的大写字母（按字母表升序，如 ACD；不要空格、不要标点）";
            return [
                ...header,
                `【题型】${typeName}`,
                `【题干】${q.question}`,
                `【选项】`,
                optLines,
                "",
                "【回答要求】",
                "1. 你可以先在回答中简要分析或说明思路。",
                "2. 在回答的最后一段，另起一行，以「【答案】」开头，后紧跟你的最终答案。",
                `3. ${tailRule}。`,
                "4. 该「【答案】…」行必须位于整个回答的最后一行。",
            ].join(String.fromCharCode(10));
        }
        return [
            ...header,
            `【题型】文本输入题`,
            `【题干】${q.question}`,
            "",
            "【回答要求】",
            "1. 你可以先在回答中简要分析或说明思路。",
            "2. 在回答的最后一段，另起一行，以「【答案】」开头，后紧跟你的最终答案。",
            "3. 该答案本身不超过 60 个汉字，不含引号，不含换行。",
            "4. 该「【答案】…」行必须位于整个回答的最后一行。",
        ].join(String.fromCharCode(10));
    }

    function _extractAnswerSegment(raw) {
        const s = String(raw == null ? "" : raw);
        const m = s.match(/【答案】\s*([^\n\r]+)/);
        if (m) return m[1].trim();
        return null;
    }

    function parseAnswer(q, raw) {
        if (raw == null) return null;
        const seg = _extractAnswerSegment(raw);
        if (!seg) return null;
        if (q.type === "single") {
            const labels = new Set(q.options.map(o => (o.label || "").toUpperCase()));
            const m = seg.toUpperCase().match(/[A-Z]/g) || [];
            for (const L of m) if (labels.has(L)) return L;
            return null;
        }
        if (q.type === "multiple") {
            const labels = new Set(q.options.map(o => (o.label || "").toUpperCase()));
            const letters = (seg.toUpperCase().match(/[A-Z]/g) || []).filter(L => labels.has(L));
            const unique = Array.from(new Set(letters));
            unique.sort();
            return unique.length > 0 ? unique.join("") : null;
        }
        const t = seg.replace(/^["'`“”‘’]|["'`“”‘’]$/g, "").trim();
        return t.slice(0, 60);
    }

    /* ============================================================
     * 【文本题语义匹配】
     * ============================================================ */
    function buildSemanticMatchPrompt(newQ, cachedList) {
        const list = cachedList.map((c, i) =>
            `${i + 1}. 题干：${c.question}\n   原答案：${c.answer}`
        ).join("\n");
        return [
            "以下是新题目和若干历史题目，请判断新题目是否与某个历史题目的题干语义高度相似（指同一知识点或同一问法）。",
            `新题目题干：${newQ.question}`,
            "历史题目列表：",
            list,
            "",
            "如果存在高度相似的历史题目，请只输出该历史题目的序号（例如 3），不要输出任何其他内容。",
            "如果没有高度相似的历史题目，请只输出 0，不要输出任何其他内容。",
        ].join(String.fromCharCode(10));
    }
    function parseSemanticMatch(raw, maxIdx) {
        if (raw == null) return -1;
        const m = String(raw).match(/\d+/);
        if (!m) return -1;
        const n = parseInt(m[0], 10);
        if (n >= 1 && n <= maxIdx) return n - 1;
        return -1;
    }

    /* ============================================================
     * 【答案写入】
     *   光标进入题目区域 → 触发左侧题目列表选中（ng-mouseenter）
     * ============================================================ */
    function fireMouseEnter(el) {
        if (!el) return;
        const doc = el.ownerDocument || document;
        const win = (doc && doc.defaultView) || window;
        const ME = win.MouseEvent || MouseEvent;
        try {
            el.dispatchEvent(new ME("mouseenter", { bubbles: false, cancelable: true, view: win }));
            el.dispatchEvent(new ME("mouseover",  { bubbles: true,  cancelable: true, view: win }));
        } catch (e) {}
    }
    function focusQuizQuestion(boxEl) { fireMouseEnter(boxEl); }

    async function fillChoiceAnswer(q, answerLetters) {
        if (!answerLetters) return false;
        const labels = q.options.map(o => o.label);
        const targetLetters = q.type === "single"
            ? [answerLetters]
            : Array.from(new Set(String(answerLetters).toUpperCase().split("")));
        const labelsToClick = new Set(targetLetters.map(L => {
            const idx = L.charCodeAt(0) - 65;
            return labels[idx];
        }).filter(Boolean));

        let ok = false;
        const opts = q.boxEl.querySelectorAll(".ti-a");
        opts.forEach(opt => {
            const labelEl = opt.querySelector(".ti-a-i");
            let label = (labelEl?.innerText || "").trim().replace(/[\.\s].*/, "").slice(0, 2);
            const input = opt.querySelector('input[type="radio"], input[type="checkbox"]');
            if (!input || !label) return;
            const shouldCheck = labelsToClick.has(label);
            const isChecked = input.checked === true;
            if (shouldCheck && !isChecked) {
                try { opt.click(); } catch (e) {}
                ok = true;
            }
        });
        return ok;
    }

    async function fillTextAnswer(q, text) {
        if (!text) return false;
        const ueBox = q.boxEl.querySelector(".ue-container");
        if (!ueBox) return false;
        let done = false;
        try {
            const doc = ueBox.ownerDocument;
            const win = (doc && doc.defaultView) || window;
            const UE = win.UE || (win.parent && win.parent.UE);
            if (UE && UE.instants) {
                const instantKeys = Object.keys(UE.instants);
                for (const k of instantKeys) {
                    const inst = UE.instants[k];
                    if (!inst) continue;
                    const ce = inst.container || inst.iframe || inst.editbox;
                    if (ce && ueBox.contains(ce) === true) {
                        inst.setContent(`<p>${text}</p>`);
                        done = true;
                        break;
                    }
                }
                if (!done) {
                    for (const k of instantKeys) {
                        const inst = UE.instants[k];
                        if (!inst) continue;
                        try { inst.setContent(`<p>${text}</p>`); done = true; break; } catch (e) {}
                    }
                }
            }
        } catch (e) {}
        if (!done) {
            const ta = ueBox.querySelector('textarea.hide, textarea');
            if (ta) {
                const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
                setter.call(ta, `<p>${text}</p>`);
                ta.dispatchEvent(new Event("input", { bubbles: true }));
                ta.dispatchEvent(new Event("change", { bubbles: true }));
                done = true;
            }
        }
        return done;
    }

    /* 【智能闯关编排器】—— 修改前见顶部注意事项 D / E
     * ============================================================
     * 【智能闯关编排器】
     *   流程：提取题目 → 写入缓存 → 打开 AI → 逐题询问 → 写回缓存 → 填入页面
     *   同一课程优先复用同一对话链接，失效时创建新对话
     * ============================================================ */
    const QuizSolver = (function () {
        let running = false;
        let stopRequested = false;
        let onChange = null;
        let _askProgress = null;

        function _log(msg, type) { if (onChange) onChange("log", msg, type); }
        function _setStatus(t) { if (onChange) onChange("status", t); }
        function _setProgress(done, total) { if (onChange) onChange("progress", done, total); }

        /* 校验答案是否真的被填充到页面上 */
        function _verifyAnswerFilled(q, ans) {
            if (!ans || !q || !q.boxEl) return false;
            try {
                if (q.type === "single" || q.type === "multiple") {
                    const target = String(ans).toUpperCase().replace(/[^A-Z]/g, "");
                    if (!target) return false;
                    const targetSet = new Set(target.split(""));
                    const labels = q.options.map(o => String(o && o.label || "").toUpperCase().replace(/[^A-Z]/g, "").charAt(0));
                    const opts = q.boxEl.querySelectorAll(".ti-a");
                    const checkedLabels = new Set();
                    opts.forEach((opt, idx) => {
                        const input = opt.querySelector('input[type="radio"], input[type="checkbox"]');
                        if (input && input.checked) {
                            const lbl = labels[idx];
                            if (lbl) checkedLabels.add(lbl);
                        }
                    });
                    if (checkedLabels.size !== targetSet.size) return false;
                    for (const l of targetSet) { if (!checkedLabels.has(l)) return false; }
                    return true;
                }
                if (q.type === "text") {
                    const ueBox = q.boxEl.querySelector(".ue-container");
                    if (!ueBox) return false;
                    try {
                        const ta = ueBox.querySelector('textarea.hide, textarea');
                        if (ta && ta.value && String(ta.value).replace(/<[^>]+>/g, "").trim()) return true;
                    } catch (e) {}
                    try {
                        const doc = ueBox.ownerDocument;
                        const win = (doc && doc.defaultView) || window;
                        const UE = win.UE || (win.parent && win.parent.UE);
                        if (UE && UE.instants) {
                            for (const k of Object.keys(UE.instants)) {
                                const inst = UE.instants[k];
                                if (!inst) continue;
                                try {
                                    const html = inst.getContent() || "";
                                    if (String(html).replace(/<[^>]+>/g, "").trim()) return true;
                                } catch (e) {}
                            }
                        }
                    } catch (e) {}
                    return false;
                }
            } catch (e) {}
            return false;
        }

        async function _resolveAnswer(q, pool) {
            const reusable = findReusableAnswer(q, pool);
            if (reusable != null) {
                _log(`复用匹配答案：${q.question.slice(0, 24)}…`, "ok");
                return reusable;
            }
            if (q.type === "text") {
                const candidates = pool.filter(c => c.type === "text" && c.answer);
                if (candidates.length > 0) {
                    _log(`查询语义相似度（${candidates.length} 条历史）…`, "info");
                    try {
                        const prompt = buildSemanticMatchPrompt(q, candidates);
                        const raw = await LLM_BRIDGE.ask(prompt, 60000, { phase: "verify", label: "校验历史相似（" + candidates.length + " 条）" });
                        const idx = parseSemanticMatch(raw, candidates.length);
                        if (idx >= 0) {
                            _log(`语义相似 → 复用原答案`, "ok");
                            return candidates[idx].answer;
                        }
                    } catch (e) {
                        _log(`语义匹配失败：${e.message}`, "warn");
                    }
                }
            }
            _log(`询问 AI：${q.question.slice(0, 24)}…`, "run");
            const prompt = buildPrompt(q);
            const raw = await LLM_BRIDGE.ask(prompt, 120000, _askProgress);
            const ans = parseAnswer(q, raw);
            if (!ans) throw new Error(`答案解析失败，AI 回复尾部：${String(raw).slice(-200)}`);
            return ans;
        }

        async function _openWithFallback(cache) {
            const currentMethod = MethodStore.getActive();
            if (currentMethod && currentMethod.type === "http") {
                _log("当前使用 HTTP 类型方案，无需打开 AI 窗口，直接请求 API", "info");
                return;
            }
            const savedUrl = String(cache.deepseekConversationUrl || "").trim();
            const isDeepSeek = currentMethod && currentMethod.id === "builtin-deepseek-web";
            if (savedUrl && isDeepSeek) {
                try {
                    LLM_BRIDGE.openConversation(savedUrl);
                    _log(`已打开历史对话链接：${savedUrl.slice(0, 60)}…`, "info");
                    await sleep(2800);
                    const curUrl = (await LLM_BRIDGE.requestUrl(3000)) || "";
                    const isDsDomain = /^https?:\/\/chat\.deepseek\.com/.test(curUrl);
                    const isHome = isDsDomain && !/chat\.deepseek\.com\/a\/chat\/s\/[^/?#]+/.test(curUrl);
                    if (isHome) {
                        _log("历史对话链接已失效，将创建新对话", "warn");
                        cache.deepseekConversationUrl = "";
                        QuizCache.save(cache);
                        LLM_BRIDGE.closePopup();
                        await sleep(300);
                        LLM_BRIDGE.openConversation();
                        _log("已打开 AI（新对话），等待就绪…", "info");
                    } else {
                        _log("已打开 AI（历史对话），等待就绪…", "info");
                    }
                    return;
                } catch (e) {
                    _log(`打开历史对话失败：${e.message}，将创建新对话`, "warn");
                    cache.deepseekConversationUrl = "";
                    QuizCache.save(cache);
                    try { LLM_BRIDGE.closePopup(); } catch (e2) {}
                    await sleep(300);
                    LLM_BRIDGE.openConversation();
                    _log("已打开 AI（新对话），等待就绪…", "info");
                    return;
                }
            }
            LLM_BRIDGE.openConversation();
            _log("已打开 AI（新对话），等待就绪…", "info");
        }

        /* ============================================================
         * 【自动提交】模拟人类鼠标轨迹点击 + 阿里云智能验证 + 提交试卷
         * ============================================================ */
        async function _humanClick(el, doc) {
            if (!el) return false;
            const d = doc || el.ownerDocument || document;
            const win = d.defaultView || window;
            const rect = el.getBoundingClientRect();
            const targetX = rect.left + rect.width / 2;
            const targetY = rect.top + rect.height / 2;

            const startX = targetX - 60 + Math.random() * 120;
            const startY = targetY - 60 + Math.random() * 120;
            const steps = 5;

            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const x = startX + (targetX - startX) * t + (Math.random() * 10 - 5);
                const y = startY + (targetY - startY) * t + (Math.random() * 10 - 5);
                try {
                    const moveEv = new win.MouseEvent("mousemove", {
                        bubbles: true,
                        cancelable: true,
                        view: win,
                        clientX: x,
                        clientY: y
                    });
                    const hit = d.elementFromPoint(x, y) || d.body || d.documentElement;
                    hit.dispatchEvent(moveEv);
                } catch (e) {}
                await sleep(100 + Math.random() * 200);
            }

            try {
                el.dispatchEvent(new win.MouseEvent("mousemove", {
                    bubbles: true,
                    cancelable: true,
                    view: win,
                    clientX: targetX,
                    clientY: targetY
                }));
            } catch (e) {}
            await sleep(100 + Math.random() * 200);

            try {
                el.dispatchEvent(new win.MouseEvent("mousedown", {
                    bubbles: true,
                    cancelable: true,
                    view: win,
                    clientX: targetX,
                    clientY: targetY,
                    button: 0
                }));
            } catch (e) {}
            await sleep(50 + Math.random() * 100);

            try {
                el.dispatchEvent(new win.MouseEvent("mouseup", {
                    bubbles: true,
                    cancelable: true,
                    view: win,
                    clientX: targetX,
                    clientY: targetY,
                    button: 0
                }));
            } catch (e) {}

            try {
                el.dispatchEvent(new win.MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                    view: win,
                    clientX: targetX,
                    clientY: targetY,
                    button: 0
                }));
            } catch (e) {}

            return true;
        }

        function _findButtonByText(doc, text, root) {
            const scope = root || doc;
            const nodes = scope.querySelectorAll("button, .btn, a.btn, div.btn");
            for (const el of nodes) {
                const t = (el.innerText || el.textContent || "").trim();
                if (t.includes(text)) return el;
            }
            return null;
        }

        async function _handleAliyunCaptcha(doc) {
            const t0 = Date.now();
            while (Date.now() - t0 < 20000) {
                const body = doc.querySelector("#aliyunCaptcha-checkbox-body");
                if (body && (body.classList.contains("verified") || /验证通过/.test(body.innerText || ""))) {
                    _log("智能验证已通过", "ok");
                    return true;
                }

                const target =
                    doc.querySelector("#aliyunCaptcha-checkbox-icon") ||
                    doc.querySelector("#aliyunCaptcha-checkbox-body") ||
                    doc.querySelector("#aliyunCaptcha-checkbox-text-box");

                if (target) {
                    _log("点击智能验证复选框…", "info");
                    await _humanClick(target, doc);
                } else {
                    const frames = doc.querySelectorAll("iframe");
                    for (const f of frames) {
                        try {
                            const fdoc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                            if (!fdoc) continue;
                            const b = fdoc.querySelector("#aliyunCaptcha-checkbox-body");
                            if (b) {
                                await _humanClick(b, fdoc);
                                break;
                            }
                        } catch (e) {}
                    }
                }
                await sleep(1000);
            }
            _log("智能验证等待超时", "warn");
            return false;
        }

        async function _waitQuizSubmitResult(doc, timeoutMs) {
            const t0 = Date.now();
            while (Date.now() - t0 < timeoutMs) {
                const text = (doc.body && doc.body.innerText) || "";
                if (/测验通过/.test(text)) return "passed";
                if (/请重新提交测验|重新提交/.test(text)) return "failed";

                const dlg = doc.querySelector("#commitConfirmDialog");
                if (!dlg || dlg.style.display === "none") {
                    return "submitted";
                }
                await sleep(500);
            }
            return "timeout";
        }

        async function _autoSubmitQuiz(doc) {
            if (!doc) doc = getQuizDoc();
            if (!doc) {
                _log("未找到测验文档，无法自动提交", "err");
                return false;
            }

            const submitPaperBtn = _findButtonByText(doc, "提交试卷");
            if (!submitPaperBtn) {
                _log("未找到「提交试卷」按钮，可能已提交或不在测验页", "warn");
                return false;
            }

            _log("点击「提交试卷」…", "run");
            await _humanClick(submitPaperBtn, doc);
            await sleep(1200);

            const confirmDialog = doc.querySelector("#commitConfirmDialog");
            if (!confirmDialog) {
                _log("未找到提交确认弹窗", "warn");
                return false;
            }

            _log("处理智能验证…", "run");
            const captchaOk = await _handleAliyunCaptcha(doc);
            if (!captchaOk) {
                _log("智能验证未通过，停止自动提交", "err");
                return false;
            }

            await sleep(600);

            const finalBtn =
                _findButtonByText(doc, "提交", confirmDialog) ||
                doc.querySelector("#commitConfirmDialog .begin .btn-warning");

            if (!finalBtn) {
                _log("未找到最终提交按钮", "err");
                return false;
            }

            if (finalBtn.disabled || finalBtn.classList.contains("disabled") || finalBtn.getAttribute("disabled") !== null) {
                _log("最终提交按钮仍禁用，等待验证结果…", "warn");
                await sleep(2000);
            }

            _log("点击最终提交…", "run");
            await _humanClick(finalBtn, doc);
            await sleep(2000);

            const result = await _waitQuizSubmitResult(doc, 15000);
            if (result === "passed") {
                _log("✅ 测验已通过", "ok");
                try {
                    const okBtn = doc.querySelector(".layui-layer-dialog .layui-layer-btn0")
                              || doc.querySelector(".layui-layer-btn0");
                    if (okBtn) {
                        okBtn.click();
                        _log("已关闭测验通过提示框", "info");
                    }
                } catch (e) {}
                return true;
            }
            if (result === "failed") {
                _log("⚠️ 测验未通过，可能需要重做", "warn");
                return false;
            }
            if (result === "submitted") {
                _log("✅ 已提交，未检测到未通过提示", "ok");
                return true;
            }

            _log("提交后未检测到明确结果，请手动确认", "warn");
            return false;
        }

        async function start(opts) {
            const isRecursive = !!(opts && opts.isRecursive);
            if (running) return { ok: 0, skip: 0, submitted: false };
            const cache = QuizCache.ensure();

            try {
                await _openWithFallback(cache);
            } catch (e) {
                _log(`无法打开 AI：${e.message}`, "err");
                return;
            }

            const doc = getQuizDoc();
            if (!doc) {
                _log("未发现可处理的题目", "warn");
                return;
            }
            const tpInfo = getTaskpointInfo();
            _log(`任务点：${tpInfo.title || tpInfo.taskId} (${tpInfo.taskId})`, "info");

            const questions = QuizExtractor_extract();
            if (questions.length === 0) {
                _log("未发现可处理的题目（单选/多选/文本）", "warn");
                return;
            }
            _log(`共提取到 ${questions.length} 道题`, "info");

            let effectiveTaskId = tpInfo.taskId;
            if (!cache.taskpoints[effectiveTaskId]) {
                const hashSet = new Set(questions.map(q => q.hash));
                for (const tid in cache.taskpoints) {
                    const etp = cache.taskpoints[tid];
                    if (!etp || !Array.isArray(etp.questions)) continue;
                    let found = false;
                    for (const eq of etp.questions) {
                        if (eq && hashSet.has(eq.hash)) { found = true; break; }
                    }
                    if (found) { effectiveTaskId = tid; break; }
                }
                if (effectiveTaskId !== tpInfo.taskId) {
                    _log(`检测到题目哈希已在缓存任务点 ${effectiveTaskId} 中，合并到该任务点`, "info");
                }
            }
            const tp = cache.taskpoints[effectiveTaskId] || { taskId: tpInfo.taskId, title: tpInfo.title, questions: [] };
            const oldQuestions = Array.isArray(tp.questions) ? tp.questions.slice() : [];
            const newQuestions = [];
            let reuseCount = 0;
            for (const q of questions) {
                const reusable = findReusableAnswer(q, oldQuestions);
                if (reusable != null) reuseCount++;
                newQuestions.push({
                    index: q.index,
                    hash: q.hash,
                    type: q.type,
                    question: q.question,
                    options: q.options,
                    answer: reusable != null ? reusable : null,
                    timestamp: Date.now(),
                });
            }
            tp.taskId = tp.taskId || tpInfo.taskId;
            tp.title = tpInfo.title || tp.title;
            tp.timestamp = Date.now();
            tp.questions = newQuestions;
            cache.taskpoints[effectiveTaskId] = tp;
            QuizCache.save(cache);
            _log(`📥 题目已写入缓存（任务点 ${tpInfo.taskId}，共 ${newQuestions.length} 条，复用答案 ${reuseCount} 条）`, "info");

            const pool = oldQuestions.slice();
            const pushToPool = (entry) => { if (entry && entry.answer) pool.push(entry); };

            running = true;
            stopRequested = false;
            _setProgress(0, questions.length);
            _setStatus("答题中");

            let ok = 0, skip = 0;
            for (let i = 0; i < questions.length; i++) {
                if (stopRequested) { _log("用户请求停止", "warn"); break; }
                const q = questions[i];
                const entry = tp.questions[i];
                _askProgress = { phase: "main", done: i, total: questions.length, task: tpInfo.title || tpInfo.taskId || "" };
                try {
                    focusQuizQuestion(q.boxEl);
                    await sleep(200);
                    let ans = entry && entry.answer;
                    if (!ans) {
                        ans = await _resolveAnswer(q, pool);
                        if (entry) {
                            entry.answer = ans;
                            entry.timestamp = Date.now();
                            pushToPool(entry);
                        }
                        QuizCache.save(cache);
                        _log(`💾 答案已写入缓存：${q.question.slice(0, 20)}… → ${String(ans).slice(0, 24)}`, "info");
                    } else {
                        _log(`直接复用缓存答案：${q.question.slice(0, 24)}…`, "ok");
                    }
                    try {
                        const url = LLM_BRIDGE.getCurrentUrl();
                        if (url && /^https?:\/\/chat\.deepseek\.com\/a\/chat\/s\/[^/?#]+/.test(url)) {
                            if (cache.deepseekConversationUrl !== url) {
                                cache.deepseekConversationUrl = url;
                                QuizCache.save(cache);
                            }
                        }
                    } catch (e) {}
                    if (q.type === "single" || q.type === "multiple") {
                        await fillChoiceAnswer(q, ans);
                    } else {
                        await fillTextAnswer(q, ans);
                    }
                    ok++;
                    _log(`已填入第 ${i + 1} 题（${q.type}）：${String(ans).slice(0, 24)}`, "ok");
                } catch (e) {
                    skip++;
                    _log(`第 ${i + 1} 题处理失败：${e.message}，跳过该任务点`, "warn");
                }
                _setProgress(i + 1, questions.length);
            }

            /* 自动提交前校验：找出答案为 null 或未成功填充的题目，最多重试 3 次 */
            const _MAX_RETRY = 3;
            let unresolvedIdx = [];
            for (let i = 0; i < questions.length; i++) {
                const entry = tp.questions && tp.questions[i];
                const ans = entry && entry.answer;
                if (!ans) { unresolvedIdx.push(i); continue; }
                if (!_verifyAnswerFilled(questions[i], ans)) unresolvedIdx.push(i);
            }
            if (unresolvedIdx.length > 0) {
                _log(`⚠ 检测到 ${unresolvedIdx.length} 道题未成功作答/填充（第 ${unresolvedIdx.map(i => i + 1).join("、")} 题），开始重试…`, "warn");
            } else {
                _log(`✅ 提交前校验通过：${questions.length} 道题均已作答并成功填充`, "ok");
            }
            for (let attempt = 0; attempt < _MAX_RETRY && unresolvedIdx.length > 0; attempt++) {
                _log(`🔄 重试第 ${attempt + 1}/${_MAX_RETRY} 次，剩余 ${unresolvedIdx.length} 道题…`, "warn");
                _setStatus(`重试答题中（第 ${attempt + 1}/${_MAX_RETRY} 次）`);
                const next = [];
                for (const i of unresolvedIdx) {
                    if (stopRequested) { next.push(i); continue; }
                    const q = questions[i];
                    const entry = tp.questions[i];
                    _askProgress = { phase: "retry", retryAttempt: attempt + 1, retryMax: _MAX_RETRY, done: i, total: questions.length, task: tpInfo.title || tpInfo.taskId || "" };
                    try {
                        focusQuizQuestion(q.boxEl);
                        await sleep(200);
                        if (entry) entry.answer = null;
                        const ans = await _resolveAnswer(q, pool);
                        if (entry) { entry.answer = ans; entry.timestamp = Date.now(); pushToPool(entry); }
                        QuizCache.save(cache);
                        if (q.type === "single" || q.type === "multiple") {
                            await fillChoiceAnswer(q, ans);
                        } else {
                            await fillTextAnswer(q, ans);
                        }
                        if (!_verifyAnswerFilled(q, ans)) throw new Error("填充后验证未通过");
                        _log(`✅ 重试成功：第 ${i + 1} 题 → ${String(ans).slice(0, 24)}`, "ok");
                    } catch (e) {
                        _log(`⚠ 重试失败：第 ${i + 1} 题 - ${(e && e.message) || e}`, "warn");
                        next.push(i);
                    }
                    _setProgress(i + 1, questions.length);
                }
                unresolvedIdx = next;
            }
            if (unresolvedIdx.length > 0) {
                const errMsg = `❌ ${unresolvedIdx.length} 道题重试 ${_MAX_RETRY} 次后仍未成功：第 ${unresolvedIdx.map(i => i + 1).join("、")} 题`;
                _log(errMsg, "err");
                if (isRecursive) {
                    _log("⚠ 递归模式：跳过该任务点，继续下一个未限制的未完成任务点", "warn");
                    running = false;
                    return { ok, skip: skip + unresolvedIdx.length, submitted: false, aborted: true, reason: errMsg };
                } else {
                    _log("⛔ 未开启递归：终止本次智能答题（不自动提交）", "err");
                    running = false;
                    throw new Error(errMsg);
                }
            }

            running = false;

            let autoSubmitted = false;
            try {
                if (_getSubmitMode() === "auto") {
                    _log("提交方式为自动提交，开始自动提交…", "run");
                    _setStatus("自动提交中…");
                    autoSubmitted = await _autoSubmitQuiz(doc || getQuizDoc());
                    if (autoSubmitted) _log("✅ 自动提交成功", "ok");
                    else _log("⚠️ 自动提交未成功，请手动提交", "warn");
                }
            } catch (e) {
                _log(`自动提交异常：${e && e.message ? e.message : e}`, "err");
            }

            _log(`智能闯关流程结束：成功 ${ok} 题，跳过 ${skip} 题`, skip > 0 ? "warn" : "ok");
            return { ok, skip, submitted: autoSubmitted };
        }

        function stop() { if (running) stopRequested = true; }
        function isRunning() { return running; }
        return { start, stop, isRunning, onEvent(fn) { onChange = fn; } };
    })();

    /* 【模拟窗口 UI】—— 修改前见顶部用户要求 1 / 3 / 4
     * ============================================================
     * 【模拟窗口】UI 全模块：容器 / 选项卡 / 进度区 / 各种子页面
     * ============================================================ */
    const UI = (function () {
        const MAX_LOG = 500;

        let _scanning = false;
        let _running = false;
        let _scanItemsEmpty = true;
        let _allVideosDone = false;
        let _unrestrictedVideosDone = false;
        let _challengeMode = false;
        let _challengeCfg = "未完成";
        let _autoScanEnabled = true;

        let _quizFillAnswerRunning = false;
        let _quizCompletedOnce = false;
        let _quizCompletedResetTimer = null;
        /* 递归当前是否正在处理测验任务点。
           用于在递归运行中（自动提交开启）时让智能答题按钮先显示"等待递归进程…"，
           到测验任务点后切回正常显示并同步测验完成进度。 */
        let _recursiveAtQuiz = false;

        const _uiState = {
            btnStart: null, btnRescan: null, btnUpdateScan: null,
            scanEditArea: null, optA: null, optB: null
        };
        function _trackChange(key, value) {
            const prev = _uiState[key];
            _uiState[key] = value;
            return prev !== null && prev !== value;
        }

        const panel = document.createElement("div");
        panel.id = "uooc-helper-panel";
        panel.style.cssText = `
            position: fixed; top: 80px; right: 30px;
            width: var(--uooc-panel-width); max-height: 84vh;
            background: rgba(20, 24, 28, 0.96);
            color: #e6e6e6;
            font-family: "Consolas", "Monaco", "Microsoft YaHei", monospace;
            font-size: var(--uooc-fs);
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.45);
            z-index: 99999; overflow: hidden;
            display: flex; flex-direction: column;
            border: 1px solid #2f3a42;
        `;

        const header = document.createElement("div");
        header.style.cssText = `
            display:flex; align-items:center; justify-content:space-between;
            padding: var(--uooc-header-py) 10px;
            background: linear-gradient(90deg, #00796b, #004d40);
            font-weight: bold; font-size: 13px;
            cursor: move;
            flex: 0 0 auto;
        `;
        const titleLeft = document.createElement("div");
        titleLeft.style.cssText = "display:flex;align-items:center;gap:8px;";
        titleLeft.innerHTML = `<span style="letter-spacing:2px;font-size:10px;opacity:.7;">● ● ●</span><span>UOOC 学习助手</span>`;
        const headerBtns = document.createElement("div");
        headerBtns.style.cssText = "display:flex;gap:6px;align-items:center;";
        const btnFold = document.createElement("span");
        btnFold.textContent = "▾";
        btnFold.title = "折叠/展开";
        btnFold.style.cssText = "cursor:pointer;padding:0 6px;font-size:14px;font-weight:normal;";
        headerBtns.append(btnFold);
        header.append(titleLeft, headerBtns);
        panel.appendChild(header);

        const tabBar = document.createElement("div");
        tabBar.style.cssText = "display:flex;border-bottom:1px solid #2a2f36;flex:0 0 auto;gap:2px;padding:2px;background:#141a1f;";
        function mkTab(text, key, flexVal) {
            const t = document.createElement("div");
            t.textContent = text;
            t.dataset.tab = key;
            t.style.cssText = `
                flex:${flexVal}; text-align:center; padding:var(--uooc-tab-py) 0;
                font-size:var(--uooc-fs-sm); font-weight:bold;
                border-radius:5px 5px 0 0;
                transition: all .15s;
            `;
            return t;
        }
        const tabTasks     = mkTab("📋 任务选择", "tasks", "1");
        const tabChallenge = mkTab("🔐 智能闯关", "challenge", "1");
        const tabScan      = mkTab("📄 扫描结果", "scan",  "1");
        const tabSettings  = mkTab("⚙️", "settings", "0 0 auto");
        const tabLog       = mkTab("📜", "log", "0 0 auto");
        tabSettings.style.padding = "var(--uooc-tab-py) 12px";
        tabLog.style.padding = "var(--uooc-tab-py) 12px";
        tabChallenge.style.display = "none";
        tabBar.append(tabTasks, tabChallenge, tabScan, tabSettings, tabLog);
        panel.appendChild(tabBar);

        const progressBox = document.createElement("div");
        progressBox.style.cssText = "padding:8px 12px 6px;flex:0 0 auto;background:#161c22;border-bottom:1px solid #2a2f36;";

        const chapterLine = document.createElement("div");
        chapterLine.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:4px;color:#b0bec5;font-size:var(--uooc-fs-sm);";
        chapterLine.innerHTML = `
            <span style="width:74px;flex:0 0 auto;">章节扫描进度</span>
            <div id="uooc-chapter-bar" style="flex:1;height:7px;background:#263238;border-radius:4px;overflow:hidden;display:flex;"></div>
            <span id="uooc-chapter-text" style="width:80px;text-align:right;flex:0 0 auto;">0 / 0</span>
        `;
        const chapterBarInner = chapterLine.querySelector("#uooc-chapter-bar");

        const chapterErrorLine = document.createElement("div");
        chapterErrorLine.id = "uooc-chapter-err";
        chapterErrorLine.style.cssText = "display:none;margin:-2px 0 4px 82px;color:#ef5350;font-size:10px;line-height:1.4;word-break:break-all;";

        const resourceLine = document.createElement("div");
        resourceLine.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:4px;color:#b0bec5;font-size:var(--uooc-fs-sm);";
        resourceLine.innerHTML = `
            <span style="width:74px;flex:0 0 auto;">任务点进度</span>
            <div style="flex:1;height:7px;background:#263238;border-radius:4px;overflow:hidden;">
                <div id="uooc-resource-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#ffa726,#ffb74d);transition:width .3s;"></div>
            </div>
            <span id="uooc-resource-text" style="width:80px;text-align:right;flex:0 0 auto;">0 / 0</span>
        `;

        const challengeCfgLine = document.createElement("div");
        challengeCfgLine.id = "uooc-challenge-cfg";
        challengeCfgLine.style.cssText = "display:none;margin-top:2px;color:#ffa726;font-size:var(--uooc-fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";

        const challengeWarningLine = document.createElement("div");
        challengeWarningLine.id = "uooc-challenge-warn";
        challengeWarningLine.style.cssText = "display:none;margin-top:2px;color:#ef5350;font-size:var(--uooc-fs-sm);line-height:1.5;word-break:break-all;";

        const statusLine = document.createElement("div");
        statusLine.style.cssText = "margin-top:2px;color:#9e9e9e;font-size:var(--uooc-fs-sm);display:flex;gap:6px;align-items:center;";
        const statusText = document.createElement("span");
        statusText.textContent = "状态：待机";
        statusText.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";

        const autoScanTag = document.createElement("span");
        autoScanTag.textContent = "自动更新中…";
        autoScanTag.style.cssText = "display:none;background:#ffa726;color:#000;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:bold;flex:0 0 auto;";

        statusLine.append(statusText, autoScanTag);
        progressBox.append(chapterLine, chapterErrorLine, resourceLine, challengeCfgLine, challengeWarningLine, statusLine);
        panel.appendChild(progressBox);

        const bodyWrap = document.createElement("div");
        bodyWrap.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";

        /* -------- 任务选择页 -------- */
        const pageTasks = document.createElement("div");
        pageTasks.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";
        const taskInfo = document.createElement("div");
        taskInfo.className = "uooc-scroll";
        taskInfo.style.cssText = "padding:10px 12px 6px;flex:0 0 auto;font-size:var(--uooc-fs-sm);color:#b0bec5;line-height:1.65;max-height:180px;overflow-y:auto;";
        taskInfo.innerHTML = "尚未扫描。点击下方【开始递归】将自动扫描并开始递归。";

        const optionBox = document.createElement("div");
        optionBox.style.cssText = "padding:4px 12px 10px;flex:0 0 auto;";

        function mkOption(key, title, desc) {
            const wrap = document.createElement("div");
            wrap.dataset.opt = key;
            wrap.style.cssText = `
                display:flex; gap:8px; align-items:flex-start;
                padding:var(--uooc-row-py) 10px; margin-bottom:6px; border-radius:6px;
                border:1px solid ${C.interactiveBd};
                background: ${C.interactiveBg};
                color: ${C.interactiveFg};
                cursor:pointer; transition:all .15s;
            `;
            const dot = document.createElement("span");
            dot.style.cssText = `width:var(--uooc-dot);height:var(--uooc-dot);border-radius:50%;border:2px solid ${C.interactiveFg};margin-top:2px;flex:0 0 auto;box-sizing:border-box;transition:all .15s;`;
            const txt = document.createElement("div");
            txt.style.cssText = "flex:1;min-width:0;";
            txt.innerHTML = `<div style="font-size:var(--uooc-fs-sm);font-weight:bold;">${title}</div><div style="font-size:var(--uooc-fs-xs);opacity:.75;margin-top:2px;">${desc}</div>`;
            wrap.append(dot, txt);
            return { wrap, dot, txt };
        }

        const optA = mkOption("A", "从【第一个未完成的视频任务点】开始递归",
            "补齐最后一个已完成视频之前的空缺，再向后连播");
        const optB = mkOption("B", "从【最后一个已完成的视频任务点】开始递归",
            "从断点继续向后连播（若无可用的已完成视频则从目录开头开始）");

        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:8px;margin-top:8px;";
        const btnStart = document.createElement("button");
        btnStart.textContent = "▶ 开始递归";
        btnStart.style.cssText = `flex:1; padding:var(--uooc-btn-py) 0; border:none; border-radius:6px;background:${C.runBg}; color:${C.runFg}; cursor:pointer;font-size:var(--uooc-btn-fs); font-weight:bold; font-family:inherit;transition: background .15s;min-height:var(--uooc-touch-hit);`;
        const btnRescan = document.createElement("button");
        btnRescan.textContent = "重新扫描";
        btnRescan.style.cssText = `padding:var(--uooc-btn-py) 14px; border:1px solid ${C.interactiveBd}; border-radius:6px;background:${C.interactiveBg}; color:${C.interactiveFg}; cursor:pointer;font-size:var(--uooc-btn-fs); font-weight:bold; font-family:inherit;transition:all .15s;min-height:var(--uooc-touch-hit);`;
        btnRow.append(btnStart, btnRescan);
        optionBox.append(optA.wrap, optB.wrap, btnRow);

        const autoScanBox = document.createElement("div");
        autoScanBox.style.cssText = "padding:0 12px 8px;flex:0 0 auto;display:none;";
        const autoScanWrap = document.createElement("div");
        autoScanWrap.style.cssText = `
            display:flex; gap:8px; align-items:center;
            padding:var(--uooc-row-py) 10px; border-radius:6px;
            border:1px solid ${C.interactiveBd};
            background:${C.interactiveBg}; color:${C.interactiveFg};
            cursor:pointer; transition:all .15s;
            font-size:var(--uooc-fs-sm); font-weight:bold;
            min-height:var(--uooc-touch-hit);
        `;
        const autoScanDot = document.createElement("span");
        autoScanDot.style.cssText = `
            width:var(--uooc-dot); height:var(--uooc-dot); border-radius:50%;
            border:2px solid ${C.interactiveFg};
            flex:0 0 auto; box-sizing:border-box;
            transition:all .15s;
        `;
        const autoScanLabel = document.createElement("span");
        autoScanLabel.style.cssText = "flex:1;";
        autoScanLabel.textContent = "自动更新完成状态";
        autoScanWrap.append(autoScanDot, autoScanLabel);
        autoScanBox.appendChild(autoScanWrap);

        const redirectBox = document.createElement("div");
        redirectBox.style.cssText = "padding:0 12px 12px;flex:0 0 auto;display:none;";
        const btnRedirect = document.createElement("button");
        btnRedirect.textContent = "检测到新版页面，重定向至旧版";
        btnRedirect.title = "点击后将跳转到旧版页面";
        btnRedirect.style.cssText = `
            width:100%; padding:var(--uooc-btn-py) 0;
            border:none; border-radius:6px;
            background:${C.redirectBg}; color:${C.redirectFg};
            cursor:pointer;
            font-size:var(--uooc-btn-fs); font-weight:bold;
            font-family:inherit;
            transition: background .15s;
            min-height:var(--uooc-touch-hit);
        `;
        btnRedirect.addEventListener("mouseenter", () => { btnRedirect.style.background = C.redirectBgHover; });
        btnRedirect.addEventListener("mouseleave", () => { btnRedirect.style.background = C.redirectBg; });
        redirectBox.appendChild(btnRedirect);

        pageTasks.append(taskInfo, optionBox, autoScanBox, redirectBox);

        /* -------- 智能闯关页 -------- */
        const pageChallenge = document.createElement("div");
        pageChallenge.style.cssText = "flex:1;display:none;flex-direction:column;min-height:0;padding:10px 12px;gap:8px;";

        const chTitle = document.createElement("div");
        chTitle.style.cssText = "font-size:var(--uooc-fs-sm);font-weight:bold;color:#4dd0e1;";
        chTitle.textContent = "🔐 智能闯关模式";

        const chStatusLine = document.createElement("div");
        chStatusLine.style.cssText = "color:#9e9e9e;font-size:var(--uooc-fs-sm);display:flex;gap:6px;align-items:center;min-height:16px;";
        const chStatusText = document.createElement("span");
        chStatusText.textContent = "状态：待机";
        chStatusText.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        chStatusLine.appendChild(chStatusText);

        const chQuizBtnWrap = document.createElement("div");
        chQuizBtnWrap.style.cssText = `
            position: relative;
            display:flex; align-items:center; justify-content:center;
            padding:var(--uooc-btn-py) 14px; border-radius:6px;
            border:1px solid ${C.interactiveBd};
            background:${C.interactiveBg};
            color:${C.interactiveFg};
            cursor:pointer; transition:background .45s ease, color .3s ease, border-color .3s ease;
            font-size:var(--uooc-btn-fs); font-weight:bold;
            overflow:hidden;
            min-height:var(--uooc-touch-hit);
        `;
        const chQuizBtnFill = document.createElement("div");
        chQuizBtnFill.style.cssText = `
            position:absolute; left:0; top:0; bottom:0; width:0%;
            background:${C.quizProgressDone};
            transition: width .3s, background .15s;
            pointer-events:none;
        `;
        const chQuizBtnLabel = document.createElement("span");
        chQuizBtnLabel.style.cssText = "position:relative; z-index:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
        chQuizBtnLabel.textContent = "智能答题（当前选中任务点）";
        chQuizBtnWrap.append(chQuizBtnFill, chQuizBtnLabel);

        let _anyMutexRunningCb = null;

        function paintQuizButton() {
            const mutexBusy = _anyMutexRunningCb && _anyMutexRunningCb();
            /* 递归运行中且自动提交开启、尚未运行到测验任务点时，
               按钮提示"等待递归进程运行到测验任务点"。
               - _isAutoSubmit() 每次都读取最新设置，用户中途改设置会立即生效。
               - _recursiveAtQuiz 由主脚本在进入 / 离开测验任务点时设置。 */
            const autoWaiting = _running && _isAutoSubmit() && !_recursiveAtQuiz;

            if (_quizFillAnswerRunning) {
                chQuizBtnWrap.style.background = C.quizProgressEmpty;
                chQuizBtnWrap.style.color = "#ffffff";
                chQuizBtnWrap.style.borderColor = C.interactiveBd;
                chQuizBtnWrap.style.cursor = "not-allowed";
                chQuizBtnWrap.style.opacity = "1";
                chQuizBtnFill.style.background = C.quizProgressDone;
                chQuizBtnLabel.textContent = "正在答题中...";
            } else if (_quizCompletedOnce) {
                chQuizBtnWrap.style.background = C.disabledBg;
                chQuizBtnWrap.style.color = C.disabledFg;
                chQuizBtnWrap.style.borderColor = C.disabledBd;
                chQuizBtnWrap.style.cursor = "not-allowed";
                chQuizBtnWrap.style.opacity = "0.7";
                chQuizBtnFill.style.width = "0%";
                chQuizBtnFill.style.background = C.quizProgressDone;
                chQuizBtnLabel.textContent = "已完成";
            } else if (autoWaiting) {
                chQuizBtnWrap.style.background = C.disabledBg;
                chQuizBtnWrap.style.color = C.disabledFg;
                chQuizBtnWrap.style.borderColor = C.disabledBd;
                chQuizBtnWrap.style.cursor = "not-allowed";
                chQuizBtnWrap.style.opacity = "0.7";
                chQuizBtnFill.style.width = "0%";
                chQuizBtnFill.style.background = C.quizProgressDone;
                chQuizBtnLabel.textContent = "智能答题（等待递归进程运行到测验任务点）";
            } else if (mutexBusy) {
                chQuizBtnWrap.style.background = C.disabledBg;
                chQuizBtnWrap.style.color = C.disabledFg;
                chQuizBtnWrap.style.borderColor = C.disabledBd;
                chQuizBtnWrap.style.cursor = "not-allowed";
                chQuizBtnWrap.style.opacity = "0.7";
                chQuizBtnFill.style.width = "0%";
                chQuizBtnFill.style.background = C.quizProgressDone;
                chQuizBtnLabel.textContent = "智能答题（当前选中任务点）";
            } else {
                chQuizBtnWrap.style.background = C.interactiveBg;
                chQuizBtnWrap.style.color = C.interactiveFg;
                chQuizBtnWrap.style.borderColor = C.interactiveBd;
                chQuizBtnWrap.style.cursor = "pointer";
                chQuizBtnWrap.style.opacity = "1";
                chQuizBtnFill.style.width = "0%";
                chQuizBtnFill.style.background = C.quizProgressDone;
                chQuizBtnLabel.textContent = "智能答题（当前选中任务点）";
            }
        }

        function _isAutoSubmit() {
            try { return _getSubmitMode() === "auto"; } catch (e) { return false; }
        }

        function updateSubmitModeUI() {
            const auto = _isAutoSubmit();

            const aTitle = optA.txt.querySelector("div");
            const aDesc = optA.txt.querySelectorAll("div")[1];
            if (aTitle) aTitle.textContent = auto ? "从【第一个未完成的任务点】开始递归" : "从【第一个未完成的视频任务点】开始递归";
            if (aDesc) aDesc.textContent = auto ? "补齐最后一个已完成任务点之前的空缺，再向后连播" : "补齐最后一个已完成视频之前的空缺，再向后连播";

            const bTitle = optB.txt.querySelector("div");
            const bDesc = optB.txt.querySelectorAll("div")[1];
            if (bTitle) bTitle.textContent = auto ? "从【最后一个已完成的任务点】开始递归" : "从【最后一个已完成的视频任务点】开始递归";
            if (bDesc) bDesc.textContent = auto ? "从断点继续向后连播（若无可用的已完成任务点则从目录开头开始）" : "从断点继续向后连播（若无可用的已完成视频则从目录开头开始）";
        }

        function setQuizFillProgress(done, total) {
            const pct = total ? Math.round(done / total * 100) : 0;
            /* 递归进入测验时同样更新填充宽度与文案 */
            if (_quizFillAnswerRunning || _recursiveAtQuiz) chQuizBtnFill.style.width = pct + "%";
            chStatusText.textContent = `状态：正在答题中 (${done}/${total})`;
            statusText.textContent = `状态：正在答题中 (${done}/${total})`;
        }
        /* 智能答题状态变化时，同步刷新其他按钮的互斥禁用 */
        function setQuizButtonRunning(v) {
            _quizFillAnswerRunning = !!v;
            if (!v && !_quizCompletedOnce) chQuizBtnFill.style.width = "0%";
            paintQuizButton();
            try { refreshButtonStates(); } catch (e) {}
        }
        function setQuizButtonCompleted() {
            _quizCompletedOnce = true;
            chQuizBtnFill.style.width = "0%";
            paintQuizButton();
            try { refreshButtonStates(); } catch (e) {}
            if (_quizCompletedResetTimer) clearTimeout(_quizCompletedResetTimer);
            _quizCompletedResetTimer = setTimeout(() => {
                _quizCompletedResetTimer = null;
                resetQuizButton();
            }, 3000);
        }
        function resetQuizButton() {
            if (_quizCompletedResetTimer) { clearTimeout(_quizCompletedResetTimer); _quizCompletedResetTimer = null; }
            _quizCompletedOnce = false;
            chQuizBtnFill.style.width = "0%";
            chStatusText.textContent = "状态：待机";
            paintQuizButton();
            try { refreshButtonStates(); } catch (e) {}
        }

        let cbQuizToggleStart = null, cbQuizToggleStop = null;
        let cbQuizRecord = null;
        chQuizBtnWrap.onclick = () => {
            if (_quizFillAnswerRunning) { if (cbQuizToggleStop) cbQuizToggleStop(); return; }
            if (_quizCompletedOnce) return;
            if (_anyMutexRunningCb && _anyMutexRunningCb()) return;
            if (cbQuizToggleStart) cbQuizToggleStart();
        };

        const chBtnRow2 = document.createElement("div");
        chBtnRow2.style.cssText = "display:flex;gap:6px;margin-top:4px;";
        const btnQuizView = document.createElement("button");
        btnQuizView.textContent = "题目缓存";
        btnQuizView.style.cssText = `flex:1;padding:var(--uooc-btn-py) 0;border:1px solid ${C.interactiveBd};border-radius:6px;background:${C.interactiveBg};color:${C.interactiveFg};cursor:pointer;font-size:var(--uooc-btn-fs);font-weight:bold;font-family:inherit;transition:all .15s;min-height:var(--uooc-touch-hit);`;
        const btnQuizRecord = document.createElement("button");
        btnQuizRecord.textContent = "记录已完成测验";
        btnQuizRecord.style.cssText = `flex:1;padding:var(--uooc-btn-py) 0;border:1px solid ${C.interactiveBd};border-radius:6px;background:${C.interactiveBg};color:${C.interactiveFg};cursor:pointer;font-size:var(--uooc-btn-fs);font-weight:bold;font-family:inherit;transition:all .15s;min-height:var(--uooc-touch-hit);`;
        chBtnRow2.append(btnQuizView, btnQuizRecord);

        pageChallenge.append(chTitle, chStatusLine, chQuizBtnWrap, chBtnRow2);

        /* -------- 设置页 -------- */
        const pageSettings = document.createElement("div");
        pageSettings.className = "uooc-scroll";
        pageSettings.style.cssText = "flex:1;display:none;flex-direction:column;min-height:0;max-height:60vh;padding:8px 10px;gap:4px;overflow-y:auto;";

        const setTitle = document.createElement("div");
        setTitle.style.cssText = "font-size:var(--uooc-fs-sm);font-weight:bold;color:#4dd0e1;margin-bottom:0;";
        setTitle.textContent = "⚙️ 设置";

        function mkSettingBlock(labelText, descText, inputEl, minVal, maxVal) {
            const wrap = document.createElement("div");
            wrap.className = "uooc-setting-row";
            wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";
            const label = document.createElement("span");
            label.style.cssText = "font-size:var(--uooc-fs-sm);color:#b0bec5;font-weight:bold;";
            label.textContent = labelText;
            inputEl.placeholder = `范围：${minVal} ~ ${maxVal}`;
            inputEl.style.cssText = "width:100%;box-sizing:border-box;padding:6px 8px;background:#101418;color:#e6e6e6;border:1px solid #2a2f36;border-radius:4px;font-family:inherit;font-size:var(--uooc-fs-sm);min-height:var(--uooc-touch-hit);";
            inputEl.addEventListener("blur", () => {
                const raw = inputEl.value.trim();
                if (!raw) return;
                let v = Number(raw);
                if (!Number.isFinite(v)) { inputEl.value = ""; return; }
                if (v < minVal) v = minVal;
                if (v > maxVal) v = maxVal;
                inputEl.value = String(v);
            });
            inputEl.addEventListener("wheel", (e) => {
                e.preventDefault();
                const step = Number(inputEl.step) || 1;
                const dir = e.deltaY < 0 ? 1 : -1;
                let v = Number(inputEl.value);
                if (!Number.isFinite(v)) v = minVal;
                v = v + dir * step;
                if (v < minVal) v = minVal;
                if (v > maxVal) v = maxVal;
                const decimals = (String(step).split(".")[1] || "").length;
                if (decimals > 0) v = Number(v.toFixed(decimals));
                inputEl.value = String(v);
            }, { passive: false });
            const desc = document.createElement("span");
            desc.style.cssText = "font-size:var(--uooc-fs-xs);color:#78909c;line-height:1.5;";
            desc.textContent = descText;
            wrap.append(label, inputEl, desc);
            return wrap;
        }

        function mkSettingSelect(labelText, descText, selectEl) {
            const wrap = document.createElement("div");
            wrap.className = "uooc-setting-row";
            wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";
            const label = document.createElement("span");
            label.style.cssText = "font-size:var(--uooc-fs-sm);color:#b0bec5;font-weight:bold;";
            label.textContent = labelText;
            selectEl.style.cssText = "width:100%;box-sizing:border-box;padding:6px 8px;background:#101418;color:#e6e6e6;border:1px solid #2a2f36;border-radius:4px;font-family:inherit;font-size:var(--uooc-fs-sm);cursor:pointer;min-height:var(--uooc-touch-hit);";
            const desc = document.createElement("span");
            desc.style.cssText = "font-size:var(--uooc-fs-xs);color:#78909c;line-height:1.5;";
            desc.textContent = descText;
            wrap.append(label, selectEl, desc);
            return wrap;
        }

        function mkSettingToggle(labelText, descText, initialOn, onToggle) {
            const wrap = document.createElement("div");
            wrap.className = "uooc-setting-row";
            wrap.style.cssText = "display:flex;flex-direction:column;";
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:10px;";
            const textWrap = document.createElement("div");
            textWrap.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";
            const label = document.createElement("div");
            label.style.cssText = "font-size:var(--uooc-fs-sm);color:#b0bec5;font-weight:bold;text-align:left;";
            label.textContent = labelText;
            textWrap.appendChild(label);
            const toggle = document.createElement("label");
            toggle.className = "uooc-toggle-label";
            toggle.style.cssText = `
                position:relative;display:inline-block;
                width:var(--uooc-toggle-w);height:var(--uooc-toggle-h);flex:0 0 auto;
                cursor:pointer;
            `;
            const input = document.createElement("input");
            input.type = "checkbox";
            input.checked = !!initialOn;
            input.style.cssText = `
                position:absolute;inset:0;
                width:100%;height:100%;margin:0;
                opacity:0;cursor:pointer;z-index:2;
            `;
            const span = document.createElement("span");
            span.style.cssText = `
                position:absolute;inset:0;
                border-radius:var(--uooc-toggle-radius);
                transition:background .2s;
                z-index:1;
            `;
            const knob = document.createElement("span");
            knob.style.cssText = `
                position:absolute;top:3px;left:3px;
                width:var(--uooc-toggle-knob);height:var(--uooc-toggle-knob);border-radius:50%;
                background:#fff;transition:left .2s;
                box-shadow:0 1px 3px rgba(0,0,0,.4);
                z-index:1;
            `;
            span.appendChild(knob);
            function paint() {
                if (input.checked) {
                    span.style.background = C.toggleOn;
                    knob.style.left = "var(--uooc-toggle-knob-on)";
                } else {
                    span.style.background = C.toggleOff;
                    knob.style.left = "3px";
                }
            }
            paint();
            input.addEventListener("change", () => { paint(); if (onToggle) onToggle(!!input.checked); });
            toggle.append(input, span);
            row.append(textWrap, toggle);
            const desc = document.createElement("span");
            desc.style.cssText = "font-size:var(--uooc-fs-xs);color:#78909c;line-height:1.5;text-align:left;";
            desc.textContent = descText;
            textWrap.appendChild(desc);
            wrap.append(row);
            return { wrap, input, setChecked: (v) => { input.checked = !!v; paint(); } };
        }

        function mkSettingCard(titleText, children) {
            const card = document.createElement("div");
            card.className = "uooc-card";
            const t = document.createElement("div");
            t.className = "uooc-card-title";
            t.textContent = titleText;
            card.appendChild(t);
            for (const c of children) if (c) card.appendChild(c);
            return card;
        }

        const inputAutoScanInterval = document.createElement("input");
        inputAutoScanInterval.type = "number";
        inputAutoScanInterval.value = String(getSettings().autoScanInterval);

        const inputVideoPlaybackRate = document.createElement("input");
        inputVideoPlaybackRate.type = "number";
        inputVideoPlaybackRate.step = "0.5";
        inputVideoPlaybackRate.value = String(getSettings().videoPlaybackRate);

        const selectForceAspect = document.createElement("select");
        selectForceAspect.innerHTML = `
            <option value="none">无（默认）</option>
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
        `;
        selectForceAspect.value = getSettings().forceAspect;

        const toggleMobile = mkSettingToggle(
            "移动版视图",
            "开启后本脚本窗口支持触屏拖动，按钮与字号放大以适合触屏操作；关闭则完全使用原方案。",
            getSettings().mobileView,
            (on) => { setSettings({ mobileView: on }); applyMobileView(on); }
        );

        const toggleChallengeAlways = mkSettingToggle(
            "智能闯关常态化显示",
            "开启后，即使当前课程未检测到闯关限制，也显示「智能闯关」选项卡并可使用智能答题功能。",
            getSettings().challengeAlwaysVisible,
            (on) => {
                setSettings({ challengeAlwaysVisible: on });
                refreshButtonStates();
            }
        );

        const chSubmitSelect = document.createElement("select");
        chSubmitSelect.innerHTML = `
            <option value="manual">手动提交（递归仅处理视频，测验需自行提交）</option>
            <option value="auto">自动提交（递归会一并处理测验并自动提交）</option>
        `;
        chSubmitSelect.addEventListener("change", () => {
            const mode = chSubmitSelect.value === "auto" ? "auto" : "manual";
            /* 以全局设置为权威来源 */
            setSettings({ submitMode: mode });
            /* 同时写入 QuizCache，仅用于兼容旧版本与缓存展示 */
            try {
                const d = QuizCache.ensure();
                d.submitMode = mode;
                QuizCache.save(d);
            } catch (e) {}
            _log(`提交方式已切换为：${mode === "auto" ? "自动提交（自动完成智能验证并提交）" : "手动提交"}`, "info");
            try { UI.refreshButtonStates(); UI.updateSubmitModeUI(); } catch (e) {}
        });

        const aiMethodSelect = document.createElement("select");
        (function () {
            const list = MethodStore.list();
            const activeId = MethodStore.getActiveId();
            for (const m of list) {
                const opt = document.createElement("option");
                opt.value = m.id;
                opt.textContent = m.name + (m.builtin ? "（内置）" : "");
                aiMethodSelect.appendChild(opt);
            }
            aiMethodSelect.value = activeId || (list[0] ? list[0].id : "");
        })();
        aiMethodSelect.addEventListener("change", () => {
            if (MethodStore.setActiveId(aiMethodSelect.value)) {
                _log(`AI 方案已切换为：${aiMethodSelect.options[aiMethodSelect.selectedIndex].textContent}`, "info");
            }
        });

        function mkAiMethodSelectRow() {
            const wrap = document.createElement("div");
            wrap.className = "uooc-setting-row";
            wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";
            const label = document.createElement("span");
            label.style.cssText = "font-size:var(--uooc-fs-sm);color:#b0bec5;font-weight:bold;";
            label.textContent = "AI 方案";
            const row = document.createElement("div");
            row.className = "select-refresh-row";
            aiMethodSelect.style.cssText = "flex:1;min-width:0;box-sizing:border-box;padding:6px 8px;background:#101418;color:#e6e6e6;border:1px solid #2a2f36;border-radius:4px;font-family:inherit;font-size:var(--uooc-fs-sm);cursor:pointer;min-height:var(--uooc-touch-hit);";
            const refreshBtn = document.createElement("button");
            refreshBtn.type = "button";
            refreshBtn.className = "select-refresh-btn";
            refreshBtn.title = "刷新 AI 方案列表";
            refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>';
            function refreshOptions() {
                const prev = aiMethodSelect.value;
                while (aiMethodSelect.firstChild) aiMethodSelect.removeChild(aiMethodSelect.firstChild);
                const list = MethodStore.list();
                const activeId = MethodStore.getActiveId();
                for (const m of list) {
                    const opt = document.createElement("option");
                    opt.value = m.id;
                    opt.textContent = m.name + (m.builtin ? "（内置）" : "");
                    aiMethodSelect.appendChild(opt);
                }
                aiMethodSelect.value = activeId || (list[0] ? list[0].id : "") || prev;
            }
            refreshBtn.addEventListener("click", () => {
                refreshBtn.classList.remove("spinning");
                void refreshBtn.offsetWidth;
                refreshBtn.classList.add("spinning");
                setTimeout(() => { refreshBtn.classList.remove("spinning"); }, 700);
                refreshOptions();
                _log("AI 方案列表已刷新", "info");
            });
            row.append(aiMethodSelect, refreshBtn);
            const desc = document.createElement("span");
            desc.style.cssText = "font-size:var(--uooc-fs-xs);color:#78909c;line-height:1.5;";
            desc.textContent = "选择用于智能答题的 AI 服务。内置方案不可修改；自定义方案可在「管理 AI 方案」中编辑。";
            wrap.append(label, row, desc);
            return wrap;
        }

        function mkExtLinkButton(text, onClick) {
            const row = document.createElement("div");
            row.className = "uooc-setting-row";
            row.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;font-size:var(--uooc-fs-sm);color:#b0bec5;font-weight:bold;text-align:left;";
            const label = document.createElement("span");
            label.textContent = text;
            label.style.cssText = "flex:1;text-align:left;";
            const icon = document.createElement("span");
            icon.className = "uooc-extlink-icon";
            icon.style.cssText = "flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;";
            icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
            row.append(label, icon);
            row.addEventListener("click", onClick);
            return row;
        }

        const btnManageMethods = mkExtLinkButton("管理 AI 方案", () => {
            try {
                const html = _buildMethodManagerHtml();
                const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.target = "_blank";
                a.rel = "opener";
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { try { document.body.removeChild(a); } catch (e) {} URL.revokeObjectURL(url); }, 60000);
                _log("AI 方案管理器已在新标签页打开", "ok");
            } catch (e) {
                _log("打开方案管理器失败：" + (e && e.message ? e.message : e), "err");
            }
        });

        const copyHtmlRow = (function () {
            const wrap = document.createElement("div");
            wrap.className = "uooc-setting-row";
            wrap.style.cssText = "display:flex;align-items:center;gap:8px;";
            const textWrap = document.createElement("div");
            textWrap.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";
            const label = document.createElement("div");
            label.style.cssText = "font-size:var(--uooc-fs-sm);color:#b0bec5;font-weight:bold;text-align:left;";
            label.textContent = "复制当前页 outerHTML";
            const desc = document.createElement("span");
            desc.style.cssText = "font-size:var(--uooc-fs-xs);color:#78909c;line-height:1.5;text-align:left;";
            desc.textContent = "收集整个页面（含 iframe 内文档）的 outerHTML 到剪贴板，用于发给 AI 分析元素布局改动。";
            textWrap.append(label, desc);
            const btn = document.createElement("button");
            const COPY_BG_DEFAULT = "#6b8e6f";
            const COPY_BG_OK = C.runBg;
            const COPY_BG_ERR = C.redirectBg;
            btn.textContent = "复制";
            btn.style.cssText = "flex:0 0 auto;padding:6px 14px;border:none;border-radius:6px;background:" + COPY_BG_DEFAULT + ";color:#ffffff;cursor:pointer;font-size:var(--uooc-btn-fs);font-weight:bold;font-family:inherit;min-height:var(--uooc-touch-hit);transition:background .3s ease;";
            let _copyBusy = false;
            btn.addEventListener("click", async () => {
                if (_copyBusy) return;
                _copyBusy = true;
                btn.textContent = "复制中…";
                try {
                    const html = await collectOuterHTMLWithIframes();
                    await copyTextToClipboard(html);
                    btn.textContent = "已复制";
                    btn.style.background = COPY_BG_OK;
                    _log("页面 outerHTML 已复制到剪贴板（" + html.length + " 字符）", "ok");
                } catch (e) {
                    btn.textContent = "失败";
                    btn.style.background = COPY_BG_ERR;
                    _log("复制失败：" + (e && e.message ? e.message : e), "err");
                }
                setTimeout(() => {
                    btn.textContent = "复制";
                    btn.style.background = COPY_BG_DEFAULT;
                    _copyBusy = false;
                }, 3000);
            });
            wrap.append(textWrap, btn);
            return wrap;
        })();

        const btnOpenPatcher = mkExtLinkButton("打开代码改动应用器", () => {
            try {
                const html = _buildPatcherHtml();
                const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.target = "_blank";
                a.rel = "opener";
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { try { document.body.removeChild(a); } catch (e) {} URL.revokeObjectURL(url); }, 60000);
                _log("代码改动应用器已在新标签页打开", "ok");
            } catch (e) {
                _log("打开应用器失败：" + (e && e.message ? e.message : e), "err");
            }
        });

        const setBtnRow = document.createElement("div");
        setBtnRow.style.cssText = "display:flex;gap:8px;margin-top:6px;position:sticky;bottom:0;z-index:6;background:linear-gradient(180deg, rgba(20,24,28,0.85) 0%, rgba(20,24,28,0.98) 40%, rgba(20,24,28,1) 100%);padding:8px 0 4px;border-top:1px solid #2a2f36;";
        const btnSettingsSave = document.createElement("button");
        btnSettingsSave.textContent = "保存";
        btnSettingsSave.style.cssText = `flex:1;padding:var(--uooc-btn-py) 0;border:none;border-radius:6px;background:${C.runBg};color:${C.runFg};cursor:pointer;font-size:var(--uooc-btn-fs);font-weight:bold;font-family:inherit;transition:background .15s;min-height:var(--uooc-touch-hit);`;
        const btnSettingsReset = document.createElement("button");
        btnSettingsReset.textContent = "恢复默认";
        btnSettingsReset.style.cssText = `padding:var(--uooc-btn-py) 14px;border:1px solid ${C.interactiveBd};border-radius:6px;background:${C.interactiveBg};color:${C.interactiveFg};cursor:pointer;font-size:var(--uooc-btn-fs);font-weight:bold;font-family:inherit;transition:all .15s;min-height:var(--uooc-touch-hit);`;
        setBtnRow.append(btnSettingsSave, btnSettingsReset);

        pageSettings.append(
            setTitle,
            mkSettingCard("🌐 全局设置", [
                mkSettingBlock("播放速度（倍数）", "视频播放速率倍数。若倍率过高，可能导致页面实际停留时间达不到平台要求，任务点无法被记为完成。", inputVideoPlaybackRate, 0.5, 16),
                mkSettingSelect("强制页面尺寸", "强制将整个页面渲染在一个固定尺寸的范围内，范围以外的屏幕空间为黑色。", selectForceAspect),
                toggleMobile.wrap,
                copyHtmlRow,
                btnOpenPatcher,
            ]),
            mkSettingCard("📋 任务选择设置", [
                mkSettingBlock("自动更新间隔（秒）", "自动扫描闯关前未完成任务点的频率。", inputAutoScanInterval, 3, 600),
            ]),
            mkSettingCard("🔐 智能闯关设置", [
                mkAiMethodSelectRow(),
                btnManageMethods,
                toggleChallengeAlways.wrap,
                mkSettingSelect("提交方式", "选择测验提交方式。手动提交时，递归只处理视频任务点，测验需要自行提交；自动提交时，递归操作将包括测验任务点（自动填写并提交），同时模拟人工完成智能验证。", chSubmitSelect),
            ]),
            setBtnRow
        );

        /* 保存按钮的「已保存」反馈：变亮 + 显示"已保存" + 禁用 3 秒 */
        const _SAVE_BTN_DEFAULT_BG = C.runBg;
        const _SAVE_BTN_OK_BG = "#4caf50";
        let _saveBtnFeedbackTimer = null;
        function _flashSaveButton(btn) {
            if (!btn) return;
            if (_saveBtnFeedbackTimer) { clearTimeout(_saveBtnFeedbackTimer); _saveBtnFeedbackTimer = null; }
            btn.textContent = "已保存";
            btn.style.background = _SAVE_BTN_OK_BG;
            btn.style.filter = "brightness(1.15)";
            btn.disabled = true;
            btn.style.cursor = "not-allowed";
            btn.style.opacity = "0.95";
            _saveBtnFeedbackTimer = setTimeout(() => {
                _saveBtnFeedbackTimer = null;
                btn.textContent = "保存";
                btn.style.background = _SAVE_BTN_DEFAULT_BG;
                btn.style.filter = "";
                btn.disabled = false;
                btn.style.cursor = "pointer";
                btn.style.opacity = "1";
            }, 3000);
        }

        btnSettingsSave.onclick = () => {
            const d = _defaultSettings();
            let a = Number(inputAutoScanInterval.value);
            if (!Number.isFinite(a) || a <= 0) a = d.autoScanInterval;
            a = Math.max(3, Math.min(600, a));
            let r = Number(inputVideoPlaybackRate.value);
            if (!Number.isFinite(r) || r <= 0) r = d.videoPlaybackRate;
            r = Math.max(0.5, Math.min(16, r));
            inputAutoScanInterval.value = String(a);
            inputVideoPlaybackRate.value = String(r);
            const forceAspect = ["none", "16:9", "4:3"].includes(selectForceAspect.value) ? selectForceAspect.value : "none";
            const submitMode = chSubmitSelect.value === "auto" ? "auto" : "manual";
            setSettings({ autoScanInterval: a, videoPlaybackRate: r, forceAspect: forceAspect, submitMode: submitMode });
            applyForceAspect(forceAspect);
            /* QuizCache 仅作兼容写入，不影响权威来源 */
            try {
                const qc = QuizCache.ensure();
                qc.submitMode = submitMode;
                QuizCache.save(qc);
            } catch (e) {}
            _log("设置已保存", "ok");
            if (autoScanTimer) { stopAutoScanLoop(); startAutoScanLoop(); }
            _flashSaveButton(btnSettingsSave);
        };
        btnSettingsReset.onclick = () => {
            const d = _defaultSettings();
            setSettings(d);
            inputAutoScanInterval.value = String(d.autoScanInterval);
            inputVideoPlaybackRate.value = String(d.videoPlaybackRate);
            selectForceAspect.value = d.forceAspect;
            toggleMobile.setChecked(d.mobileView);
            toggleChallengeAlways.setChecked(d.challengeAlwaysVisible);
            chSubmitSelect.value = "manual";
            applyMobileView(d.mobileView);
            applyForceAspect(d.forceAspect);
            const qc = QuizCache.ensure();
            qc.submitMode = "manual";
            QuizCache.save(qc);
            _log("已恢复默认设置", "ok");
            if (autoScanTimer) { stopAutoScanLoop(); startAutoScanLoop(); }
        };

        /* -------- 题目缓存子页面 -------- */
        const subPage = document.createElement("div");
        subPage.style.cssText = "position:absolute;inset:0;background:rgba(15,18,22,0.98);z-index:50;display:none;flex-direction:column;padding:10px 12px;gap:8px;";
        const subHeader = document.createElement("div");
        subHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
        subHeader.innerHTML = `<div style="font-weight:bold;color:#4dd0e1;font-size:var(--uooc-fs-sm);">题目缓存</div>`;

        const subHeaderRight = document.createElement("div");
        subHeaderRight.style.cssText = "display:flex;gap:8px;align-items:center;";
        const btnCacheClearInSub = document.createElement("button");
        btnCacheClearInSub.textContent = "🗑 缓存";
        btnCacheClearInSub.title = "清除当前课程的闯关缓存";
        btnCacheClearInSub.style.cssText = `
            background:${C.clearBtnBg}; color:#fff; border:none;
            border-radius:4px; padding:4px 12px; cursor:pointer;
            font-size:var(--uooc-fs-xs); font-family:inherit;
            transition: opacity .2s, background .15s;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
            opacity: 0.12;
        `;
        const btnSubClose = document.createElement("button");
        btnSubClose.textContent = "关闭";
        btnSubClose.style.cssText = `padding:5px 14px;border:none;border-radius:4px;background:${C.interactiveBg};color:${C.interactiveFg};cursor:pointer;font-size:var(--uooc-fs-sm);font-weight:bold;font-family:inherit;min-height:var(--uooc-touch-hit);`;
        subHeaderRight.append(btnCacheClearInSub, btnSubClose);
        subHeader.appendChild(subHeaderRight);

        const subBody = document.createElement("div");
        subBody.className = "uooc-scroll code-render uooc-selectable";
        subBody.style.cssText = "flex:1;overflow:auto;padding:0;";
        subPage.append(subHeader, subBody);

        let _quizCacheCleared = false;
        let cbQuizClear = null;
        btnCacheClearInSub.addEventListener("mouseenter", () => {
            btnCacheClearInSub.style.opacity = "1";
            if (!_quizCacheCleared) btnCacheClearInSub.style.background = C.clearBtnBgHover;
        });
        btnCacheClearInSub.addEventListener("mouseleave", () => {
            btnCacheClearInSub.style.opacity = "0.12";
            if (!_quizCacheCleared) btnCacheClearInSub.style.background = C.clearBtnBg;
        });
        btnCacheClearInSub.onclick = () => {
            if (_quizCacheCleared) return;
            if (cbQuizClear) cbQuizClear();
            _quizCacheCleared = true;
            _applyClearBtnState(btnCacheClearInSub, true, "🗑 缓存", "🗑 缓存已清除");
            const d = QuizCache.load();
            _renderCodeTo(subBody, formatCacheForDisplay(d));
        };

        /* -------- 智能闯关日志（内嵌，可折叠） -------- */
        const chLogWrap = document.createElement("div");
        chLogWrap.style.cssText = "margin-top:4px;border:1px solid #2a2f36;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;min-height:0;flex:1;";

        const chLogHead = document.createElement("div");
        chLogHead.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#1c2128;cursor:pointer;user-select:none;flex:0 0 auto;";

        const chLogHeadLeft = document.createElement("div");
        chLogHeadLeft.style.cssText = "font-size:var(--uooc-fs-sm);font-weight:bold;color:#4dd0e1;";
        chLogHeadLeft.textContent = "📜 智能闯关日志";

        const chLogHeadRight = document.createElement("div");
        chLogHeadRight.style.cssText = "display:flex;gap:8px;align-items:center;";

        const btnLogSubClear = document.createElement("button");
        btnLogSubClear.textContent = "🗑 日志";
        btnLogSubClear.title = "清空日志";
        btnLogSubClear.style.cssText = `
            background:${C.clearBtnBg}; color:#fff; border:none;
            border-radius:4px; padding:3px 10px; cursor:pointer;
            font-size:var(--uooc-fs-xs); font-family:inherit;
            transition: opacity .2s, background .15s;
            opacity: 0.5;
        `;

        const chLogToggle = document.createElement("span");
        chLogToggle.textContent = "▸";
        chLogToggle.style.cssText = "font-size:12px;color:#90a4ae;min-width:14px;text-align:center;";

        chLogHeadRight.append(btnLogSubClear, chLogToggle);
        chLogHead.append(chLogHeadLeft, chLogHeadRight);

        const chLog = document.createElement("div");
        chLog.className = "uooc-scroll uooc-selectable";
        chLog.style.cssText = "display:none;min-height:160px;max-height:280px;overflow-y:auto;background:#101418;padding:6px 8px;font-size:var(--uooc-fs-xs);line-height:1.55;cursor:text;";

        let _chLogExpanded = false;
        function toggleChLog() {
            _chLogExpanded = !_chLogExpanded;
            chLog.style.display = _chLogExpanded ? "block" : "none";
            chLogToggle.textContent = _chLogExpanded ? "▾" : "▸";
            if (_chLogExpanded) chLog.scrollTop = chLog.scrollHeight;
        }
        chLogHead.addEventListener("click", function (e) {
            if (e.target === btnLogSubClear || btnLogSubClear.contains(e.target)) return;
            toggleChLog();
        });

        chLogWrap.append(chLogHead, chLog);
        pageChallenge.appendChild(chLogWrap);

        /* 【v0.12.18】题目缓存/扫描缓存均以 JSON 格式输出 */
        function formatCacheForDisplay(d) {
            if (!d) return "（当前课程暂无闯关缓存）";
            return JSON.stringify(d, null, 2);
        }

        function updatePanelHeightMode() {
            const anyOpen =
                subPage.style.display === "flex" ||
                scanSubPage.style.display === "flex";
            panel.classList.toggle("uooc-subpage-open", anyOpen);
        }

        function showSubPage(text) {
            _renderCodeTo(subBody, text);
            _quizCacheCleared = false;
            _applyClearBtnState(btnCacheClearInSub, false, "🗑 缓存", "🗑 缓存已清除");
            subPage.style.display = "flex";
            updatePanelHeightMode();
        }
        function hideSubPage() { subPage.style.display = "none"; updatePanelHeightMode(); }
        btnSubClose.onclick = hideSubPage;

        function setChLogExpanded(v) {
            _chLogExpanded = !!v;
            chLog.style.display = _chLogExpanded ? "block" : "none";
            chLogToggle.textContent = _chLogExpanded ? "▾" : "▸";
        }

        /* -------- 扫描结果页 -------- */
        const pageScan = document.createElement("div");
        pageScan.style.cssText = "flex:1;display:none;flex-direction:column;min-height:0;position:relative;";
        const scanHint = document.createElement("div");
        scanHint.style.cssText = "padding:8px 12px 2px;flex:0 0 auto;font-size:var(--uooc-fs-xs);color:#90a4ae;line-height:1.55;padding-right:120px;";
        scanHint.innerHTML = `
            格式：<code style="color:#4dd0e1;">Y</code>/<code style="color:#4dd0e1;">N</code>
            空格 <code style="color:#4dd0e1;">类型#序号</code> 空格 路径（各层用 <code style="color:#4dd0e1;">/</code> 分隔）。<br>
            闯关限制以 <code style="color:#ffa726;">[存在待扫描任务被闯关模式限制]</code> 单独成行。
        `;
        const scanEditArea = document.createElement("textarea");
        scanEditArea.spellcheck = false;
        scanEditArea.className = "uooc-scroll";
        scanEditArea.style.cssText = `flex:1; margin:8px 12px; padding:8px;background:#101418; color:#e6e6e6;border:1px solid #2a2f36; border-radius:6px;font-family:inherit; font-size:var(--uooc-fs-xs);line-height:1.6;resize:none; outline:none;white-space:pre;overflow:auto;min-height: 180px;`;
        const scanBtnRow = document.createElement("div");
        scanBtnRow.style.cssText = "padding:0 12px 10px;flex:0 0 auto;display:flex;justify-content:flex-end;gap:8px;";
        const btnScanView = document.createElement("button");
        btnScanView.textContent = "📖 缓存";
        btnScanView.style.cssText = `padding:var(--uooc-btn-py) 14px; border:1px solid ${C.interactiveBd}; border-radius:6px;background:${C.interactiveBg}; color:${C.interactiveFg}; cursor:pointer;font-size:var(--uooc-btn-fs); font-weight:bold; font-family:inherit;transition:all .15s;min-height:var(--uooc-touch-hit);`;
        const btnUpdateScan = document.createElement("button");
        btnUpdateScan.textContent = "更新扫描结果";
        btnUpdateScan.style.cssText = `padding:var(--uooc-btn-py) 18px; border:1px solid ${C.interactiveBd}; border-radius:6px;background:${C.interactiveBg}; color:${C.interactiveFg}; cursor:pointer;font-size:var(--uooc-btn-fs); font-weight:bold; font-family:inherit;transition:all .15s;min-height:var(--uooc-touch-hit);`;
        scanBtnRow.append(btnScanView, btnUpdateScan);
        pageScan.append(scanHint, scanEditArea, scanBtnRow);

        const scanSubPage = document.createElement("div");
        scanSubPage.style.cssText = "position:absolute;inset:0;background:rgba(15,18,22,0.98);z-index:50;display:none;flex-direction:column;padding:10px 12px;gap:8px;";
        const scanSubHeader = document.createElement("div");
        scanSubHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
        scanSubHeader.innerHTML = `<div style="font-weight:bold;color:#4dd0e1;font-size:var(--uooc-fs-sm);">扫描结果缓存</div>`;
        const btnScanSubClose = document.createElement("button");
        btnScanSubClose.textContent = "关闭";
        btnScanSubClose.style.cssText = `padding:5px 14px;border:none;border-radius:4px;background:${C.interactiveBg};color:${C.interactiveFg};cursor:pointer;font-size:var(--uooc-fs-sm);font-weight:bold;font-family:inherit;min-height:var(--uooc-touch-hit);`;
        scanSubHeader.appendChild(btnScanSubClose);

        const scanSubBody = document.createElement("div");
        scanSubBody.className = "uooc-scroll code-render uooc-selectable";
        scanSubBody.style.cssText = "flex:1;overflow:auto;padding:0;";
        scanSubPage.append(scanSubHeader, scanSubBody);

        /* 【v0.12.18】扫描缓存改为 JSON 输出 */
        function formatScanCacheForDisplay() {
            const obj = {
                version: STORAGE_VERSION_PREFIX,
                courseId: getCourseId() || "",
                courseName: getCourseName() || "",
                challengeMode: !!challengeMode,
                autoScanEnabled: !!autoScanEnabled,
                challengeBlockPoint: challengeBlockPoint ? {
                    ci: Number(challengeBlockPoint.ci) || 0,
                    si: Number(challengeBlockPoint.si) || 0,
                    chapterName: challengeBlockPoint.chapterName || "",
                    sectionName: challengeBlockPoint.sectionName || "",
                } : null,
                chapterScanStatus: getChapterStatuses(),
                scanItems: (scanItems || []).map(it => it.isChallengeMarker ? {
                    isChallengeMarker: true,
                    name: it.name || "",
                    type: it.type || "",
                } : {
                    name: it.name || "",
                    type: it.type || "",
                    isVideo: !!it.isVideo,
                    complete: !!it.complete,
                    path: it.path || [],
                    _ci: Number(it._ci) || 0,
                    _si: Number(it._si) || 0,
                    _ri: Number(it._ri) || 0,
                })
            };
            return JSON.stringify(obj, null, 2);
        }

        btnScanView.onclick = () => {
            _renderCodeTo(scanSubBody, formatScanCacheForDisplay());
            scanSubPage.style.display = "flex";
            updatePanelHeightMode();
        };
        btnScanSubClose.onclick = () => { scanSubPage.style.display = "none"; updatePanelHeightMode(); };

        /* -------- 总日志页 -------- */
        const pageLog = document.createElement("div");
        pageLog.style.cssText = "flex:1;display:none;flex-direction:column;min-height:0;position:relative;";
        const logBox = document.createElement("div");
        logBox.className = "uooc-scroll uooc-selectable";
        logBox.style.cssText = `flex:1; min-height:200px; max-height:420px; overflow-y:auto;padding:6px 12px 10px; background:#101418;line-height:1.55;cursor: text;`;

        const btnClearLog = document.createElement("button");
        btnClearLog.textContent = "🗑 日志";
        btnClearLog.title = "清空日志";
        btnClearLog.style.cssText = `
            position:absolute; top:6px; right:12px; z-index:10;
            background:${C.clearBtnBg}; color:#fff; border:none;
            border-radius:4px; padding:4px 12px; cursor:pointer;
            font-size:var(--uooc-fs-xs); font-family:inherit;
            transition: opacity .2s, background .15s;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
            opacity: 0.12;
        `;
        let _logCleared = false;
        btnClearLog.addEventListener("mouseenter", () => {
            btnClearLog.style.opacity = "1";
            if (!_logCleared) btnClearLog.style.background = C.clearBtnBgHover;
        });
        btnClearLog.addEventListener("mouseleave", () => {
            btnClearLog.style.opacity = "0.12";
            if (!_logCleared) btnClearLog.style.background = C.clearBtnBg;
        });
        btnClearLog.onclick = () => {
            if (_logCleared) return;
            logBox.innerHTML = "";
            _applyClearBtnState(btnClearLog, true, "🗑 日志", "🗑 日志已清除");
            _logCleared = true;
        };

        function _applyClearBtnState(btn, cleared, normalText, clearedText) {
            if (cleared) {
                btn.textContent = clearedText;
                btn.style.background = C.disabledBg;
                btn.style.color = C.disabledFg;
                btn.style.cursor = "not-allowed";
            } else {
                btn.textContent = normalText;
                btn.style.background = C.clearBtnBg;
                btn.style.color = "#fff";
                btn.style.cursor = "pointer";
            }
        }

        pageLog.append(logBox, btnClearLog);

        const btnClearCache = document.createElement("button");
        btnClearCache.textContent = "🗑 缓存";
        btnClearCache.title = "清除当前课程的本地扫描缓存";
        btnClearCache.style.cssText = `
            position:absolute; top:8px; right:12px; z-index:10;
            background:${C.clearBtnBg}; color:#fff; border:none;
            border-radius:4px; padding:4px 12px; cursor:pointer;
            font-size:var(--uooc-fs-xs); font-family:inherit;
            transition: opacity .2s, background .15s;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
            opacity: 0.12;
        `;
        let _cacheCleared = false;
        btnClearCache.addEventListener("mouseenter", () => {
            btnClearCache.style.opacity = "1";
            if (!_cacheCleared) btnClearCache.style.background = C.clearBtnBgHover;
        });
        btnClearCache.addEventListener("mouseleave", () => {
            btnClearCache.style.opacity = "0.12";
            if (!_cacheCleared) btnClearCache.style.background = C.clearBtnBg;
        });
        pageScan.appendChild(btnClearCache);

        bodyWrap.append(pageTasks, pageChallenge, pageScan, pageSettings, pageLog);
        bodyWrap.style.position = "relative";
        bodyWrap.appendChild(subPage);
        bodyWrap.appendChild(scanSubPage);
        panel.appendChild(bodyWrap);
        document.body.appendChild(panel);

        const colors = { info: "#cfd8dc", ok: "#66bb6a", warn: "#ffa726", err: "#ef5350", run: "#4dd0e1", debug: "#78909c" };
        function _log(msg, type = "info") {
            const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
            const line = document.createElement("div");
            line.style.cssText = `color:${colors[type] || colors.info};word-break:break-all;`;
            line.textContent = `[${time}] ${msg}`;
            logBox.appendChild(line);
            while (logBox.childNodes.length > MAX_LOG) logBox.removeChild(logBox.firstChild);
            logBox.scrollTop = logBox.scrollHeight;
            if (_logCleared) {
                _logCleared = false;
                _applyClearBtnState(btnClearLog, false, "🗑 日志", "🗑 日志已清除");
            }
        }

        let currentTabKey = "tasks";
        function styleTab(el, active) {
            el.style.background = active ? C.tabActiveBg : C.tabBg;
            el.style.color = C.tabFg;
            el.style.cursor = "pointer";
            el.style.borderBottom = active ? `2px solid ${C.tabActiveBg}` : `2px solid ${C.tabBd}`;
        }
        function switchTab(key) {
            if (key === "challenge" && tabChallenge.style.display === "none") key = "tasks";
            currentTabKey = key;
            styleTab(tabTasks,     key === "tasks");
            styleTab(tabChallenge, key === "challenge");
            styleTab(tabScan,      key === "scan");
            styleTab(tabSettings,  key === "settings");
            styleTab(tabLog,       key === "log");
            pageTasks.style.display     = key === "tasks"     ? "flex" : "none";
            pageChallenge.style.display = key === "challenge" ? "flex" : "none";
            pageScan.style.display      = key === "scan"      ? "flex" : "none";
            pageSettings.style.display  = key === "settings"  ? "flex" : "none";
            pageLog.style.display       = key === "log"       ? "flex" : "none";
            if (key !== "challenge") { subPage.style.display = "none"; }
            if (key !== "scan") { scanSubPage.style.display = "none"; }
            updatePanelHeightMode();
        }
        tabTasks.onclick     = () => switchTab("tasks");
        tabChallenge.onclick = () => switchTab("challenge");
        tabScan.onclick      = () => switchTab("scan");
        tabSettings.onclick  = () => switchTab("settings");
        tabLog.onclick       = () => switchTab("log");

        let folded = false;
        btnFold.onclick = () => {
            folded = !folded;
            tabBar.style.display = folded ? "none" : "flex";
            progressBox.style.display = folded ? "none" : "block";
            bodyWrap.style.display = folded ? "none" : "flex";
            btnFold.textContent = folded ? "▸" : "▾";
            if (folded) {
                subPage.style.display = "none";
                scanSubPage.style.display = "none";
                updatePanelHeightMode();
            }
        };

        (function makeDraggable() {
            let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
            function _start(clientX, clientY) {
                dragging = true;
                sx = clientX; sy = clientY;
                const r = panel.getBoundingClientRect();
                ox = r.left; oy = r.top;
                document.body.style.userSelect = "none";
            }
            function _move(clientX, clientY) {
                if (!dragging) return;
                panel.style.left = (ox + clientX - sx) + "px";
                panel.style.top = (oy + clientY - sy) + "px";
                panel.style.right = "auto";
            }
            function _end() {
                dragging = false;
                document.body.style.userSelect = "";
            }
            header.addEventListener("mousedown", e => {
                if (e.target === btnFold) return;
                _start(e.clientX, e.clientY);
            });
            document.addEventListener("mousemove", e => _move(e.clientX, e.clientY));
            document.addEventListener("mouseup", _end);

            /* 【v0.12.2】触屏拖动：仅移动版视图启用 */
            header.addEventListener("touchstart", e => {
                if (!getSettings().mobileView) return;
                if (e.target === btnFold) return;
                const t = e.touches[0];
                if (!t) return;
                _start(t.clientX, t.clientY);
                e.preventDefault();
            }, { passive: false });
            document.addEventListener("touchmove", e => {
                if (!getSettings().mobileView) return;
                if (!dragging) return;
                const t = e.touches[0];
                if (!t) return;
                _move(t.clientX, t.clientY);
                e.preventDefault();
            }, { passive: false });
            document.addEventListener("touchend", _end);
            document.addEventListener("touchcancel", _end);
        })();

        let _chapterStatuses = [];
        let resourceTotal = 0, resourceDone = 0;

        function ensureChapterSegments(total) {
            if (total <= 0) {
                chapterBarInner.innerHTML = "";
                _chapterStatuses = [];
                updateChapterText();
                return;
            }
            if (chapterBarInner.children.length === total && _chapterStatuses.length === total) return;
            chapterBarInner.innerHTML = "";
            const old = _chapterStatuses.slice();
            _chapterStatuses = new Array(total).fill("empty");
            for (let i = 0; i < total; i++) {
                if (i < old.length && old[i]) _chapterStatuses[i] = old[i];
            }
            for (let i = 0; i < total; i++) {
                const seg = document.createElement("div");
                seg.style.cssText = `flex:1;height:100%;background:${C.segEmpty};transition:background .25s;`;
                chapterBarInner.appendChild(seg);
            }
            for (let i = 0; i < total; i++) applySegmentStatus(i, _chapterStatuses[i]);
            updateChapterText();
        }

        function applySegmentStatus(idx, status) {
            const seg = chapterBarInner.children[idx];
            if (!seg) return;
            seg.classList.remove("uooc-blink-yellow");
            if (status === "ok")                seg.style.background = C.segOk;
            else if (status === "err")          seg.style.background = C.segErr;
            else if (status === "processing")   seg.style.background = C.segProcessing;
            else if (status === "challenge") {
                seg.style.background = C.segChallenge;
                seg.classList.add("uooc-blink-yellow");
            }
            else if (status === "challengePending") seg.style.background = C.segChallengePending;
            else                                seg.style.background = C.segEmpty;
        }

        function updateChapterText() {
            const done = _chapterStatuses.filter(s => s === "ok" || s === "err").length;
            $el("uooc-chapter-text").textContent = `${done} / ${_chapterStatuses.length}`;
        }

        function setChapterTotal(total) { ensureChapterSegments(total); }

        function setChapterScanStatus(statuses) {
            if (!Array.isArray(statuses)) statuses = [];
            if (statuses.length === 0) {
                const chapterLIs = document.querySelectorAll("ul.rank-1 > li.catalogItem");
                statuses = new Array(chapterLIs.length).fill("empty");
            }
            ensureChapterSegments(statuses.length);
            for (let i = 0; i < statuses.length; i++) {
                _chapterStatuses[i] = statuses[i] || "empty";
                applySegmentStatus(i, _chapterStatuses[i]);
            }
            updateChapterText();
        }

        function markChapterStatus(idx, status) {
            if (idx < 0) return;
            if (idx >= chapterBarInner.children.length) ensureChapterSegments(idx + 1);
            _chapterStatuses[idx] = status;
            applySegmentStatus(idx, status);
            updateChapterText();
        }
        function getChapterStatuses() { return _chapterStatuses.slice(); }

        function setChapterErrorLine(text) {
            if (!text) { chapterErrorLine.style.display = "none"; chapterErrorLine.textContent = ""; }
            else { chapterErrorLine.style.display = "block"; chapterErrorLine.textContent = text; }
        }

        function updateResourceBar() {
            const pct = resourceTotal ? Math.round(resourceDone / resourceTotal * 100) : 0;
            $el("uooc-resource-bar").style.width = pct + "%";
            $el("uooc-resource-text").textContent = `${resourceDone} / ${resourceTotal}  (${pct}%)`;
        }

        let optState = { aEnabled: false, bEnabled: false, selected: "B" };
        function paintOptions() {
            const abDisabled = _scanning || _allVideosDone || _unrestrictedVideosDone;
            [["A", optA], ["B", optB]].forEach(([k, o]) => {
                const enabled = (k === "A" ? optState.aEnabled : optState.bEnabled) && !abDisabled;
                const selected = optState.selected === k && enabled;
                if (enabled) {
                    o.wrap.style.opacity = "1";
                    o.wrap.style.cursor = "pointer";
                    o.wrap.style.background = selected ? C.interactiveBgOn : C.interactiveBg;
                    o.wrap.style.borderColor = C.interactiveBd;
                    o.wrap.style.color = C.interactiveFg;
                    o.dot.style.borderColor = C.interactiveFg;
                    o.dot.style.background = selected ? C.interactiveFg : "transparent";
                    o.dot.style.boxShadow = selected ? `inset 0 0 0 2px ${C.interactiveBgOn}` : "none";
                } else {
                    o.wrap.style.opacity = "0.7";
                    o.wrap.style.cursor = "not-allowed";
                    o.wrap.style.background = C.disabledBg;
                    o.wrap.style.borderColor = C.disabledBd;
                    o.wrap.style.color = C.disabledFg;
                    o.dot.style.borderColor = C.disabledFg;
                    o.dot.style.background = "transparent";
                    o.dot.style.boxShadow = "none";
                }
            });
        }
        function selectOption(k) {
            if (_scanning || _allVideosDone || _unrestrictedVideosDone) return;
            const enabled = k === "A" ? optState.aEnabled : optState.bEnabled;
            if (!enabled) return;
            optState.selected = k;
            paintOptions();
        }
        optA.wrap.onclick = () => selectOption("A");
        optB.wrap.onclick = () => selectOption("B");

        function paintAutoScanButton() {
            if (_autoScanEnabled) {
                autoScanWrap.style.background = C.interactiveBgOn;
                autoScanWrap.style.borderColor = C.interactiveBd;
                autoScanWrap.style.color = C.interactiveFg;
                autoScanDot.style.borderColor = C.interactiveFg;
                autoScanDot.style.background = C.interactiveFg;
                autoScanDot.style.boxShadow = `inset 0 0 0 2px ${C.interactiveBgOn}`;
            } else {
                autoScanWrap.style.background = C.disabledBg;
                autoScanWrap.style.borderColor = C.disabledBd;
                autoScanWrap.style.color = C.disabledFg;
                autoScanDot.style.borderColor = C.disabledFg;
                autoScanDot.style.background = "transparent";
                autoScanDot.style.boxShadow = "none";
            }
            autoScanLabel.textContent = "自动更新完成状态";
        }

        function updateAutoScanVisibility() {
            const visible = _challengeMode && !_running && !_scanning;
            autoScanBox.style.display = visible ? "block" : "none";
            if (visible) paintAutoScanButton();
        }

        let _externalMutexCheck = null;
        function _paintDisabled(btn) {
            btn.style.background = C.disabledBg;
            btn.style.color = C.disabledFg;
            btn.style.borderColor = C.disabledBd;
            btn.style.cursor = "not-allowed";
            btn.style.opacity = "0.7";
        }
        function _paintInteractive(btn) {
            btn.style.background = C.interactiveBg;
            btn.style.color = C.interactiveFg;
            btn.style.borderColor = C.interactiveBd;
            btn.style.cursor = "pointer";
            btn.style.opacity = "1";
        }

        function refreshButtonStates() {
            const mutex = _externalMutexCheck ? _externalMutexCheck() : { any: _running || _scanning, scanning: _scanning, running: _running, recordQuizRunning: false, quizRunning: false };

            const autoSubmit = _isAutoSubmit();
            if (_running) {
                btnStart.textContent = "⏸ 暂停递归";
                btnStart.style.background = C.pauseBg;
                btnStart.style.color = C.pauseFg;
                btnStart.disabled = false;
                btnStart.style.cursor = "pointer";
                btnStart.style.opacity = "1";
            } else if (mutex.any) {
                btnStart.textContent = "▶ 开始递归";
                btnStart.disabled = true;
                _paintDisabled(btnStart);
            } else if (_unrestrictedVideosDone) {
                btnStart.textContent = autoSubmit ? "【未被限制的】任务点已全部完成" : "【未被限制的】视频任务点已全部完成";
                btnStart.disabled = true;
                _paintDisabled(btnStart);
            } else if (_allVideosDone) {
                btnStart.textContent = autoSubmit ? "任务点已全部完成" : "视频任务点已全部完成";
                btnStart.disabled = true;
                _paintDisabled(btnStart);
            } else {
                btnStart.textContent = "▶ 开始递归";
                btnStart.style.background = C.runBg;
                btnStart.style.color = C.runFg;
                btnStart.disabled = false;
                btnStart.style.cursor = "pointer";
                btnStart.style.opacity = "1";
            }

            const rescanDisabled = mutex.any;
            btnRescan.textContent = _scanItemsEmpty ? "扫描但不递归" : "重新扫描";
            if (rescanDisabled) { btnRescan.disabled = true; _paintDisabled(btnRescan); }
            else { btnRescan.disabled = false; _paintInteractive(btnRescan); }

            const updateDisabled = mutex.any;
            if (updateDisabled) { btnUpdateScan.disabled = true; _paintDisabled(btnUpdateScan); }
            else { btnUpdateScan.disabled = false; _paintInteractive(btnUpdateScan); }

            if (mutex.any) { btnQuizRecord.disabled = true; _paintDisabled(btnQuizRecord); }
            else { btnQuizRecord.disabled = false; _paintInteractive(btnQuizRecord); }

            scanEditArea.readOnly = mutex.any;
            scanEditArea.style.background = mutex.any ? "#1a2028" : "#101418";

            paintOptions();
            paintQuizButton();

            const showChallenge = _challengeMode || getSettings().challengeAlwaysVisible;
            if (showChallenge) tabChallenge.style.display = "block";
            else { tabChallenge.style.display = "none"; if (currentTabKey === "challenge") switchTab("tasks"); }

            if (_challengeMode) {
                challengeCfgLine.style.display = "block";
                challengeCfgLine.textContent = `智能闯关模式配置：[${_challengeCfg}]`;
            } else {
                challengeCfgLine.style.display = "none";
            }

            updateAutoScanVisibility();

            const changes = [];
            if (_trackChange("btnStart", !btnStart.disabled)) changes.push("开始递归");
            if (_trackChange("btnRescan", !rescanDisabled)) changes.push("重新扫描");
            if (_trackChange("btnUpdateScan", !updateDisabled)) changes.push("更新扫描结果");
            if (_trackChange("scanEditArea", !mutex.any)) changes.push("扫描结果编辑区");
            const abDisabled2 = _scanning || _allVideosDone || _unrestrictedVideosDone;
            if (_trackChange("optA", optState.aEnabled && !abDisabled2)) changes.push("选项A");
            if (_trackChange("optB", optState.bEnabled && !abDisabled2)) changes.push("选项B");
            updateSubmitModeUI();
            if (changes.length) _log(`交互状态变化：${changes.join("、")}`, "debug");
        }

        let cbStart = null, cbRescan = null, cbUpdateScan = null;
        let cbAutoScanToggle = null, cbClearCache = null, cbRedirect = null;
        btnStart.onclick = () => cbStart && cbStart();
        btnRescan.onclick = () => cbRescan && cbRescan();
        btnUpdateScan.onclick = () => cbUpdateScan && cbUpdateScan();
        btnClearCache.onclick = () => { if (_cacheCleared) return; if (cbClearCache) cbClearCache(); };
        btnRedirect.onclick = () => { if (cbRedirect) cbRedirect(); };
        btnQuizView.onclick = () => {
            const d = QuizCache.load();
            showSubPage(formatCacheForDisplay(d));
        };
        btnQuizRecord.onclick = () => { if (cbQuizRecord) cbQuizRecord(); };

        autoScanWrap.onclick = () => {
            _autoScanEnabled = !_autoScanEnabled;
            paintAutoScanButton();
            if (cbAutoScanToggle) cbAutoScanToggle(_autoScanEnabled);
        };

        let _autoScanStartTime = 0;
        let _autoScanHideTimer = null;
        function setAutoScanning(v) {
            if (v) {
                if (_autoScanHideTimer) { clearTimeout(_autoScanHideTimer); _autoScanHideTimer = null; }
                _autoScanStartTime = Date.now();
                autoScanTag.style.display = "inline-block";
            } else {
                const elapsed = Date.now() - _autoScanStartTime;
                const remaining = Math.max(0, 1000 - elapsed);
                if (_autoScanHideTimer) clearTimeout(_autoScanHideTimer);
                if (remaining === 0) {
                    autoScanTag.style.display = "none";
                    _autoScanHideTimer = null;
                } else {
                    _autoScanHideTimer = setTimeout(() => {
                        autoScanTag.style.display = "none";
                        _autoScanHideTimer = null;
                    }, remaining);
                }
            }
        }

        function setCacheBtnCleared(cleared) {
            if (_cacheCleared === !!cleared) return;
            _cacheCleared = !!cleared;
            _applyClearBtnState(btnClearCache, _cacheCleared, "🗑 缓存", "🗑 缓存已清除");
        }
        function setShowRedirectButton(show) { redirectBox.style.display = show ? "block" : "none"; }
        function setAutoScanEnabled(on) { _autoScanEnabled = !!on; paintAutoScanButton(); }

        function setQuizStatus(t) {
            chStatusText.textContent = "状态：" + t;
            statusText.textContent = "状态：" + t;
        }
        function setQuizSubmitMode(mode) {
            const m = mode === "auto" ? "auto" : "manual";
            chSubmitSelect.value = m;
            try { setSettings({ submitMode: m }); } catch (e) {}
            try {
                const d = QuizCache.ensure();
                d.submitMode = m;
                QuizCache.save(d);
            } catch (e) {}
        }
        function getQuizSubmitMode() { return chSubmitSelect.value; }

        let _chLogCleared = false;
        btnLogSubClear.addEventListener("mouseenter", () => {
            btnLogSubClear.style.opacity = "1";
            if (!_chLogCleared) btnLogSubClear.style.background = C.clearBtnBgHover;
        });
        btnLogSubClear.addEventListener("mouseleave", () => {
            btnLogSubClear.style.opacity = "0.5";
            if (!_chLogCleared) btnLogSubClear.style.background = C.clearBtnBg;
        });
        btnLogSubClear.onclick = () => {
            if (_chLogCleared) return;
            chLog.innerHTML = "";
            _applyClearBtnState(btnLogSubClear, true, "🗑 日志", "🗑 日志已清除");
            _chLogCleared = true;
        };

        function appendQuizLog(msg, type) {
            const color = colors[type] || colors.info;
            const line = document.createElement("div");
            line.style.cssText = `color:${color};word-break:break-all;white-space:pre-wrap;`;
            line.textContent = `[${new Date().toLocaleTimeString("zh-CN",{hour12:false})}] ${msg}`;
            chLog.appendChild(line);
            while (chLog.childNodes.length > MAX_LOG) chLog.removeChild(chLog.firstChild);
            chLog.scrollTop = chLog.scrollHeight;
            if (_chLogCleared) {
                _chLogCleared = false;
                _applyClearBtnState(btnLogSubClear, false, "🗑 日志", "🗑 日志已清除");
            }
        }

        switchTab("tasks");
        paintOptions();
        paintAutoScanButton();
        paintQuizButton();
        refreshButtonStates();

        return {
            log: _log,
            setStatus(t) { statusText.textContent = "状态：" + t; },
            setChapterTotal,
            setChapterScanStatus,
            markChapterStatus,
            getChapterStatuses,
            setChapterErrorLine,
            setTaskProgress(done, total) { resourceDone = done; resourceTotal = total; updateResourceBar(); },
            incTaskDone() { resourceDone++; updateResourceBar(); },
            setScanning(v) { _scanning = !!v; refreshButtonStates(); },
            setRunning(v) { _running = !!v; refreshButtonStates(); },
            setScanItemsEmpty(v) { _scanItemsEmpty = !!v; refreshButtonStates(); },
            setAllVideosDone(v) { _allVideosDone = !!v; refreshButtonStates(); },
            setUnrestrictedVideosDone(v) { _unrestrictedVideosDone = !!v; refreshButtonStates(); },
            setChallengeMode(v) { _challengeMode = !!v; refreshButtonStates(); },
            setChallengeCfg(t) { _challengeCfg = t; refreshButtonStates(); },
            setAutoScanning,
            setAutoScanEnabled,
            setCacheBtnCleared,
            setShowRedirectButton,
            setChallengeWarning(text) {
                if (!text) {
                    challengeWarningLine.style.display = "none";
                    challengeWarningLine.textContent = "";
                } else {
                    challengeWarningLine.style.display = "block";
                    challengeWarningLine.textContent = text;
                }
            },
            switchTab,
            setTaskInfo(html) { taskInfo.innerHTML = html; },
            setOptions(aEnabled, bEnabled, prefer) {
                optState.aEnabled = !!aEnabled;
                optState.bEnabled = !!bEnabled;
                if (prefer && ((prefer === "A" && aEnabled) || (prefer === "B" && bEnabled))) optState.selected = prefer;
                else optState.selected = aEnabled ? "A" : "B";
                refreshButtonStates();
            },
            getSelectedOption() { return optState.selected; },
            setScanResultText(text) { scanEditArea.value = text; },
            getScanResultText() { return scanEditArea.value; },
            focusScanTab() { switchTab("scan"); },
            onStart(fn) { cbStart = fn; },
            onRescan(fn) { cbRescan = fn; },
            onUpdateScan(fn) { cbUpdateScan = fn; },
            onAutoScanToggle(fn) { cbAutoScanToggle = fn; },
            onClearCache(fn) { cbClearCache = fn; },
            onRedirect(fn) { cbRedirect = fn; },
            onQuizToggleStart(fn) { cbQuizToggleStart = fn; },
            onQuizToggleStop(fn) { cbQuizToggleStop = fn; },
            onQuizRecord(fn) { cbQuizRecord = fn; },
            onQuizClear(fn) { cbQuizClear = fn; },
            setQuizStatus,
            setQuizFillProgress,
            setQuizButtonRunning,
            setQuizButtonCompleted,
            resetQuizButton,
            setRecursiveAtQuiz(v) {
                const nv = !!v;
                if (_recursiveAtQuiz === nv) return;
                _recursiveAtQuiz = nv;
                try { paintQuizButton(); } catch (e) {}
            },
            isQuizButtonRunning() { return _quizFillAnswerRunning; },
            isQuizButtonCompleted() { return _quizCompletedOnce; },
            appendQuizLog,
            setQuizSubmitMode,
            getQuizSubmitMode,
            refreshButtonStates,
            updateSubmitModeUI,
            /* 【v0.12.20 修复】同时给智能答题按钮的 paintQuizButton 提供互斥判断 */
            _registerMutexCheck(fn) {
                _externalMutexCheck = fn;
                _anyMutexRunningCb = function () {
                    try {
                        const st = fn();
                        return !!(st && st.any);
                    } catch (e) { return false; }
                };
            }
        };
    })();

    /* ============================================================
     * 【移动版视图】开关 body 上的 CSS 类
     * ============================================================ */
    function applyMobileView(on) {
        if (on) document.body.classList.add("uooc-mobile-view");
        else document.body.classList.remove("uooc-mobile-view");
    }

    /* ============================================================
     * 【强制页面尺寸】
     * ============================================================ */
    function _computeForceSize(vw, vh, ratio) {
        let w = vw;
        let h = w / ratio;
        if (h > vh) { h = vh; w = h * ratio; }
        return { w: Math.floor(w), h: Math.floor(h) };
    }

    /* 【共用 HTML 片段】—— 修改前见顶部用户要求 5–10 与注意事项 A / B / I / J
     * ============================================================
     * 【共用 HTML 片段】两处管理器共用的样式与脚本（字符串形式）
     *   - 通过字符串拼接避免在脚本源码里出现连续三个 #
     * ============================================================ */
    function _commonManagerCss() {
        return `
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; background: #0d1117; color: #e6e6e6; display: flex; flex-direction: column; overflow: hidden; }
.header { flex: 0 0 auto; padding: 0 16px; height: 54px; background: linear-gradient(90deg, #0b3d3a, #052825); display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #1e2a33; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
.header h1 { margin: 0; font-size: 14px; letter-spacing: 1.5px; color: #cfd8dc; font-weight: 600; display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.tabs { display: flex; gap: 4px; background: rgba(0,0,0,0.25); padding: 4px; border-radius: 8px; flex: 0 0 auto; }
.tab { padding: 7px 22px; font-size: 13px; cursor: pointer; border-radius: 6px; color: #90a4ae; user-select: none; transition: background .2s, color .2s, box-shadow .2s; font-weight: 500; letter-spacing: .5px; }
.tab:hover { background: rgba(255,255,255,0.06); color: #cfd8dc; }
.tab.active { background: rgba(77,208,225,0.20); color: #4dd0e1; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(77,208,225,0.30); }
.toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
.toolbar button { padding: 7px 14px; border: none; border-radius: 4px; background: #2e7d32; color: #fff; cursor: pointer; font-size: 13px; font-weight: bold; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
.toolbar button .btn-icon { font-size: 14px; line-height: 1; }
@media (max-width: 900px) {
    .toolbar button .btn-text { display: none; }
    .toolbar button { padding: 7px 10px; gap: 0; }
    .toolbar button .btn-icon { font-size: 16px; }
}
.toolbar button:hover { background: #388e3c; }
.toolbar button:disabled { background: #37474f; color: #78909c; cursor: not-allowed; }
.toolbar button.sec { background: #455a64; }
.toolbar button.sec:hover { background: #546e7a; }
.toolbar button.warn { background: #6d4c41; }

/* 代码渲染器：行号 + 缩进竖线 + 彩色 token */
.code-render { font-family: "JetBrains Mono", "Consolas", monospace; font-size: 12.5px; line-height: 1.7; background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 10px 0; overflow: auto; color: #c9d1d9; }
.code-render .cl { position: relative; padding-left: calc(46px + var(--indent, 0) * 18px); padding-right: 16px; white-space: pre; min-height: 1.7em; }
.code-render .cl:hover { background: rgba(255,255,255,0.03); }
.code-render .cl > .ln { position: absolute; left: 0; top: 0; width: 36px; text-align: right; padding-right: 8px; color: #484f58; user-select: none; font-size: 11.5px; }
.code-render .cl::before { content: ""; position: absolute; left: 46px; top: 0; bottom: 0; width: calc(var(--indent, 0) * 18px); background: repeating-linear-gradient(90deg, rgba(110,130,160,0.28) 0, rgba(110,130,160,0.28) 1px, transparent 1px, transparent 18px); pointer-events: none; }
.code-render .tok-key  { color: #79c0ff; font-weight: bold; }
.code-render .tok-str  { color: #a5d6a7; }
.code-render .tok-num  { color: #ffb74d; }
.code-render .tok-kw   { color: #ce93d8; font-weight: bold; }
.code-render .tok-punc { color: #8b949e; }

/* 文档视图 + 目录 */
.view-doc { display: none; position: fixed; top: 54px; left: 0; right: 0; bottom: 0; background: #0d1117; z-index: 20; overflow: hidden; }
.view-doc.active { display: flex; }
.toc-btn { position: absolute; top: 14px; left: 14px; z-index: 30; width: 38px; height: 38px; border: none; border-radius: 8px; background: #1c2128; color: #b0bec5; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s ease, color .2s ease, box-shadow .2s ease; }
.toc-btn:hover { background: #2d333b; color: #e6e6e6; box-shadow: 0 0 0 3px rgba(77,208,225,0.18); }
.toc-btn:active { background: #3a424b; }
.toc-btn svg { position: absolute; width: 22px; height: 22px; transition: opacity .22s ease, transform .22s ease; }
.toc-btn .icon-menu { opacity: 1; transform: rotate(0); }
.toc-btn .icon-close { opacity: 0; transform: rotate(-60deg) scale(0.7); }
.view-doc.toc-open .toc-btn .icon-menu { opacity: 0; transform: rotate(60deg) scale(0.7); }
.view-doc.toc-open .toc-btn .icon-close { opacity: 1; transform: rotate(0) scale(1); }
.toc-panel { flex: 0 0 260px; background: #161b22; border-right: 1px solid #21262d; overflow-y: auto; padding: 62px 12px 12px; transition: margin-left .25s ease; margin-left: -260px; }
.view-doc.toc-open .toc-panel { margin-left: 0; }
.toc-list { list-style: none; margin: 0; padding: 0; position: relative; }
.toc-indicator { position: absolute; left: 0; right: 0; top: 0; height: 0; border-radius: 6px; background: rgba(77,208,225,0.16); pointer-events: none; opacity: 0; transition: transform .38s cubic-bezier(.34,1.4,.64,1), height .38s cubic-bezier(.34,1.4,.64,1), opacity .2s; z-index: 0; }
.toc-list a { position: relative; z-index: 1; display: block; padding: 5px 8px; font-size: 13px; color: #90a4ae; text-decoration: none; border-radius: 6px; cursor: pointer; transition: background .2s, color .2s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toc-list a:hover { background: rgba(255,255,255,0.05); color: #e6e6e6; }
.toc-list a.active { color: #4dd0e1; font-weight: 600; }
.toc-list a.lv2 { padding-left: 22px; font-size: 12.5px; }
.toc-list a.lv3 { padding-left: 38px; font-size: 12px; color: #78909c; }
.doc-body { flex: 1; overflow-y: auto; padding: 24px 32px 60px; min-width: 0; }

.doc { max-width: 900px; margin: 0 auto; font-size: 14px; line-height: 1.75; color: #c9d1d9; }
.doc h1 { font-size: 24px; font-weight: bold; color: #e6e6e6; border-bottom: 1px solid #21262d; padding-bottom: 10px; margin: 0 0 20px; scroll-margin-top: 20px; }
.doc h1 .ver { font-size: 13px; font-weight: normal; color: #4dd0e1; margin-left: 8px; }
.doc h2 { font-size: 18px; color: #4dd0e1; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #1c2128; scroll-margin-top: 20px; }
.doc h3 { font-size: 15px; color: #cfd8dc; margin: 20px 0 8px; scroll-margin-top: 20px; }
.doc p { margin: 8px 0; }
.doc strong { color: #e6e6e6; }
.doc em { color: #90a4ae; font-style: italic; }
.doc a { color: #4dd0e1; text-decoration: none; }
.doc a:hover { text-decoration: underline; }
.doc code { background: #1c2128; color: #79c0ff; padding: 1px 6px; border-radius: 3px; font-family: "JetBrains Mono", "Consolas", monospace; font-size: 12.5px; }
.doc ul, .doc ol { padding-left: 22px; }
.doc li { margin: 4px 0; }
.doc dl { margin: 12px 0; }
.doc dt { font-weight: bold; color: #e6e6e6; margin-top: 12px; }
.doc dd { margin: 4px 0 0 0; color: #b0bec5; }
.doc table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.doc th, .doc td { border: 1px solid #21262d; padding: 8px 10px; text-align: left; vertical-align: top; }
.doc th { background: #1c2128; color: #b0bec5; font-weight: bold; }
.doc tr:nth-child(even) td { background: #161b22; }
.doc .callout { display: flex; gap: 10px; padding: 12px 14px; border-radius: 6px; margin: 14px 0; font-size: 13.5px; line-height: 1.7; border-left: 4px solid; }
.doc .callout-title { flex: 0 0 auto; font-weight: bold; }
.doc .callout-body { flex: 1; min-width: 0; }
.doc .callout-important { background: rgba(255,193,7,0.08); border-left-color: #ffc107; }
.doc .callout-important .callout-title { color: #ffc107; }
.doc .callout-warn { background: rgba(239,83,80,0.10); border-left-color: #ef5350; }
.doc .callout-warn .callout-title { color: #ef5350; }
.doc .callout-info { background: rgba(66,165,245,0.10); border-left-color: #42a5f5; }
.doc .callout-info .callout-title { color: #42a5f5; }
.doc .code-render { margin: 12px 0; }

/* 移动端：目录侧滑，不全屏 */
@media (max-width: 700px) {
    .view-doc.active { z-index: 100; }
    .toc-panel { position: absolute; top: 0; left: 0; bottom: 0; z-index: 15; flex: none; width: 260px; max-width: 75vw; margin-left: 0; transform: translateX(-100%); transition: transform .25s ease; border-right: 1px solid #21262d; padding-top: 66px; overflow-y: auto; box-shadow: 2px 0 12px rgba(0,0,0,0.35); }
    .view-doc.toc-open .toc-panel { transform: translateX(0); margin-left: 0; }
    .doc-body { padding: 20px 16px 60px; }
}
`;
    }

    /* ============================================================
     * 【管理器控制台日志钩子】—— 放在管理器 HTML 的 <head> 里最前面执行
     *   1. hook console.error / console.warn（保留原功能）
     *   2. 监听 window error / unhandledrejection
     *   3. 去重后通过 postMessage 发回主脚本，写入主日志
     *   4. 首次出现时弹 window.alert（原生，不受管理器 UI 崩溃影响）
     *      提示"信息已发送到脚本主日志，请前往查看"
     *   5. alert 限流：相同消息不重复弹，总数上限 3 次
     * ============================================================ */
    function _commonConsoleHook(sourceTag) {
        return `
(function () {
    "use strict";
    var __UOOC_SRC = ${JSON.stringify(sourceTag)};
    var __uooc_reported = Object.create(null);
    var __uooc_alertCount = 0;
    var __uooc_alertLimit = 3;

    function _str(v) {
        try {
            if (v instanceof Error) return v.stack || v.message || String(v);
            if (typeof v === "object" && v !== null) {
                try { return JSON.stringify(v); } catch (e) { return String(v); }
            }
            return String(v);
        } catch (e) { return "[unserializable]"; }
    }
    function _format(args) {
        var parts = [];
        for (var i = 0; i < args.length; i++) parts.push(_str(args[i]));
        return parts.join(" ");
    }
    function _report(level, msg) {
        msg = String(msg == null ? "" : msg);
        if (!msg) return;
        var key = level + "|" + msg.slice(0, 200);
        if (__uooc_reported[key]) return;
        __uooc_reported[key] = 1;

        /* 发回主脚本，写入主日志 */
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    __uooc_methods: true,
                    type: "CONSOLE_MSG",
                    source: __UOOC_SRC,
                    level: level,
                    message: msg.slice(0, 4000),
                    time: Date.now()
                }, "*");
            }
        } catch (e) {}

        /* 浏览器原生弹窗提示（受 UI 崩溃不影响） */
        if (__uooc_alertCount < __uooc_alertLimit) {
            __uooc_alertCount++;
            var icon = level === "error" ? "\\u274c \\u53d1\\u751f\\u9519\\u8bef" : "\\u26a0\\ufe0f \\u53d1\\u751f\\u8b66\\u544a";
            var text = icon + "\\uff1a\\n\\n" + msg.slice(0, 500) +
                "\\n\\n\\uff08\\u4fe1\\u606f\\u5df2\\u53d1\\u9001\\u5230\\u811a\\u672c\\u4e3b\\u65e5\\u5fd7\\uff0c\\u8bf7\\u524d\\u5f80\\u67e5\\u770b\\uff09";
            try { window.alert(text); } catch (e) {}
        }
    }

    var _origErr = console.error;
    var _origWarn = console.warn;
    if (typeof _origErr === "function") {
        console.error = function () {
            try { _origErr.apply(console, arguments); } catch (e) {}
            try { _report("error", _format(arguments)); } catch (e) {}
        };
    }
    if (typeof _origWarn === "function") {
        console.warn = function () {
            try { _origWarn.apply(console, arguments); } catch (e) {}
            try { _report("warn", _format(arguments)); } catch (e) {}
        };
    }
    window.addEventListener("error", function (ev) {
        try {
            var msg = (ev && ev.message) || "\\u672a\\u77e5\\u9519\\u8bef";
            if (ev && ev.filename) msg += " @ " + ev.filename + ":" + (ev.lineno || 0) + ":" + (ev.colno || 0);
            _report("error", msg);
        } catch (e) {}
    });
    window.addEventListener("unhandledrejection", function (ev) {
        try {
            var r = ev && ev.reason;
            var msg = (r && (r.stack || r.message)) || String(r);
            _report("error", "\\u672a\\u5904\\u7406\\u7684 Promise \\u62d2\\u7edd: " + msg);
        } catch (e) {}
    });
})();
`;
    }

    function _commonRenderJS() {
        return `
    function escapeHTML(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function highlightLine(raw) {
        var s = escapeHTML(raw);
        s = s.replace(/"(?:[^"\\\\]|\\\\.)*"(\\s*:)?/g, function (m, colon) {
            if (colon) {
                var kv = m.match(/^("(?:[^"\\\\]|\\\\.)*")(\\s*:)$/);
                if (kv) return '<span class="tok-key">' + kv[1] + '</span><span class="tok-punc">' + kv[2] + '</span>';
            }
            return '<span class="tok-str">' + m + '</span>';
        });
        s = s.replace(/(^|[^a-zA-Z0-9_".\\-])(-?\\d+(?:\\.\\d+)?)/g, function (m, pre, num) { return pre + '<span class="tok-num">' + num + '</span>'; });
        return s;
    }
    function renderCodeHTML(text) {
        var lines = String(text || "").split(/\\r?\\n/);
        var out = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var m = line.match(/^([ \\t]*)/);
            var indentStr = m ? m[1] : "";
            var spaces = indentStr.replace(/\\t/g, "  ").length;
            var level = Math.floor(spaces / 2);
            var content = line.slice(indentStr.length);
            out.push('<div class="cl" style="--indent:' + level + '"><span class="ln">' + (i + 1) + '</span>' + highlightLine(content) + '</div>');
        }
        return out.join("");
    }
    function renderCodeTo(el, text) { el.innerHTML = renderCodeHTML(text); }
    function escHTMLSimple(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function makeDocTocController(opts) {
        var docBodyId = opts.docBodyId;
        var tocListId = opts.tocListId;
        var docContentId = opts.docContentId;
        var tocIndicator = null;
        var tocListRef = null;
        var docBodyRef = null;
        var built = false;

        function ensureIndicator() {
            if (!tocListRef) return;
            if (tocIndicator && tocIndicator.parentNode === tocListRef) return;
            tocIndicator = document.createElement("div");
            tocIndicator.className = "toc-indicator";
            tocListRef.insertBefore(tocIndicator, tocListRef.firstChild);
        }
        function updateIndicator() {
            if (!tocListRef || !tocIndicator) return;
            var active = tocListRef.querySelector("a.active");
            if (!active) { tocIndicator.style.opacity = "0"; return; }
            var listRect = tocListRef.getBoundingClientRect();
            var rect = active.getBoundingClientRect();
            tocIndicator.style.opacity = "1";
            tocIndicator.style.transform = "translateY(" + (rect.top - listRect.top + tocListRef.scrollTop) + "px)";
            tocIndicator.style.height = rect.height + "px";
        }
        function setActive(id) {
            if (!tocListRef) return;
            tocListRef.querySelectorAll("a").forEach(function (a) {
                a.classList.toggle("active", a.getAttribute("data-target") === id);
            });
            updateIndicator();
        }
        function bindScroll() {
            if (!docBodyRef) return;
            if (docBodyRef._boundScroll) return;
            docBodyRef._boundScroll = true;
            var raf = false;
            docBodyRef.addEventListener("scroll", function () {
                if (raf) return;
                raf = true;
                requestAnimationFrame(function () {
                    raf = false;
                    var headings = docBodyRef.querySelectorAll(".doc h1, .doc h2, .doc h3");
                    if (headings.length === 0) return;
                    var containerTop = docBodyRef.getBoundingClientRect().top + 80;
                    var found = null;
                    headings.forEach(function (h) {
                        if (h.getBoundingClientRect().top <= containerTop) found = h;
                    });
                    if (!found) found = headings[0];
                    if (found && found.id) setActive(found.id);
                });
            });
        }

        return {
            build: function (DOC_DATA) {
                if (built) return;
                built = true;
                var doc = document.getElementById(docContentId);
                if (!doc) return;
                doc.innerHTML = "";
                var tocList = document.getElementById(tocListId);
                if (tocList) tocList.innerHTML = "";
                tocListRef = tocList;
                docBodyRef = document.getElementById(docBodyId);
                ensureIndicator();
                var html = [];
                var hIdx = 0;
                function linkifyRefs(s) {
                    if (s == null) return "";
                    return String(s).replace(/§([0-9]+(?:[.][0-9]+)*)/g, function (m, num) {
                        var anchor = "sec-" + num.replace(/[.]/g, "-");
                        return '<a href="javascript:void(0)" class="sec-ref" data-target="' + anchor + '">' + m + '</a>';
                    });
                }
                function addToc(level, id, text) {
                    if (!tocList) return;
                    var li = document.createElement("li");
                    var a = document.createElement("a");
                    a.href = "javascript:void(0)";
                    a.setAttribute("data-target", id);
                    if (level > 1) a.className = "lv" + level;
                    a.textContent = String(text).replace(/<[^>]*>/g, "");
                    a.addEventListener("click", function () {
                        var el = document.getElementById(id);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        if (window.innerWidth <= 700) {
                            var vd = document.getElementById("view-doc");
                            if (vd) vd.classList.remove("toc-open");
                        }
                    });
                    li.appendChild(a);
                    tocList.appendChild(li);
                }
                for (var i = 0; i < DOC_DATA.length; i++) {
                    var item = DOC_DATA[i];
                    switch (item.t) {
                        case "h1": { var id1 = "doc-h-" + (hIdx++); html.push('<h1 id="' + id1 + '">' + item.text + (item.ver ? ' <span class="ver">' + item.ver + '</span>' : '') + '</h1>'); addToc(1, id1, item.text); break; }
                        case "h2": {
                            var secMatch2 = String(item.text).match(/^([0-9]+)[.]\\s/);
                            var id2;
                            if (secMatch2) id2 = "sec-" + secMatch2[1];
                            else id2 = "doc-h-" + (hIdx++);
                            html.push('<h2 id="' + id2 + '">' + item.text + '</h2>');
                            addToc(2, id2, item.text);
                            break;
                        }
                        case "h3": {
                            var secMatch3 = String(item.text).match(/^([0-9]+[.][0-9]+)\\s/);
                            var id3;
                            if (secMatch3) id3 = "sec-" + secMatch3[1].replace(/[.]/g, "-");
                            else id3 = "doc-h-" + (hIdx++);
                            html.push('<h3 id="' + id3 + '">' + item.text + '</h3>');
                            addToc(3, id3, item.text);
                            break;
                        }
                        case "p": html.push("<p>" + linkifyRefs(item.text) + "</p>"); break;
                        case "ul": case "ol": {
                            var tag = item.t, list = "<" + tag + ">";
                            for (var k = 0; k < item.list.length; k++) list += "<li>" + linkifyRefs(item.list[k]) + "</li>";
                            list += "</" + tag + ">";
                            html.push(list);
                            break;
                        }
                        case "table": {
                            var t = "<table><thead><tr>";
                            for (var j = 0; j < item.head.length; j++) t += "<th>" + item.head[j] + "</th>";
                            t += "</tr></thead><tbody>";
                            for (var r = 0; r < item.rows.length; r++) {
                                t += "<tr>";
                                for (var c = 0; c < item.rows[r].length; c++) t += "<td>" + item.rows[r][c] + "</td>";
                                t += "</tr>";
                            }
                            t += "</tbody></table>";
                            html.push(t);
                            break;
                        }
                        case "callout": html.push('<div class="callout callout-' + item.kind + '"><div class="callout-title">' + item.title + '</div><div class="callout-body">' + linkifyRefs(item.body) + '</div></div>'); break;
                        case "code": html.push('<div class="code-render doc-code" data-code="' + encodeURIComponent(item.text) + '"></div>'); break;
                        case "qa": {
                            var qa = "<dl>";
                            for (var q = 0; q < item.list.length; q++) qa += "<dt>" + item.list[q].q + "</dt><dd>" + item.list[q].a + "</dd>";
                            qa += "</dl>";
                            html.push(qa);
                            break;
                        }
                    }
                }
                doc.innerHTML = html.join("");
                doc.querySelectorAll(".code-render.doc-code").forEach(function (el) {
                    var code = decodeURIComponent(el.getAttribute("data-code"));
                    renderCodeTo(el, code);
                });
                doc.addEventListener("click", function (e) {
                    var t = e.target;
                    if (t && t.classList && t.classList.contains("sec-ref")) {
                        e.preventDefault();
                        var target = t.getAttribute("data-target");
                        if (target) {
                            var el2 = document.getElementById(target);
                            if (el2) el2.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    }
                });
                bindScroll();
                var firstH = doc.querySelector("h1, h2, h3");
                if (firstH && firstH.id) setActive(firstH.id);
            }
        };
    }
`;
    }

    /* ============================================================
     * 【AI 方案管理器 HTML】通过 window.opener.postMessage 与主页面通信
     * ============================================================ */
    function _buildMethodManagerHtml() {
        // 【重要】本函数体内任何模板字面量若需输出换行，必须用 String.fromCharCode(10)，
        // 禁止写裸的 \n 或真换行——单个 \n 会被外层模板字面量解释成真换行，
        // 落入内嵌 <script> 的字符串字面量后导致 SyntaxError（脚本曾因此瘫痪，见顶部注释【二】L 条）
        var css = _commonManagerCss();
        var renderJS = _commonRenderJS();
        var consoleHook = _commonConsoleHook("method-manager");
        var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>AI 方案管理器</title>\n<script>\n' + consoleHook + '\n<\/script>\n<style>\n' + css + `
.main { flex: 1; display: grid; grid-template-columns: 260px 1fr; gap: 0; min-height: 0; }
@media (max-width: 700px) and (orientation: portrait) {
    .main { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .sidebar { max-height: 32vh; border-right: none; border-bottom: 1px solid #21262d; }
}
.sidebar { display: flex; flex-direction: column; background: #161b22; border-right: 1px solid #21262d; overflow-y: auto; }
.sidebar-head { padding: 8px 12px; background: #1c2128; border-bottom: 1px solid #21262d; font-size: 12px; font-weight: bold; color: #4dd0e1; position: sticky; top: 0; }
.list { list-style: none; margin: 0; padding: 0; }
.method-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #1c2128; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.method-item:hover { background: rgba(255,255,255,0.04); }
.method-item.active { background: rgba(77,208,225,0.10); border-left: 3px solid #4dd0e1; padding-left: 9px; }
.method-name { flex: 1; font-size: 13px; word-break: break-all; }
.badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: normal; }
.badge.builtin { background: #546e7a; color: #fff; }
.badge.custom { background: #2e7d32; color: #fff; }
.badge.active-badge { background: #ffa726; color: #000; }
.editor { display: flex; flex-direction: column; padding: 12px 16px; gap: 8px; min-height: 0; overflow-y: auto; }
.row { display: flex; align-items: center; gap: 8px; }
.row label { font-size: 13px; color: #b0bec5; flex: 0 0 auto; min-width: 70px; }
.row input { flex: 1; background: #0d1117; color: #e6e6e6; border: 1px solid #21262d; border-radius: 4px; padding: 7px 10px; font-family: inherit; font-size: 13px; }
.row input:read-only { background: #161b22; color: #90a4ae; }
.editor-actions { display: flex; gap: 8px; flex: 0 0 auto; }
.editor-actions button { padding: 8px 18px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; font-family: inherit; }
.editor-actions button:disabled { cursor: not-allowed; opacity: .5; }
.btn-save { background: #2e7d32; color: #fff; }
.btn-save:hover:not(:disabled) { background: #388e3c; }
.btn-save.saved { background: #4a5a4f; color: #cfd8dc; cursor: not-allowed; opacity: 0.75; }
.btn-save.saved:hover { background: #4a5a4f; }
.btn-delete { background: #c62828; color: #fff; }
.btn-delete:hover:not(:disabled) { background: #d32f2f; }
.btn-hint { font-size: 12px; color: #78909c; line-height: 1.55; padding: 8px 0 0; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #1c2128; border: 1px solid #30363d; border-radius: 12px; padding: 20px 24px; min-width: 320px; max-width: 420px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
.modal-title { font-size: 15px; font-weight: bold; color: #cfd8dc; margin-bottom: 12px; }
.modal-body { font-size: 13px; color: #b0bec5; line-height: 1.6; margin-bottom: 18px; word-break: break-all; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.modal-btn { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; font-family: inherit; }
.modal-btn-danger { background: #c62828; color: #fff; }
.modal-btn-danger:hover { background: #d32f2f; }
.modal-btn-cancel { background: #42a5f5; color: #fff; }
.modal-btn-cancel:hover { background: #64b5f6; }
.modal-btn-ok { background: #2e7d32; color: #fff; }
.modal-btn-ok:hover { background: #388e3c; }
.empty-hint { flex: 1; display: flex; align-items: center; justify-content: center; color: #6e7681; font-size: 13px; }
.code-editor { position: relative; flex: 1; min-height: 320px; display: flex; }
.code-editor > .code-render { position: absolute; inset: 0; margin: 0; pointer-events: none; overflow: auto; scrollbar-width: none; }
.code-editor > .code-render::-webkit-scrollbar { display: none; }
.code-editor > textarea { position: relative; width: 100%; min-height: 320px; background: transparent; color: transparent; -webkit-text-fill-color: transparent; caret-color: #e6e6e6; border: 1px solid #21262d; border-radius: 6px; padding: 10px 16px 10px 46px; font-family: "JetBrains Mono", "Consolas", monospace; font-size: 12.5px; line-height: 1.7; resize: none; outline: none; white-space: pre; overflow: auto; tab-size: 2; }
.code-editor > textarea:read-only { caret-color: transparent; }
.new-btn-wrap { position: relative; display: inline-block; }
.new-menu { position: absolute; top: calc(100% + 6px); left: 0; min-width: 220px; background: #1c2128; border: 1px solid #30363d; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,0.45); z-index: 100; padding: 4px; }
.new-menu-item { padding: 8px 12px; font-size: 13px; color: #cfd8dc; cursor: pointer; border-radius: 4px; white-space: nowrap; }
.new-menu-item:hover { background: rgba(77,208,225,0.14); color: #4dd0e1; }
.mode-tabs { display: flex; gap: 3px; background: rgba(0,0,0,0.25); padding: 3px; border-radius: 6px; flex: 0 0 auto; align-self: flex-start; }
.mode-tab { padding: 4px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px; color: #90a4ae; user-select: none; transition: background .2s, color .2s, box-shadow .2s; font-weight: 500; letter-spacing: .3px; }
.mode-tab:hover { background: rgba(255,255,255,0.06); color: #cfd8dc; }
.mode-tab.active { background: rgba(77,208,225,0.20); color: #4dd0e1; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(77,208,225,0.30); }
.gui-form { flex: 1; display: none; flex-direction: column; gap: 8px; padding: 4px 0; overflow-y: auto; min-height: 0; }
.gui-card { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 10px 12px; }
.gui-card-title { font-size: 13px; font-weight: bold; color: #4dd0e1; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #21262d; }
.gui-field { padding: 8px 6px; display: flex; flex-direction: column; gap: 4px; border-radius: 6px; transition: background .15s; }
.gui-field:hover { background: rgba(255,255,255,0.03); }
.gui-field-label { font-size: 12px; color: #cfd8dc; font-weight: bold; }
.gui-field-var { color: #78909c; font-weight: normal; font-family: "Consolas", monospace; margin-left: 6px; font-size: 11px; }
.gui-required-mark { color: #ef5350; margin-left: 4px; }
.gui-field-desc { font-size: 11px; color: #90a4ae; line-height: 1.5; }
.gui-field-hint { font-size: 11px; color: #6e7681; line-height: 1.5; padding-left: 8px; border-left: 2px solid #2a2f36; margin-top: 1px; }
.gui-field input, .gui-field select, .gui-field textarea { background-color: #0d1117; color: #e6e6e6; border: 1px solid #21262d; border-radius: 4px; padding: 7px 10px; font-family: inherit; font-size: 12.5px; outline: none; transition: border-color .15s, background-color .15s; }
.gui-field select { appearance: none; -webkit-appearance: none; -moz-appearance: none; padding-right: 32px; background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2390a4ae' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 13px 13px; cursor: pointer; }
.gui-field select:hover { background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234dd0e1' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); }
.gui-field select option { background: #0d1117; color: #e6e6e6; }
.gui-field input:hover, .gui-field select:hover, .gui-field textarea:hover { border-color: #3a4a56; background-color: #1a2330; }
.gui-field input:focus, .gui-field select:focus, .gui-field textarea:focus { border-color: #4dd0e1; background-color: #0d1117; }
.gui-field textarea { resize: vertical; min-height: 60px; }
.gui-field.required-invalid input, .gui-field.required-invalid select, .gui-field.required-invalid textarea { background: #2b1719; border-color: #ef5350; }
.auth-row { display: flex; gap: 6px; align-items: stretch; }
.auth-input-wrap { position: relative; flex: 1; min-width: 0; display: flex; }
.auth-input-wrap input { width: 100%; }
.auth-mask { position: absolute; inset: 0; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); background: rgba(35,42,52,0.72); border-radius: 4px; pointer-events: none; transition: opacity .2s; }
.auth-mask.hidden { opacity: 0; }
.auth-eye { width: 34px; flex: 0 0 auto; padding: 0; border: 1px solid #21262d; background: #0d1117; color: #90a4ae; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s, box-shadow .15s; }
.auth-eye:hover { background: rgba(77,208,225,0.18); color: #4dd0e1; box-shadow: 0 2px 0 0 rgba(77,208,225,0.55); }
.auth-eye.open { background: rgba(77,208,225,0.10); color: #4dd0e1; box-shadow: 0 2px 0 0 rgba(77,208,225,0.35); }
.model-row { display: flex; gap: 6px; align-items: stretch; }
.model-row input, .model-row select { flex: 1; min-width: 0; }
.model-toggle-btn { width: 34px; flex: 0 0 auto; padding: 0; border: 1px solid #21262d; background: #0d1117; color: #90a4ae; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s, box-shadow .15s; }
.model-toggle-btn:hover { background: rgba(77,208,225,0.18); color: #4dd0e1; box-shadow: 0 2px 0 0 rgba(77,208,225,0.55); }
</style>
</head>
<body>
<div class="header">
    <h1>🔌 AI 方案管理器</h1>
    <div class="tabs">
        <div class="tab active" data-view="manage">操作</div>
        <div class="tab" data-view="doc">文档</div>
    </div>
    <div class="toolbar">
        <div class="new-btn-wrap">
            <button id="btn-new" title="新建方案"><span class="btn-icon">＋</span><span class="btn-text">新建方案</span></button>
            <div class="new-menu" id="new-menu" style="display:none;">
                <div class="new-menu-item" data-mode="gui">使用 GUI 页面（仅限 API）</div>
                <div class="new-menu-item" data-mode="code">使用代码编辑器</div>
            </div>
        </div>
        <button id="btn-import" class="sec" title="导入方案"><span class="btn-icon">📥</span><span class="btn-text">导入</span></button>
        <button id="btn-export" class="sec" title="合并导出"><span class="btn-icon">📤</span><span class="btn-text">合并导出</span></button>
        <button id="btn-refresh" class="sec" title="刷新"><span class="btn-icon">↻</span><span class="btn-text">刷新</span></button>
    </div>
</div>
<div class="main" id="view-manage">
    <aside class="sidebar">
        <div class="sidebar-head">方案列表</div>
        <ul class="list" id="list"></ul>
    </aside>
    <section class="editor">
        <div class="row">
            <label>名称</label>
            <input id="editor-name" type="text" placeholder="方案名">
        </div>
        <div id="mode-toggle" class="mode-tabs" style="display:none;">
            <div class="mode-tab active" id="mode-tab-gui" data-mode="gui">GUI</div>
            <div class="mode-tab" id="mode-tab-code" data-mode="code">代码编辑</div>
        </div>
        <div class="code-editor" id="code-editor">
            <div class="code-render" id="editor-render"></div>
            <textarea id="editor-json" placeholder="方案定义 JSON" spellcheck="false"></textarea>
        </div>
        <div class="gui-form" id="gui-form" style="display:none;"></div>
        <div class="editor-actions">
            <button id="btn-save" class="btn-save" disabled>保存</button>
            <button id="btn-delete" class="btn-delete" disabled>删除</button>
        </div>
        <div class="btn-hint" id="editor-hint"></div>
    </section>
</div>
<div class="view-doc" id="view-doc">
    <button class="toc-btn" id="btn-toc" title="展开 / 关闭目录" aria-label="目录">
        <svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="5" x2="19" y2="19"/>
            <line x1="19" y1="5" x2="5" y2="19"/>
        </svg>
    </button>
    <nav class="toc-panel">
        <ul class="toc-list" id="toc-list"></ul>
    </nav>
    <div class="doc-body" id="doc-body">
        <div class="doc" id="doc-content"></div>
    </div>
</div>
<div class="modal-overlay" id="modal-overlay" style="display:none;">
    <div class="modal-box">
        <div class="modal-title" id="modal-title">二次确认</div>
        <div class="modal-body" id="modal-body-text"></div>
        <div class="modal-actions">
            <button class="modal-btn modal-btn-danger" id="modal-confirm" type="button">确定删除</button>
            <button class="modal-btn modal-btn-cancel" id="modal-cancel" type="button">取消</button>
        </div>
    </div>
</div>
<script>
(function () {
    "use strict";
    var $ = function (id) { return document.getElementById(id); };
    var allMethods = [];
    var activeId = null;
    var selectedId = null;
    var _connectTimeout = null;
    var _editMode = "code";
    var _draftMethod = null;

    /* 【v0.12.24】预设模型系列注册表：新增预设只需在这里加一项 */
    var PRESETS = {
        deepseek: {
            name: "DeepSeek",
            models: ["deepseek-flash", "deepseek-v4-pro"],
            detectKeywords: ["deepseek"],
            endpointPlaceholder: "https://api.deepseek.com/chat/completions",
            endpointDesc: "接收 JSON 请求的完整 HTTP(S) URL。",
            endpointHint: "DeepSeek 接口地址：https://api.deepseek.com/chat/completions。",
            modelPlaceholder: "deepseek-flash",
            modelDesc: "服务商提供的模型标识符；不同模型对应不同的能力、速度与计费。",
            modelHint: "DeepSeek 可选 deepseek-flash（更快更省）或 deepseek-v4-pro（更强更慢）。",
            systemPromptHint: "例如「回答务必简洁」「优先依据中国教材」。",
            responsePathPlaceholder: "choices.0.message.content",
            responsePathDesc: "以点号分隔的 JSON 字段路径；脚本按此路径从响应中取纯文本回答。",
            responsePathHint: "DeepSeek 兼容 OpenAI 格式：choices.0.message.content。",
            authHint: "在 DeepSeek 控制台 → API Keys 页面生成，直接粘贴 Key 即可（无需手写 Bearer）。"
        },
        doubao: {
            name: "Doubao（火山方舟）",
            models: [
                "doubao-seed-2-1-pro-260915",
                "doubao-seed-2-1-lite-260915",
                "doubao-seed-2-0-pro-260215",
                "doubao-seed-2-0-lite-260215",
                "doubao-seed-2-0-mini-260215"
            ],
            detectKeywords: ["doubao", "volces", "volcengine", "ark.cn-beijing"],
            endpointPlaceholder: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
            endpointDesc: "接收 JSON 请求的完整 HTTP(S) URL。",
            endpointHint: "火山方舟接口地址：https://ark.cn-beijing.volces.com/api/v3/chat/completions（北京区）。如使用其他区域，请按控制台提供的地址填写。",
            modelPlaceholder: "doubao-seed-2-1-pro-260915",
            modelDesc: "服务商提供的模型标识符；不同模型对应不同的能力、速度与计费。",
            modelHint: "Doubao 可选 doubao-seed-2-1-pro（旗舰，多模态）/ doubao-seed-2-1-lite（轻量）/ doubao-seed-2-0-pro（上一代旗舰）/ doubao-seed-2-0-lite / doubao-seed-2-0-mini（极小）。",
            systemPromptHint: "例如「回答务必简洁」「优先依据中国教材」。",
            responsePathPlaceholder: "choices.0.message.content",
            responsePathDesc: "以点号分隔的 JSON 字段路径；脚本按此路径从响应中取纯文本回答。",
            responsePathHint: "Doubao 兼容 OpenAI 格式：choices.0.message.content。切勿填 choices.0.message.reasoning_content（那是思考摘要）。",
            authHint: "在火山方舟控制台 → API Key 管理页面生成，直接粘贴 Key 即可（脚本会自动补 Bearer 前缀）。"
        }
    };
    var GENERIC_TEXTS = {
        endpointPlaceholder: "https://api.example.com/v1/chat/completions",
        endpointDesc: "接收 JSON 请求的完整 HTTP(S) URL。",
        endpointHint: "AI 服务商提供的接口地址，通常以 /chat/completions 结尾。",
        modelPlaceholder: "model-name",
        modelDesc: "服务商提供的模型标识符；不同模型对应不同的能力、速度与计费。",
        modelHint: "具体模型名以服务商文档为准。",
        systemPromptHint: "例如「回答务必简洁」「优先依据中国教材」。",
        responsePathPlaceholder: "choices.0.message.content",
        responsePathDesc: "以点号分隔的 JSON 字段路径；脚本按此路径从响应中取纯文本回答。",
        responsePathHint: "OpenAI 兼容格式通常是 choices.0.message.content。",
        authHint: "在服务商控制台生成 API Key，直接粘贴即可（脚本会自动补 Bearer 前缀）。"
    };
    function detectPresetByFieldValues() {
        var ep = $("gui-endpoint") ? ($("gui-endpoint").value || "").toLowerCase() : "";
        var mdInput = $("gui-model");
        var msel = $("gui-model-select");
        var md = "";
        if (msel && msel.style.display !== "none") md = (msel.value || "").toLowerCase();
        else if (mdInput) md = (mdInput.value || "").toLowerCase();
        var hay = ep + " " + md;
        for (var k in PRESETS) {
            var p = PRESETS[k];
            var kws = p.detectKeywords || [];
            for (var i = 0; i < kws.length; i++) {
                if (kws[i] && hay.indexOf(kws[i].toLowerCase()) >= 0) return k;
            }
        }
        return null;
    }

    function post(msg) {
        try { window.opener && !window.opener.closed && window.opener.postMessage(Object.assign({ __uooc_methods: true }, msg), "*"); }
        catch (e) { console.error("[UOOC-MM] post failed", e); }
    }

    window.addEventListener("message", function (ev) {
        var d = ev.data;
        if (!d || typeof d !== "object" || !d.__uooc_methods) return;
        if (d.type === "LIST") {
            if (_connectTimeout) { clearTimeout(_connectTimeout); _connectTimeout = null; }
            allMethods = d.methods || [];
            activeId = d.activeId;
            if (selectedId && !allMethods.some(function (m) { return m.id === selectedId; })) selectedId = null;
            if (!selectedId && allMethods.length > 0) {
                var act = allMethods.find(function (m) { return m.id === activeId; });
                selectedId = act ? act.id : allMethods[0].id;
            }
            renderList();
            renderEditor();
        } else if (d.type === "RESULT") {
            if (d.ok) requestList();
            else alert("操作失败：" + (d.error || "未知错误"));
        }
    });

    function requestList() { post({ type: "REQUEST_LIST" }); }

    function presetModelOptions(preset) {
        var p = preset && PRESETS[preset];
        if (p && p.models && p.models.length > 0) return p.models.slice();
        return null;
    }

    function updatePresetVisibility(preset) {
        var detected = detectPresetByFieldValues();
        var effective = preset || detected || "";
        var cardDs = $("gui-card-deepseek");
        if (cardDs) cardDs.style.display = effective === "deepseek" ? "block" : "none";
        var cardDb = $("gui-card-doubao");
        if (cardDb) cardDb.style.display = effective === "doubao" ? "block" : "none";
        applyPresetTexts(effective);
    }
    function applyPresetTexts(presetKey) {
        var p = (presetKey && PRESETS[presetKey]) ? PRESETS[presetKey] : null;
        function txt(key) { return (p && p[key]) ? p[key] : GENERIC_TEXTS[key]; }
        function setText(selector, key) {
            var el = document.querySelector(selector);
            if (!el) return;
            var v = txt(key);
            if (v != null && v !== "") el.textContent = v;
        }
        function setPlaceholder(id, key) {
            var el = $(id);
            if (!el) return;
            var v = txt(key);
            if (v != null && v !== "") el.placeholder = v;
        }
        setPlaceholder("gui-endpoint", "endpointPlaceholder");
        setPlaceholder("gui-model", "modelPlaceholder");
        setPlaceholder("gui-response-path", "responsePathPlaceholder");
        setText('[data-field="endpoint"] .gui-field-desc', "endpointDesc");
        setText('[data-field="endpoint"] .gui-field-hint', "endpointHint");
        setText('[data-field="model"] .gui-field-desc', "modelDesc");
        setText('[data-field="model"] .gui-field-hint', "modelHint");
        setText('[data-field="systemPrompt"] .gui-field-hint', "systemPromptHint");
        setText('[data-field="responsePath"] .gui-field-desc', "responsePathDesc");
        setText('[data-field="responsePath"] .gui-field-hint', "responsePathHint");
        setText('[data-field="auth"] .gui-field-hint', "authHint");
    }

    function updateModelField(preset, value) {
        var input = $("gui-model");
        var sel = $("gui-model-select");
        var toggle = $("gui-model-toggle");
        if (!input || !sel) return;
        var opts = presetModelOptions(preset);
        if (opts && opts.length > 0) {
            var inList = value && opts.indexOf(value) >= 0;
            if (value && !inList) {
                /* 之前保存过自定义模型名：直接进入"其他"输入框模式 */
                input.style.display = "block";
                input.value = value;
                sel.style.display = "none";
                if (toggle) toggle.style.display = "flex";
                return;
            }
            input.style.display = "none";
            sel.style.display = "block";
            if (toggle) toggle.style.display = "none";
            sel.innerHTML = "";
            opts.forEach(function (o) {
                var op = document.createElement("option");
                op.value = o;
                op.textContent = o;
                sel.appendChild(op);
            });
            /* 追加"其他…"选项 */
            var otherOp = document.createElement("option");
            otherOp.value = "__other__";
            otherOp.textContent = "其他…";
            sel.appendChild(otherOp);
            if (value && opts.indexOf(value) >= 0) sel.value = value;
            else sel.value = opts[0];
        } else {
            sel.style.display = "none";
            input.style.display = "block";
            input.value = value || "";
            if (toggle) toggle.style.display = "none";
        }
        /* 【v0.12.21】切换预设 / 模式后立即刷新必填态，
           避免 model 字段停留在旧的红色状态（required-invalid） */
        try { validateRequired(); } catch (err) {}
    }

    function ensureGuiForm() {
        var el = $("gui-form");
        if (!el || el.dataset.built === "1") return;
        el.dataset.built = "1";
        el.innerHTML = [
            '<div class="gui-card">',
            '  <div class="gui-card-title">通用设置</div>',
            '  <div class="gui-field" data-field="modelPreset"><div class="gui-field-label">预设模型系列<span class="gui-field-var">modelPreset</span></div><select id="gui-preset"><option value="">无</option><option value="deepseek">DeepSeek</option><option value="doubao">Doubao（火山方舟）</option></select><div class="gui-field-desc">指定本方案所适配的模型厂商；不同厂商的字段格式与默认参数由预设注入。</div><div class="gui-field-hint">选一个厂商后，模型名会变成下拉选项、并自动补齐该厂商的默认参数；选「无」则全部手动填写。</div></div>',
            '  <div class="gui-field required" data-field="endpoint"><div class="gui-field-label">API 端点<span class="gui-field-var">endpoint</span><span class="gui-required-mark">*</span></div><input type="text" id="gui-endpoint" placeholder="https://api.deepseek.com/chat/completions"><div class="gui-field-desc">接收 JSON 请求的完整 HTTP(S) URL。</div><div class="gui-field-hint">AI 服务商提供的接口地址。DeepSeek 的是 https://api.deepseek.com/chat/completions。</div></div>',
            '  <div class="gui-field" data-field="method"><div class="gui-field-label">请求方案<span class="gui-field-var">method</span></div><select id="gui-method"><option value="POST">POST</option><option value="GET">GET</option></select><div class="gui-field-desc">HTTP 动词。绝大多数 AI 服务的 Chat Completions 接口需要把提示词写在请求体里，因此使用 POST；仅当端点明确要求 GET（例如某些把参数拼在 URL 上的简易推理接口）时才改用 GET。</div><div class="gui-field-hint">主流 OpenAI 兼容接口都是 POST。只有在服务商文档明确要求 GET 时才切换；不确定就保持默认 POST。</div></div>',
            '  <div class="gui-field required" data-field="auth"><div class="gui-field-label">API Key<span class="gui-field-var">headers.Authorization</span><span class="gui-required-mark">*</span></div><div class="auth-row"><div class="auth-input-wrap"><input type="text" id="gui-auth" placeholder="sk-..."><div class="auth-mask" id="gui-auth-mask"></div></div><button class="auth-eye" id="gui-auth-eye" type="button" title="显示 / 隐藏"><svg class="eye-closed" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg><svg class="eye-open" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div><div class="gui-field-desc">服务商身份验证凭证；脚本会自动补全 Bearer 前缀后写入请求头 Authorization。</div><div class="gui-field-hint">在服务商控制台生成 API Key，直接粘贴即可（脚本会自动补 Bearer 前缀）。</div></div>',
            '  <div class="gui-field required" data-field="model"><div class="gui-field-label">模型名<span class="gui-field-var">model</span><span class="gui-required-mark">*</span></div><div class="model-row"><input type="text" id="gui-model" placeholder="deepseek-flash"><select id="gui-model-select" style="display:none;"></select><button class="model-toggle-btn" id="gui-model-toggle" type="button" title="从预设列表选择" style="display:none;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button></div><div class="gui-field-desc">服务商提供的模型标识符；不同模型对应不同的能力、速度与计费。</div><div class="gui-field-hint">DeepSeek 可选 deepseek-flash（更快更省）或 deepseek-v4-pro（更强更慢）。</div></div>',
            '  <div class="gui-field" data-field="systemPrompt"><div class="gui-field-label">系统提示词<span class="gui-field-var">systemPrompt</span></div><textarea id="gui-system-prompt" placeholder="你是一名答题助手，请回答下面的题目。"></textarea><div class="gui-field-desc">拼接在 messages 数组首位的 system 消息，用于设定模型的角色与整体行为基调。</div><div class="gui-field-hint">注意：这不是完整提示词。脚本每道题还会自动追加一条 user 消息（含题干、选项、答案格式约定）。这里只写角色设定或全局偏好，比如「回答务必简洁」「优先依据中国教材」。</div></div>',
            '  <div class="gui-field required" data-field="responsePath"><div class="gui-field-label">响应提取路径<span class="gui-field-var">responsePath</span><span class="gui-required-mark">*</span></div><input type="text" id="gui-response-path" placeholder="choices.0.message.content"><div class="gui-field-desc">以点号分隔的 JSON 字段路径；脚本按此路径从响应中取纯文本回答。</div><div class="gui-field-hint">告诉脚本「答案藏在响应的哪一层」。OpenAI / DeepSeek 兼容格式统一填 choices.0.message.content。</div></div>',
            '  <div class="gui-field" data-field="temperature"><div class="gui-field-label">温度<span class="gui-field-var">temperature</span></div><input type="number" id="gui-temperature" step="0.1" min="0" max="2" placeholder="0 ~ 2"><div class="gui-field-desc">采样温度，取值 0–2；越低越确定，越高越发散。仅在非思考模式下生效。</div><div class="gui-field-hint">控制回答的「随机性」。答题建议 0 到 1 之间，越低越稳。</div></div>',
            '  <div class="gui-field" data-field="maxTokens"><div class="gui-field-label">最大生成 token<span class="gui-field-var">maxTokens</span></div><input type="number" id="gui-max-tokens" min="1" placeholder="1 ~ 393216"><div class="gui-field-desc">单次响应中 completion 部分的 token 上限，取值范围 1–393216。</div><div class="gui-field-hint">限制 AI 一次最多说多少。8000 左右足够答完一道题，太小会截断，太大浪费配额。</div></div>',
            '  <div class="gui-field" data-field="topP"><div class="gui-field-label">top_p<span class="gui-field-var">topP</span></div><input type="number" id="gui-top-p" step="0.05" min="0" max="1" placeholder="0 ~ 1"><div class="gui-field-desc">nucleus sampling 的累积概率阈值，取值 0–1；仅在思考模式下生效。</div><div class="gui-field-hint">和温度是同类参数，二选一调即可。不调就保持 1。</div></div>',
            '</div>',
            '<div class="gui-card" id="gui-card-deepseek" style="display:none;">',
            '  <div class="gui-card-title">DeepSeek 特化</div>',
            '  <div class="gui-field" data-field="thinking"><div class="gui-field-label">思考模式<span class="gui-field-var">thinking.type</span></div><select id="gui-thinking"><option value="enabled">启用</option><option value="disabled">禁用</option></select><div class="gui-field-desc">控制是否启用思维链推理；对应 DeepSeek 请求体的 thinking.type 字段。</div><div class="gui-field-hint">开启后 AI 先「想一遍」再作答，正确率更高但更慢；关闭则直接作答。</div></div>',
            '  <div class="gui-field" data-field="reasoningEffort"><div class="gui-field-label">思考强度<span class="gui-field-var">reasoning_effort</span></div><select id="gui-reasoning-effort"><option value="low">low</option><option value="high">high</option><option value="max">max</option></select><div class="gui-field-desc">思考模式下的推理深度档位；值越高，模型分配的思维链 token 越多。</div><div class="gui-field-hint">简单题选 low 省时间，复杂推理题选 high 或 max。</div></div>',
            '</div>',
            '<div class="gui-card" id="gui-card-doubao" style="display:none;">',
            '  <div class="gui-card-title">Doubao 特化</div>',
            '  <div class="gui-field" data-field="thinking"><div class="gui-field-label">思考模式<span class="gui-field-var">thinking.type</span></div><select id="gui-doubao-thinking"><option value="enabled">enabled（默认，先思考再回答）</option><option value="disabled">disabled（直接回答）</option><option value="auto">auto（模型自行判断）</option></select><div class="gui-field-desc">控制是否开启深度思考；对应请求体 thinking.type 字段。默认 enabled。</div><div class="gui-field-hint">推理类题目建议 enabled；闲聊/短问题可 disabled 提速。</div></div>',
            '  <div class="gui-field" data-field="reasoningEffort"><div class="gui-field-label">思考强度<span class="gui-field-var">reasoning_effort</span></div><select id="gui-doubao-reasoning-effort"><option value="none">none（关闭思考）</option><option value="minimal">minimal（关闭思考，直接回答）</option><option value="low">low（轻量）</option><option value="medium">medium（均衡）</option><option value="high">high（默认，深度分析）</option><option value="xhigh">xhigh（更强）</option><option value="max">max（最高，适配高难度推理）</option></select><div class="gui-field-desc">思考模式下的推理深度档位；值越高，模型分配的思维链 token 越多。对应 Chat API 的 reasoning_effort 字段。</div><div class="gui-field-hint">简单题选 low 或 medium 省时间；复杂推理题选 high 或以上。thinking 为 disabled 时，本字段仅支持 none / minimal。</div></div>',
            '</div>'
        ].join(String.fromCharCode(10));

        ["gui-endpoint", "gui-auth", "gui-model", "gui-response-path", "gui-model-select"].forEach(function (id) {
            var e = $(id);
            if (!e) return;
            e.addEventListener("input", validateRequired);
            e.addEventListener("change", validateRequired);
        });
        $("gui-preset").addEventListener("change", function () {
            var p = $("gui-preset").value;
            updateModelField(p, "");
            updatePresetVisibility(p);
            try { validateRequired(); } catch (err) {}
        });
        var _ep = $("gui-endpoint");
        if (_ep) _ep.addEventListener("input", function () { updatePresetVisibility($("gui-preset").value); });
        var _md2 = $("gui-model");
        if (_md2) _md2.addEventListener("input", function () { updatePresetVisibility($("gui-preset").value); });
        var _msel2 = $("gui-model-select");
        if (_msel2) _msel2.addEventListener("change", function () {
            if (_msel2.value === "__other__") {
                var inp = $("gui-model");
                var tog = $("gui-model-toggle");
                if (inp) {
                    inp.style.display = "block";
                    inp.value = "";
                    try { inp.focus(); } catch (e) {}
                }
                _msel2.style.display = "none";
                if (tog) tog.style.display = "flex";
            }
            updatePresetVisibility($("gui-preset").value);
            /* 切换选项（尤其是切到"其他…"）后立即刷新必填态 */
            try { validateRequired(); } catch (err) {}
        });
        var _mtog = $("gui-model-toggle");
        if (_mtog) _mtog.addEventListener("click", function (e) {
            e.stopPropagation();
            var preset = $("gui-preset").value;
            var opts = presetModelOptions(preset);
            var input = $("gui-model");
            var sel = $("gui-model-select");
            var toggle = $("gui-model-toggle");
            /* 没有预设时不应看到切换按钮；保险起见切回纯输入框 */
            if (!opts || opts.length === 0) {
                if (toggle) toggle.style.display = "none";
                if (sel) sel.style.display = "none";
                if (input) input.style.display = "block";
                try { validateRequired(); } catch (err) {}
                return;
            }
            var cur = input ? (input.value || "").trim() : "";
            var inList = opts.indexOf(cur) >= 0;

            /* 直接手动切回下拉框模式，不依赖 updateModelField 的 value 语义 */
            if (input) input.style.display = "none";
            if (sel) {
                /* 保证选项已渲染：如果为空，或缺少 "其他…"，则重新填充 */
                var needRebuild = sel.options.length === 0;
                if (!needRebuild) {
                    var hasOther = false;
                    for (var i = 0; i < sel.options.length; i++) {
                        if (sel.options[i].value === "__other__") { hasOther = true; break; }
                    }
                    if (!hasOther) needRebuild = true;
                }
                if (needRebuild) {
                    sel.innerHTML = "";
                    opts.forEach(function (o) {
                        var op = document.createElement("option");
                        op.value = o;
                        op.textContent = o;
                        sel.appendChild(op);
                    });
                    var otherOp = document.createElement("option");
                    otherOp.value = "__other__";
                    otherOp.textContent = "其他…";
                    sel.appendChild(otherOp);
                }
                sel.style.display = "block";
                /* 当前值命中预设则沿用，否则回到默认第一项 */
                if (inList) sel.value = cur;
                else if (sel.options.length > 0) sel.value = opts[0];
            }
            if (toggle) toggle.style.display = "none";

            updatePresetVisibility(preset);
            refreshSaveButtonState();
            /* 切换回下拉框后立即刷新必填态，避免沿用旧的红色状态 */
            try { validateRequired(); } catch (err) {}

            /* 尝试自动展开原生下拉（部分浏览器支持 showPicker） */
            try {
                if (sel && typeof sel.showPicker === "function") {
                    setTimeout(function () {
                        try { sel.showPicker(); } catch (err) {}
                    }, 0);
                }
            } catch (err) {}
        });
        var _eye = $("gui-auth-eye");
        var _mask = $("gui-auth-mask");
        if (_eye && _mask) {
            var _authOpen = false;
            _eye.addEventListener("click", function () {
                _authOpen = !_authOpen;
                _mask.classList.toggle("hidden", _authOpen);
                _eye.classList.toggle("open", _authOpen);
                var ec = _eye.querySelector(".eye-closed");
                var eo = _eye.querySelector(".eye-open");
                if (ec) ec.style.display = _authOpen ? "none" : "block";
                if (eo) eo.style.display = _authOpen ? "block" : "none";
            });
        }
    }

    function renderGuiForm(m) {
        ensureGuiForm();
        var cfg = (m && m.config) || {};
        var headers = cfg.headers || {};
        $("gui-preset").value = cfg.modelPreset || "";
        $("gui-endpoint").value = cfg.endpoint || "";
        $("gui-method").value = cfg.method || "POST";
        $("gui-auth").value = headers.Authorization || headers.authorization || "";
        $("gui-system-prompt").value = cfg.systemPrompt || "";
        $("gui-response-path").value = cfg.responsePath || "";
        $("gui-temperature").value = cfg.temperature != null ? String(cfg.temperature) : "";
        $("gui-max-tokens").value = cfg.maxTokens != null ? String(cfg.maxTokens) : "";
        $("gui-top-p").value = cfg.topP != null ? String(cfg.topP) : "";
        $("gui-thinking").value = cfg.thinking || "enabled";
        $("gui-reasoning-effort").value = cfg.reasoningEffort || "high";
        if ($("gui-doubao-thinking")) $("gui-doubao-thinking").value = cfg.thinking || "enabled";
        if ($("gui-doubao-reasoning-effort")) $("gui-doubao-reasoning-effort").value = cfg.reasoningEffort || "high";
        updateModelField(cfg.modelPreset || "", cfg.model || "");
        updatePresetVisibility(cfg.modelPreset || "");
        validateRequired();
    }

    function validateRequired() {
        var checks = [
            { id: "gui-endpoint", field: "endpoint" },
            { id: "gui-auth", field: "auth" },
            { id: "gui-response-path", field: "responsePath" }
        ];
        checks.forEach(function (c) {
            var e = $(c.id);
            if (!e) return;
            var f = e.closest(".gui-field");
            if (!f) return;
            f.classList.toggle("required-invalid", (e.value || "").trim() === "");
        });
        var modelField = $("gui-model").closest(".gui-field");
        if (modelField) {
            var val = $("gui-model-select").style.display !== "none"
                ? ($("gui-model-select").value || "")
                : ($("gui-model").value || "").trim();
            modelField.classList.toggle("required-invalid", val === "");
        }
    }

    function guiFormToMethodRaw() {
        ensureGuiForm();
        var preset = $("gui-preset").value;
        var auth = $("gui-auth").value.trim();
        var model = $("gui-model-select").style.display !== "none"
            ? $("gui-model-select").value
            : $("gui-model").value.trim();
        var headers = { "Content-Type": "application/json" };
        if (auth) headers.Authorization = auth;
        var cfg = {
            endpoint: $("gui-endpoint").value.trim(),
            method: $("gui-method").value || "POST",
            headers: headers,
            modelPreset: preset,
            model: model,
            systemPrompt: $("gui-system-prompt").value.trim(),
            responsePath: $("gui-response-path").value.trim() || "choices.0.message.content"
        };
        var t = $("gui-temperature").value;
        if (t !== "") { var tn = Number(t); if (Number.isFinite(tn)) cfg.temperature = tn; }
        var mt = $("gui-max-tokens").value;
        if (mt !== "") { var mn = Number(mt); if (Number.isFinite(mn)) cfg.maxTokens = mn; }
        var tp = $("gui-top-p").value;
        if (tp !== "") { var pn = Number(tp); if (Number.isFinite(pn)) cfg.topP = pn; }
        if (preset === "deepseek") {
            cfg.thinking = $("gui-thinking").value;
            cfg.reasoningEffort = $("gui-reasoning-effort").value;
        } else if (preset === "doubao") {
            cfg.thinking = $("gui-doubao-thinking").value || "enabled";
            cfg.reasoningEffort = $("gui-doubao-reasoning-effort").value || "high";
        }
        var id;
        if (_draftMethod && _draftMethod.id) id = _draftMethod.id;
        else {
            var cur = allMethods.find(function (x) { return x.id === selectedId; });
            id = cur ? cur.id : "custom-" + Date.now().toString(36);
        }
        return {
            schemaVersion: "1.0",
            id: id,
            name: $("editor-name").value.trim() || "新方案",
            type: "http",
            description: "",
            config: cfg
        };
    }

    function guiFormToMethod() {
        ensureGuiForm();
        if (!$("gui-endpoint").value.trim()) { alert("API 端点必填"); return null; }
        if (!$("gui-auth").value.trim()) { alert("Authorization 必填"); return null; }
        var model = $("gui-model-select").style.display !== "none"
            ? $("gui-model-select").value
            : $("gui-model").value.trim();
        if (!model) { alert("模型名必填"); return null; }
        if (!$("gui-response-path").value.trim()) { alert("响应提取路径必填"); return null; }
        return guiFormToMethodRaw();
    }

    function createNewMethod(mode) {
        selectedId = null;
        if (mode === "gui") {
            _draftMethod = {
                schemaVersion: "1.0",
                id: "custom-" + Date.now().toString(36),
                name: "新方案",
                type: "http",
                description: "",
                config: {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    modelPreset: ""
                }
            };
            _editMode = "gui";
        } else {
            _draftMethod = {
                schemaVersion: "1.0",
                id: "custom-" + Date.now().toString(36),
                name: "新方案",
                type: "webpage",
                description: "",
                config: { url: "https://example.com/", windowName: "uooc_ai_custom" },
                selectors: { input: "textarea", send: "button[type=submit]", sendScoring: [], response: "div.reply, .message", generatingText: "停止" },
                wait: { readyMs: 15000, responseStableMs: 2000, responseGraceMs: 5000 }
            };
            _editMode = "code";
        }
        $("editor-name").value = _draftMethod.name;
        _savedSnapshot = null;
        renderList();
        renderEditor();
    }

    /* 【v0.12.24】保存按钮状态管理 */
    var _savedSnapshot = null;
    function _currentSnapshot() {
        try {
            if (_editMode === "gui" && _draftMethod && _draftMethod.type === "http") {
                return guiFormToMethodRaw();
            }
            var raw = ($("editor-json").value || "").trim();
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }
    function refreshSaveButtonState() {
        var btn = $("btn-save");
        if (!btn) return;
        var m = allMethods.find(function (x) { return x.id === selectedId; }) || _draftMethod;
        var isDraft = !selectedId && !!_draftMethod;
        var ro = !isDraft && m && !!m.builtin;
        if (ro) {
            btn.classList.remove("saved");
            btn.textContent = "保存";
            return;
        }
        var cur = _currentSnapshot();
        var same = (_savedSnapshot != null && cur != null && JSON.stringify(cur) === JSON.stringify(_savedSnapshot));
        if (same) {
            btn.classList.add("saved");
            btn.disabled = true;
            btn.textContent = "已保存";
        } else {
            btn.classList.remove("saved");
            btn.disabled = false;
            btn.textContent = "保存";
        }
    }
    var _en = $("editor-name");
    if (_en) _en.addEventListener("input", refreshSaveButtonState);
    var _ej = $("editor-json");
    if (_ej) {
        ["input", "keyup", "paste", "cut", "change"].forEach(function (ev) {
            _ej.addEventListener(ev, refreshSaveButtonState, true);
        });
    }
    var _gf = $("gui-form");
    if (_gf) {
        _gf.addEventListener("input", refreshSaveButtonState, true);
        _gf.addEventListener("change", refreshSaveButtonState, true);
    }

    function renderList() {
        var ul = $("list");
        ul.innerHTML = "";
        allMethods.forEach(function (m) {
            var li = document.createElement("li");
            li.className = "method-item" + (m.id === selectedId ? " active" : "");
            var name = document.createElement("div");
            name.className = "method-name";
            name.textContent = m.name || "(未命名)";
            var badge = document.createElement("span");
            badge.className = "badge " + (m.builtin ? "builtin" : "custom");
            badge.textContent = m.builtin ? "内置" : "自定义";
            li.appendChild(name);
            li.appendChild(badge);
            if (m.id === activeId) {
                var act = document.createElement("span");
                act.className = "badge active-badge";
                act.textContent = "使用中";
                li.appendChild(act);
            }
            li.addEventListener("click", function () { selectedId = m.id; _draftMethod = null; renderList(); renderEditor(); });
            ul.appendChild(li);
        });
    }

    function renderEditor() {
        var m = allMethods.find(function (x) { return x.id === selectedId; }) || _draftMethod;
        var hintEl = $("editor-hint");
        var modeToggle = $("mode-toggle");
        var guiFormEl = $("gui-form");
        var codeEditor = $("code-editor");
        var isDraft = !selectedId && !!_draftMethod;

        if (!m) {
            $("editor-name").value = "";
            $("editor-name").readOnly = false;
            $("editor-json").value = "";
            $("editor-json").readOnly = false;
            $("btn-save").disabled = true;
            $("btn-delete").disabled = true;
            if (hintEl) hintEl.textContent = "";
            if (modeToggle) modeToggle.style.display = "none";
            if (guiFormEl) guiFormEl.style.display = "none";
            if (codeEditor) codeEditor.style.display = "flex";
            return;
        }

        $("editor-name").value = m.name || "";
        var ro = !isDraft && !!m.builtin;
        $("editor-name").readOnly = ro;

        var showMode = m.type === "http" && !m.builtin;
        if (modeToggle) modeToggle.style.display = showMode ? "flex" : "none";
        if (!showMode) _editMode = "code";

        if (showMode) {
            var tg = $("mode-tab-gui"); if (tg) tg.classList.toggle("active", _editMode === "gui");
            var tc = $("mode-tab-code"); if (tc) tc.classList.toggle("active", _editMode === "code");
        }

        if (_editMode === "gui" && m.type === "http") {
            if (codeEditor) codeEditor.style.display = "none";
            if (guiFormEl) guiFormEl.style.display = "flex";
            renderGuiForm(m);
        } else {
            if (guiFormEl) guiFormEl.style.display = "none";
            if (codeEditor) codeEditor.style.display = "flex";
            var clone = JSON.parse(JSON.stringify(m));
            delete clone.builtin;
            $("editor-json").value = JSON.stringify(clone, null, 2);
            $("editor-json").readOnly = ro;
        }

        $("btn-delete").disabled = ro || isDraft;
        refreshSaveButtonState();

        if (hintEl) {
            if (m.builtin) hintEl.textContent = "内置方案不可修改或删除。切换「使用中」请回主页面设置面板操作。";
            else if (isDraft) hintEl.textContent = "正在编辑未保存的方案。点「保存」写入 localStorage。";
            else hintEl.textContent = "";
        }
    }

    $("btn-new").addEventListener("click", function (e) {
        e.stopPropagation();
        var menu = $("new-menu");
        if (!menu) return;
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", function () {
        var menu = $("new-menu");
        if (menu) menu.style.display = "none";
    });
    document.querySelectorAll(".new-menu-item").forEach(function (it) {
        it.addEventListener("click", function (e) {
            e.stopPropagation();
            var menu = $("new-menu");
            if (menu) menu.style.display = "none";
            var mode = it.getAttribute("data-mode") || "code";
            createNewMethod(mode);
        });
    });

    $("btn-refresh").addEventListener("click", function () { requestList(); });

    /* ===== 导出 / 导入 方案 ===== */
    $("btn-export").addEventListener("click", function () {
        var customs = allMethods.filter(function (m) { return !m.builtin; });
        if (customs.length === 0) { alert("没有可导出的自定义方案"); return; }
        showConfirmModal({
            title: "合并导出方案",
            body: "即将把 <b>" + customs.length + "</b> 个自定义方案合并为一份 js 文档导出。<br><br>内置方案不参与导出。<br><br><b style='color:#ef5350;'>⚠ 导出文件可能包含 API Key 等敏感信息，请妥善保管，不要随意分享给他人。</b>",
            confirmText: "确定导出",
            cancelText: "取消",
            confirmStyle: "danger",
            onConfirm: function () { _doExportMethods(); }
        });
    });

    $("btn-import").addEventListener("click", function () {
        showConfirmModal({
            title: "导入方案",
            body: "从本地选择一份方案 js 文件，将其中的自定义方案合并到当前列表。<br><br>id 冲突的方案会被覆盖；内置方案不会被导入或覆盖。<br><br><b style='color:#ef5350;'>⚠ 请仅导入您信任来源的文件。恶意文件可能指向不安全的外部端点。</b>",
            confirmText: "选择文件",
            cancelText: "取消",
            confirmStyle: "ok",
            onConfirm: function () { _pickImportFile(); }
        });
    });

    function _escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function _doExportMethods() {
        var customs = allMethods.filter(function (m) { return !m.builtin; });
        if (customs.length === 0) { alert("没有可导出的自定义方案"); return; }
        var now = new Date();
        var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
        var LF = String.fromCharCode(10);
        var header = [
            "// UOOC 学习助手 - AI 方案导出文件",
            "// 导出时间：" + now.toLocaleString("zh-CN", { hour12: false }),
            "// 方案数量：" + customs.length + "（仅自定义方案，不含内置方案）",
            "// ⚠ 本文件可能包含 API Key 等敏感信息，请妥善保管，不要随意分享给他人。",
            "// 使用方法：在 UOOC 学习助手 → 设置 → 智能闯关设置 → 管理 AI 方案 → 导入方案，选择本文件即可。",
            ""
        ].join(LF);
        var payload = {
            version: "1.0",
            exportedAt: now.getTime(),
            methods: customs
        };
        var body = "window.__UOOC_AI_METHODS_EXPORT__ = " + JSON.stringify(payload, null, 2) + ";" + LF;
        var content = header + body;
        try {
            var blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "uooc-ai-methods-" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + ".js";
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                try { document.body.removeChild(a); } catch (e) {}
                try { URL.revokeObjectURL(url); } catch (e) {}
            }, 3000);
        } catch (e) {
            alert("导出失败：" + (e && e.message ? e.message : e));
        }
    }

    function _parseImportFile(text) {
        if (!text) return null;
        try {
            var j = JSON.parse(text);
            if (j && Array.isArray(j.methods)) return j;
            if (Array.isArray(j)) return { methods: j };
        } catch (e) {}
        try {
            var fakeWin = {};
            var LF = String.fromCharCode(10);
            var fn = new Function(
                "window",
                "self",
                "globalThis",
                text + LF + ";return (window && (window.__UOOC_AI_METHODS_EXPORT__ || window.UOOC_AI_METHODS_EXPORT)) || (self && (self.__UOOC_AI_METHODS_EXPORT__ || self.UOOC_AI_METHODS_EXPORT)) || null;"
            );
            var res = fn(fakeWin, fakeWin, fakeWin);
            if (res && Array.isArray(res.methods)) return res;
        } catch (e) {}
        try {
            var braceStart = text.indexOf("{");
            var braceEnd = text.lastIndexOf("}");
            if (braceStart >= 0 && braceEnd > braceStart) {
                var j2 = JSON.parse(text.slice(braceStart, braceEnd + 1));
                if (j2 && Array.isArray(j2.methods)) return j2;
            }
            var brStart = text.indexOf("[");
            var brEnd = text.lastIndexOf("]");
            if (brStart >= 0 && brEnd > brStart) {
                var j3 = JSON.parse(text.slice(brStart, brEnd + 1));
                if (Array.isArray(j3)) return { methods: j3 };
            }
        } catch (e) {}
        return null;
    }

    function _doImportMethods(methods, fileName) {
        var valid = [];
        var skipped = 0;
        methods.forEach(function (m) {
            if (!m || typeof m !== "object") { skipped++; return; }
            if (!m.id || !m.name) { skipped++; return; }
            var id = String(m.id);
            if (id.indexOf("builtin-") === 0) { skipped++; return; }
            if (id.indexOf("custom-") !== 0) id = "custom-" + id;
            var copy;
            try { copy = JSON.parse(JSON.stringify(m)); }
            catch (e) { skipped++; return; }
            copy.id = id;
            copy.builtin = false;
            valid.push(copy);
        });
        if (valid.length === 0) {
            alert("文件中没有可导入的有效方案" + (skipped ? "（已跳过 " + skipped + " 项）" : "") + "。");
            return;
        }
        valid.forEach(function (m) {
            post({ type: "UPSERT", method: m });
        });
        setTimeout(function () {
            requestList();
            alert("已提交导入 " + valid.length + " 个方案" + (skipped ? "，跳过 " + skipped + " 个无效项" : "") + "。" + String.fromCharCode(10, 10) + "列表即将刷新。");
        }, 500);
    }

    function _pickImportFile() {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = ".js,.json,application/javascript,text/javascript,application/json";
        input.style.display = "none";
        input.addEventListener("change", function () {
            var f = input.files && input.files[0];
            if (!f) {
                try { document.body.removeChild(input); } catch (e) {}
                return;
            }
            var reader = new FileReader();
            reader.onload = function () {
                try {
                    var text = String(reader.result || "");
                    var data = _parseImportFile(text);
                    if (!data || !Array.isArray(data.methods) || data.methods.length === 0) {
                        alert("未在文件中找到可导入的方案。" + String.fromCharCode(10, 10) + "请确认选择的是由本管理器导出的 .js 文件。");
                    } else {
                        _doImportMethods(data.methods, f.name);
                    }
                } catch (e) {
                    alert("解析文件失败：" + (e && e.message ? e.message : e));
                }
                try { document.body.removeChild(input); } catch (e) {}
            };
            reader.onerror = function () {
                alert("读取文件失败");
                try { document.body.removeChild(input); } catch (e) {}
            };
            reader.readAsText(f, "utf-8");
        });
        document.body.appendChild(input);
        input.click();
    }

    (function bindModeTabs() {
        function switchTo(target) {
            if (target === _editMode) return;
            if (target === "code") {
                var obj = guiFormToMethodRaw();
                if (obj) {
                    _draftMethod = obj;
                    $("editor-json").value = JSON.stringify(obj, null, 2);
                }
                _editMode = "code";
            } else {
                var raw = $("editor-json").value.trim();
                if (!raw) return;
                var json;
                try { json = JSON.parse(raw); }
                catch (e) { alert("JSON 解析失败：" + e.message); return; }
                if (json.type !== "http") { alert("只有 http 类型支持 GUI 编辑"); return; }
                _draftMethod = json;
                _editMode = "gui";
            }
            renderEditor();
        }
        var tg = $("mode-tab-gui");
        var tc = $("mode-tab-code");
        if (tg) tg.addEventListener("click", function () { switchTo("gui"); });
        if (tc) tc.addEventListener("click", function () { switchTo("code"); });
    })();

    $("btn-save").addEventListener("click", function () {
        var nameVal = $("editor-name").value.trim();
        if (!nameVal) { alert("名称不能为空"); return; }
        var obj;
        if (_editMode === "gui") {
            obj = guiFormToMethod();
            if (!obj) return;
        } else {
            var jsonVal = $("editor-json").value.trim();
            if (!jsonVal) { alert("JSON 不能为空"); return; }
            try { obj = JSON.parse(jsonVal); }
            catch (e) { alert("JSON 解析失败：" + e.message); return; }
        }
        obj.name = nameVal;
        if (obj.builtin) delete obj.builtin;
        _draftMethod = null;
        _savedSnapshot = JSON.parse(JSON.stringify(obj));
        post({ type: "UPSERT", method: obj });
        refreshSaveButtonState();
    });

    var _pendingDeleteId = null;
    var _modalAction = null;

    function showConfirmModal(opts) {
        opts = opts || {};
        var titleEl = $("modal-title");
        var bodyEl = $("modal-body-text");
        var confirmEl = $("modal-confirm");
        var cancelEl = $("modal-cancel");
        if (titleEl) titleEl.textContent = opts.title || "二次确认";
        if (bodyEl) bodyEl.innerHTML = opts.body || "";
        if (confirmEl) {
            confirmEl.textContent = opts.confirmText || "确定";
            confirmEl.className = "modal-btn " + (opts.confirmStyle === "ok" ? "modal-btn-ok" : "modal-btn-danger");
        }
        if (cancelEl) cancelEl.textContent = opts.cancelText || "取消";
        _modalAction = typeof opts.onConfirm === "function" ? opts.onConfirm : null;
        $("modal-overlay").style.display = "flex";
    }

    function hideConfirmModal() {
        $("modal-overlay").style.display = "none";
        _modalAction = null;
    }

    $("btn-delete").addEventListener("click", function () {
        var m = allMethods.find(function (x) { return x.id === selectedId; });
        if (!m) return;
        if (m.builtin) { alert("内置方案不可删除"); return; }
        _pendingDeleteId = m.id;
        showConfirmModal({
            title: "二次确认",
            body: "确定删除方案「<b>" + _escapeHtml(m.name) + "</b>」？此操作不可撤销。",
            confirmText: "确定删除",
            cancelText: "取消",
            confirmStyle: "danger",
            onConfirm: function () {
                var delId = _pendingDeleteId;
                _pendingDeleteId = null;
                if (!delId) return;
                var idx = allMethods.findIndex(function (x) { return x.id === delId; });
                var nextId = null;
                if (idx > 0) nextId = allMethods[idx - 1].id;
                else if (idx >= 0 && idx < allMethods.length - 1) nextId = allMethods[idx + 1].id;
                selectedId = nextId;
                _draftMethod = null;
                _savedSnapshot = null;
                post({ type: "REMOVE", id: delId });
            }
        });
    });
    $("modal-cancel").addEventListener("click", function () {
        _pendingDeleteId = null;
        hideConfirmModal();
    });
    $("modal-confirm").addEventListener("click", function () {
        var action = _modalAction;
        hideConfirmModal();
        if (typeof action === "function") {
            try { action(); }
            catch (e) { console.error("[UOOC-MM] modal action error", e); }
        }
    });

` + renderJS + `
    /* 编辑器叠加层同步 */
    var editorTA = $("editor-json");
    var editorRender = $("editor-render");
    function syncEditorRender() {
        if (!editorTA || !editorRender) return;
        renderCodeTo(editorRender, editorTA.value || "");
        editorRender.scrollTop = editorTA.scrollTop;
        editorRender.scrollLeft = editorTA.scrollLeft;
    }
    if (editorTA && editorRender) {
        editorTA.addEventListener("input", syncEditorRender);
        editorTA.addEventListener("scroll", function () {
            editorRender.scrollTop = editorTA.scrollTop;
            editorRender.scrollLeft = editorTA.scrollLeft;
        });
        (function () {
            var proto = HTMLTextAreaElement.prototype;
            var desc = Object.getOwnPropertyDescriptor(proto, "value");
            if (!desc || !desc.set || !desc.get) return;
            var origSet = desc.set, origGet = desc.get;
            try {
                Object.defineProperty(editorTA, "value", {
                    configurable: true, enumerable: true,
                    get: function () { return origGet.call(this); },
                    set: function (v) { origSet.call(this, v); try { syncEditorRender(); } catch (e) {} }
                });
            } catch (e) {}
        })();
        syncEditorRender();
    }

    var DOC_DATA = [
        { t: "h1", text: "AI 方案语法规范" },
        { t: "p", text: "「<strong>AI 方案</strong>」是一段 JSON 描述，告诉脚本<em>如何与某个 AI 服务交互</em>以获得答案。文档采用的 JSON 格式是 YAML 语法框架的严格子集，与脚本内部的缓存展示风格一致。DeepSeek 网页版是脚本自带的方案，作为示例只读。" },
        { t: "h2", text: "1. 类型总览" },
        { t: "table", head: ["类型", "说明"], rows: [
            ["<code>webpage</code>", "通过网页版 AI（在浏览器窗口里操作 DOM）"],
            ["<code>http</code>", "通过 HTTP API 直接调用"]
        ]},
        { t: "callout", kind: "important", title: "关于 @match", body: "方案类型为 <code>webpage</code> 时，其 <code>config.url</code> 所在域名<strong>必须</strong>出现在用户脚本头部的 <code>@match</code> 列表中。否则脚本无法向该页面注入桥接器，智能答题会中断并提示「AI 桥接器未响应」。详见 §6。" },
        { t: "h2", text: "2. 字段总览" },
        { t: "table", head: ["字段", "类型", "必填", "说明"], rows: [
            ["<code>schemaVersion</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', '固定为 <code>"1.0"</code>'],
            ["<code>id</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "唯一标识，建议 <code>custom-</code> 前缀"],
            ["<code>name</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "显示名称"],
            ["<code>type</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', '<code>"webpage"</code> 或 <code>"http"</code>'],
            ["<code>description</code>", "string", "可选", "描述"],
            ["<code>config</code>", "object", '<span style="color:#ef5350;font-weight:bold">必填</span>', "入口配置"],
            ["<code>selectors</code>", "object", '<span style="color:#ef5350;font-weight:bold">必填</span>', "DOM 选择器（webpage）"],
            ["<code>wait</code>", "object", "可选", "等待时长参数"]
        ]},
        { t: "h2", text: "3. webpage 类型" },
        { t: "h3", text: "3.1 完整示例（DeepSeek 内置方案）" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "builtin-deepseek-web",\\n  "name": "DeepSeek 网页版",\\n  "type": "webpage",\\n  "config": {\\n    "url": "https://chat.deepseek.com/",\\n    "windowName": "uooc_deepseek"\\n  },\\n  "selectors": {\\n    "input": "textarea[placeholder*=\\"给 DeepSeek\\"]",\\n    "send": "[role=\\"button\\"]",\\n    "sendScoring": [\\n      "class:ds-button--circle:+10",\\n      "class:ds-button--primary:+5"\\n    ],\\n    "response": ".ds-assistant-message-main-content",\\n    "generatingText": "停止生成"\\n  },\\n  "wait": {\\n    "readyMs": 15000,\\n    "responseStableMs": 2000,\\n    "responseGraceMs": 5000\\n  }\\n}' },
        { t: "h3", text: "3.2 config" },
        { t: "table", head: ["字段", "类型", "必填", "说明"], rows: [
            ["<code>url</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "AI 服务入口 URL"],
            ["<code>windowName</code>", "string", "可选", "window.open 的 name，用于复用同一窗口"],
            ["<code>systemPrompt</code>", "string", "可选", "角色设定；非空时替代提示词的默认首句，空时使用默认句"]
        ]},
        { t: "callout", kind: "info", title: "systemPrompt 的两种承载方式", body: "<code>webpage</code> 与 <code>http</code> 的 <code>systemPrompt</code> 语义一致（都是角色设定），但传递方式不同：webpage 会把它作为输入提示词的头行；http 会把它作为 <code>messages[0]</code> 的 system 消息发出。两种类型下，<strong>非空</strong>的 systemPrompt 都会<strong>替代</strong>脚本内置的默认首句「你是一名答题助手，请回答下面的题目。」；为空时则使用该默认句。systemPrompt 不影响脚本自动追加的题目信息与答案格式约定。" },
        { t: "h3", text: "3.2.1 config.badge（桥接器徽标）" },
        { t: "p", text: "webpage 类型方案在 AI 网页上会自动显示一枚悬浮徽标，用于提示用户「脚本已注入、桥接器已就绪」。若方案未配置 <code>config.badge</code>，将使用脚本内置的统一默认样式与文案；因此新增任意 webpage 方案时，什么都不写也会自动获得一致的徽标。" },
        { t: "table", head: ["字段", "类型", "默认", "说明"], rows: [
            ["<code>enabled</code>", "boolean", "<code>true</code>", "是否显示徽标。设为 <code>false</code> 完全不渲染"],
            ["<code>titlePrefix</code>", "string", "<code>UOOC 桥接器</code>", "标题前缀"],
            ["<code>title</code>", "string", "方案名", "中间那段标题（默认取方案的 <code>name</code>）"],
            ["<code>loadingText</code>", "string", "<code>已加载（等待主页面）</code>", "未就绪时显示的尾段"],
            ["<code>readyText</code>", "string", "<code>已就绪</code>", "桥接器就绪后显示的尾段"],
            ["<code>loadingBg</code> / <code>loadingFg</code>", "string", "<code>#ffc107</code> / <code>#000000</code>", "未就绪时的背景色 / 文字色"],
            ["<code>readyBg</code> / <code>readyFg</code>", "string", "<code>#2e7d32</code> / <code>#ffffff</code>", "就绪时的背景色 / 文字色"],
            ["<code>position</code>", "string", "<code>top-right</code>", "初始位置：<code>top-right</code> / <code>top-left</code> / <code>bottom-right</code> / <code>bottom-left</code>"],
            ["<code>hideAfterMs</code>", "number", "<code>2500</code>", "就绪后多久自动移除（毫秒）。<code>0</code> 表示永不自动移除"],
            ["<code>readyFadeMs</code>", "number", "<code>1500</code>", "淡出动画时长（在移除前多久开始）"],
            ["<code>draggable</code>", "boolean", "<code>true</code>", "是否允许鼠标 / 触屏拖动徽标。设为 <code>false</code> 则徽标固定不可移动"]
        ]},
        { t: "callout", kind: "info", title: "拖动行为", body: "徽标默认<b>可拖动</b>。按住鼠标左键或触屏手指拖动即可移动徽标；一旦拖动过，就<b>不再自动隐藏</b>，徽标会常驻直到用户刷新 AI 页面。若某个方案不希望徽标可拖（例如徽标挡到页面操作），可将该方案的 <code>config.badge.draggable</code> 设为 <code>false</code>。" },
        { t: "callout", kind: "warn", title: "拖动位置不跨会话保留", body: "徽标当前的位置<b>不会持久化</b>。刷新 AI 窗口后徽标会回到 <code>position</code> 指定的初始位置。若需要跨会话记住拖动后的位置，需在方案层面自行扩展（例如让桥接器把 <code>left/top</code> 写入 <code>localStorage</code>）。" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "custom-example",\\n  "name": "示例方案",\\n  "type": "webpage",\\n  "config": {\\n    "url": "https://example.com/",\\n    "windowName": "uooc_example",\\n    "badge": {\\n      "title": "示例",\\n      "position": "bottom-right",\\n      "draggable": false\\n    }\\n  }\\n}' },
        { t: "h3", text: "3.3 selectors" },
        { t: "table", head: ["字段", "类型", "必填", "说明"], rows: [
            ["<code>input</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "输入框选择器；多个候选用英文逗号分隔"],
            ["<code>send</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "发送按钮选择器"],
            ["<code>sendScoring</code>", "string[]", "可选", "多条候选时的打分规则数组"],
            ["<code>response</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "回复容器选择器；多个候选用逗号分隔"],
            ["<code>generatingText</code>", "string", "可选", "页面出现该文本时视为「生成中」"]
        ]},
        { t: "callout", kind: "info", title: "sendScoring 规则语法", body: '格式：<code>class:类名片段:+分值</code>。示例：<code>"class:ds-button--circle:+10"</code> 表示当按钮的 class 属性包含 <code>ds-button--circle</code> 时加 10 分。系统按分数从高到低挑选一个按钮作为发送按钮。' },
        { t: "h3", text: "3.4 wait" },
        { t: "table", head: ["字段", "类型", "默认", "说明"], rows: [
            ["<code>readyMs</code>", "number", "15000", "等待桥接器就绪的超时（毫秒）"],
            ["<code>responseStableMs</code>", "number", "2000", "回复内容保持稳定多久算「回答完成」"],
            ["<code>responseGraceMs</code>", "number", "5000", "内容已稳定但缺答案标记时，最多再等多久"]
        ]},
        { t: "h2", text: "4. http 类型" },
        { t: "p", text: "http 类型通过标准 HTTP 请求直接调用 AI 服务的 API，<strong>无需打开浏览器窗口</strong>，响应速度与稳定性远优于 webpage 类型。适合具备官方或兼容 OpenAI Chat Completions 接口的服务。" },
        { t: "h3", text: "4.1 字段" },
        { t: "table", head: ["字段", "类型", "必填", "说明"], rows: [
            ["<code>endpoint</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "POST 请求的完整 URL"],
            ["<code>method</code>", "string", "可选", '<code>POST</code> 或 <code>GET</code>，默认 POST'],
            ["<code>headers</code>", "object", '<span style="color:#ef5350;font-weight:bold">必填</span>', "请求头；<code>Authorization</code> 可只写 API Key，脚本会自动补 <code>Bearer </code> 前缀"],
            ["<code>modelPreset</code>", "string", "可选", '预设模型系列；空串表示不启用。<code>"deepseek"</code> 会启用 DeepSeek 专属参数'],
            ["<code>model</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "模型名，例如 <code>deepseek-flash</code>"],
            ["<code>systemPrompt</code>", "string", "可选", "系统消息，作为 messages[0] 的 system content 发送"],
            ["<code>responsePath</code>", "string", '<span style="color:#ef5350;font-weight:bold">必填</span>', "从 JSON 响应中提取纯文本回答的点号路径"],
            ["<code>temperature</code>", "number", "可选", "采样温度，0~2；仅非思考模式生效"],
            ["<code>maxTokens</code>", "number", "可选", "生成上限"],
            ["<code>topP</code>", "number", "可选", "nucleus sampling；仅思考模式生效（0.95~1.0）"],
            ["<code>thinking</code>", "string", "可选", 'DeepSeek 专属：<code>enabled</code> / <code>disabled</code>'],
            ["<code>reasoningEffort</code>", "string", "可选", 'DeepSeek 专属：<code>low</code> / <code>high</code> / <code>max</code>']
        ]},
        { t: "h3", text: "4.2 系统提示词的设计定位" },
        { t: "p", text: "在 GUI 或 JSON 里填写的 <code>systemPrompt</code> <strong>不是完整提示词</strong>，只是 messages 数组的首条 system 消息。真正发给 AI 的消息由两段拼成：" },
        { t: "ul", list: [
            "<code>messages[0]</code>：system 角色 —— 就是你在配置里写的 <code>systemPrompt</code>，用于设定整体角色、语气与全局偏好；一次配置，长期不变。",
            "<code>messages[1]</code>：user 角色 —— 由脚本在每道题开始时通过 <code>buildPrompt()</code> 动态生成，包含题型、题干、选项与「【答案】…」格式约定；每题都不同。"
        ]},
        { t: "callout", kind: "info", title: "为什么 user 段不放进 JSON", body: "答题算法要求 AI 在回答末尾以固定标记输出答案。不同题型的格式约定不同（单选、多选、文本各一套），必须每题动态拼接，无法在 JSON 中预先写死。因此 <code>systemPrompt</code> 只承担「角色设定」这一层职责。" },
        { t: "p", text: "要调整单题格式约定（如换掉【答案】标记），需修改脚本源码中的 <code>buildPrompt()</code>；要在配置文件层面加约束，请写入 <code>systemPrompt</code>。" },
        { t: "h3", text: "4.3 DeepSeek API 最小示例" },
        { t: "p", text: "DeepSeek 官方 API 与 OpenAI Chat Completions 兼容。以下是最小可用配置：" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "custom-deepseek-api",\\n  "name": "DeepSeek API",\\n  "type": "http",\\n  "description": "通过 DeepSeek 官方 API 调用",\\n  "config": {\\n    "endpoint": "https://api.deepseek.com/chat/completions",\\n    "method": "POST",\\n    "headers": {\\n      "Content-Type": "application/json",\\n      "Authorization": "Bearer sk-xxxxxxxxxxxxxxxx"\\n    },\\n    "modelPreset": "deepseek",\\n    "model": "deepseek-flash",\\n    "systemPrompt": "你是一名答题助手，请回答下面的题目。",\\n    "responsePath": "choices.0.message.content",\\n    "temperature": 1,\\n    "maxTokens": 8192,\\n    "thinking": "enabled",\\n    "reasoningEffort": "high"\\n  }\\n}' },
        { t: "callout", kind: "important", title: "必须替换 Authorization", body: "上例中的 <code>Bearer sk-xxxxxxxxxxxxxxxx</code> 需换成你自己的 API Key（在 DeepSeek 控制台的 API Keys 页面生成）。Key 泄露可能导致计费损失，请谨慎保存。" },
        { t: "h3", text: "4.4 Doubao（火山方舟）API 最小示例" },
        { t: "p", text: "火山方舟（Ark）兼容 OpenAI Chat Completions 协议，可用同一套字段接入。以下是最小可用配置：" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "custom-doubao-api",\\n  "name": "Doubao API",\\n  "type": "http",\\n  "description": "通过火山方舟 API 调用 Doubao 系列模型",\\n  "config": {\\n    "endpoint": "https://ark.cn-beijing.volces.com/api/v3/chat/completions",\\n    "method": "POST",\\n    "headers": {\\n      "Content-Type": "application/json",\\n      "Authorization": "Bearer YOUR_ARK_API_KEY"\\n    },\\n    "modelPreset": "doubao",\\n    "model": "doubao-seed-2-1-pro-260915",\\n    "systemPrompt": "你是一名严谨的答题助手，回答务必简洁、直接。",\\n    "responsePath": "choices.0.message.content",\\n    "thinking": "enabled",\\n    "reasoningEffort": "high"\\n  }\\n}' },
        { t: "callout", kind: "important", title: "必须替换 Authorization", body: "上例中的 <code>Bearer YOUR_ARK_API_KEY</code> 需换成你在火山方舟控制台生成的 API Key。响应提取路径必须填 <code>choices.0.message.content</code>；切勿填 <code>reasoning_content</code>（那是思考摘要）。" },
        { t: "h3", text: "4.5 常见错误" },
        { t: "table", head: ["现象", "原因", "处理"], rows: [
            ["<code>HTTP 401</code>", "Authorization 格式错误或 Key 无效", "确认 Key 有效，值形如 <code>Bearer sk-...</code>"],
            ["<code>HTTP 400</code>", "请求体字段非法", "检查 <code>model</code> 是否已开放；<code>max_tokens</code> 是否超上限"],
            ["<code>HTTP 402</code>", "账户余额不足", "前往 DeepSeek 控制台充值"],
            ["<code>HTTP 429</code>", "触发限流", "稍后再试或降低并发"],
            ["提取不到内容", "responsePath 与响应结构不匹配", "先手动 fetch 一次看响应结构，再调整 responsePath"]
        ]},
        { t: "h2", text: "5. 预设模型系列" },
        { t: "p", text: "「<strong>预设模型系列</strong>」是一组内置的字段模板，脚本根据 <code>endpoint</code> 与 <code>model</code> 字段内容自动识别，命中后将统一改写 GUI 中的提示文案、补齐厂商特化参数卡片。预设只影响 <strong>文案展示与参数注入</strong>，不改变方案 JSON 的存储结构；同一份方案 JSON 在未命中任何预设时仍按通用逻辑执行。" },
        { t: "callout", kind: "info", title: "命中规则", body: "依次遍历预设注册表，若 <code>endpoint</code> 或 <code>model</code> 字段包含该预设的任一关键词（不区分大小写）即判定命中；命中多个时以注册表顺序靠前者为准。GUI 中也可以手动从「预设模型系列」下拉框强制指定。" },
        { t: "h3", text: "5.1 预设一览" },
        { t: "table", head: ["预设 key", "显示名", "识别关键词", "默认端点"], rows: [
            ["<code>deepseek</code>", "DeepSeek", "<code>deepseek</code>", "<code>https://api.deepseek.com/chat/completions</code>"],
            ["<code>doubao</code>", "Doubao（火山方舟 / Volcengine）", "<code>doubao</code>、<code>volces</code>、<code>volcengine</code>、<code>ark.cn-beijing</code>", "<code>https://ark.cn-beijing.volces.com/api/v3/chat/completions</code>"]
        ]},
        { t: "h3", text: "5.2 DeepSeek 预设" },
        { t: "p", text: "DeepSeek 官方 API 与 OpenAI Chat Completions 完全兼容，是 http 类型接入的首选示例。命中 <code>deepseek</code> 预设后，GUI 会显示「DeepSeek 特化」卡片，可配置思考模式与思考强度。" },
        { t: "table", head: ["项目", "内容"], rows: [
            ["常用模型", "<code>deepseek-flash</code>（更快更省）、<code>deepseek-v4-pro</code>（更强更慢）"],
            ["端点", "<code>https://api.deepseek.com/chat/completions</code>"],
            ["鉴权", "<code>Authorization: Bearer sk-...</code>（脚本自动补 Bearer 前缀）"],
            ["响应提取路径", "<code>choices.0.message.content</code>"],
            ["特化字段", "<code>thinking.type</code>（enabled / disabled）、<code>reasoning_effort</code>（low / high / max）"]
        ]},
        { t: "p", text: "<strong>特化参数说明：</strong>" },
        { t: "table", head: ["参数", "作用", "推荐值"], rows: [
            ["<code>thinking.type</code>", "开启或关闭思考模式", '<code>enabled</code>（默认）；关闭可显著提速'],
            ["<code>reasoning_effort</code>", "思考强度，越高推理越深但越慢", '<code>high</code>（默认）；客观题可降为 <code>low</code>']
        ]},
        { t: "callout", kind: "info", title: "与答题算法的关联", body: "脚本通过 <code>responsePath</code> 从响应 JSON 中取纯文本答案，因此该字段必须指向最终文本内容。DeepSeek 响应中 <code>choices[0].message.content</code> 是正式回答，<code>choices[0].message.reasoning_content</code> 是思考过程——切勿用后者，否则会把推理过程当答案。" },
        { t: "callout", kind: "info", title: "最小可用方案 JSON", body: "见 §4.3（DeepSeek API 最小示例）。把那段 JSON 复制到方案管理器的代码编辑器里保存即可。" },
        { t: "h3", text: "5.3 Doubao（火山方舟 / Volcengine）预设" },
        { t: "p", text: "火山方舟（Ark）是字节跳动推出的大模型服务平台，旗下 Doubao 系列模型兼容 OpenAI Chat Completions 接口协议。本预设注入的字段与模型能力说明如下。" },
        { t: "callout", kind: "important", title: "鉴权方式", body: "使用 <strong>API Key 鉴权</strong>：在火山方舟控制台 → API Key 管理页面创建 API Key，直接粘贴到方案配置的 API Key 字段即可。脚本会自动补 <code>Bearer </code> 前缀，写入请求头 <code>Authorization</code>。" },
        { t: "p", text: "<strong>常用模型（Model ID）：</strong>" },
        { t: "table", head: ["Model ID", "定位", "备注"], rows: [
            ["<code>doubao-seed-2-1-pro-260915</code>", "旗舰，多模态", "Agent 能力全面升级，支持深度思考；默认 thinking=enabled"],
            ["<code>doubao-seed-2-1-lite-260915</code>", "轻量", "支持深度思考，速度更快，成本更低"],
            ["<code>doubao-seed-2-0-pro-260215</code>", "上一代旗舰", "temperature/top_p 被系统固定为 1 / 0.95"],
            ["<code>doubao-seed-2-0-lite-260215</code>", "上一代轻量", "temperature/top_p 被系统固定为 1 / 0.95"],
            ["<code>doubao-seed-2-0-mini-260215</code>", "极小", "适合简单任务，响应最快"]
        ]},
        { t: "callout", kind: "warn", title: "以控制台为准", body: "上述 Model ID 只是常见版本，官方会持续推出新版本。正式使用前请在<strong>火山方舟控制台 → 模型列表</strong>查询当前账号已开通且可调用的 Model ID，并替换方案里的 <code>model</code> 字段。" },
        { t: "p", text: "<strong>端点与响应提取：</strong>" },
        { t: "table", head: ["项目", "值"], rows: [
            ["Chat Completions 端点", "<code>https://ark.cn-beijing.volces.com/api/v3/chat/completions</code>"],
            ["请求方法", "<code>POST</code>"],
            ["响应提取路径", "<code>choices.0.message.content</code>"],
            ["错误提示字段", "<code>error.code</code>、<code>error.message</code>（HTTP 非 2xx 时返回）"]
        ]},
        { t: "callout", kind: "warn", title: "切勿使用 reasoning_content", body: "开启深度思考后，响应里会出现 <code>choices[0].message.reasoning_content</code> 字段，那是<strong>思考摘要</strong>，不是最终答案。响应提取路径必须填 <code>choices.0.message.content</code>。" },
        { t: "p", text: "<strong>Doubao 特化参数：</strong>" },
        { t: "p", text: "命中 <code>doubao</code> 预设后，方案 GUI 中会出现「Doubao 特化」卡片，可配置以下两项：" },
        { t: "table", head: ["字段", "作用", "取值", "默认"], rows: [
            ["<code>thinking.type</code>", "是否开启深度思考", "<code>enabled</code> / <code>disabled</code> / <code>auto</code>", "<code>enabled</code>"],
            ["<code>reasoning_effort</code>", "思考模式下的推理深度档位", "<code>none</code> / <code>minimal</code> / <code>low</code> / <code>medium</code> / <code>high</code> / <code>xhigh</code> / <code>max</code>", "<code>high</code>"]
        ]},
        { t: "callout", kind: "info", title: "参数联动规则", body: "<code>thinking.type = disabled</code> 时，<code>reasoning_effort</code> 仅支持 <code>none</code> / <code>minimal</code>，其他取值会报错；脚本会在写入请求体时自动将其归并为 <code>thinking: { type: &quot;disabled&quot; }</code>。<code>thinking.type = auto</code> 时由模型自行判断是否思考，仅 Doubao 预设支持。" },
        { t: "p", text: "<strong>最小可用方案 JSON（仅供参考）：</strong>" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "custom-doubao-api",\\n  "name": "Doubao API",\\n  "type": "http",\\n  "description": "通过火山方舟 API 调用 Doubao 系列模型",\\n  "config": {\\n    "endpoint": "https://ark.cn-beijing.volces.com/api/v3/chat/completions",\\n    "method": "POST",\\n    "headers": {\\n      "Content-Type": "application/json",\\n      "Authorization": "Bearer <YOUR_ARK_API_KEY>"\\n    },\\n    "modelPreset": "doubao",\\n    "model": "doubao-seed-2-1-pro-260915",\\n    "systemPrompt": "你是一名严谨的答题助手，回答务必简洁、直接。",\\n    "responsePath": "choices.0.message.content",\\n    "thinking": "enabled",\\n    "reasoningEffort": "high"\\n  }\\n}' },
        { t: "h3", text: "5.4 扩展新预设" },
        { t: "p", text: "如需新增厂商预设（例如 Kimi、通义、Claude API），在方案管理器脚本中扩展 <code>PRESETS</code> 注册表即可。建议每个预设至少提供以下字段：" },
        { t: "ul", list: [
            "<code>name</code>：显示名，用于下拉选项",
            "<code>models</code>：常用 Model ID 数组，GUI 会渲染为下拉选项",
            "<code>detectKeywords</code>：识别关键词数组，命中 <code>endpoint</code> 或 <code>model</code> 任一即触发",
            "<code>endpointPlaceholder</code> / <code>endpointHint</code>：端点输入框的占位符与提示",
            "<code>modelPlaceholder</code> / <code>modelHint</code>：模型名输入框的占位符与提示",
            "<code>responsePathPlaceholder</code> / <code>responsePathHint</code>：响应路径输入框的占位符与提示",
            "<code>authHint</code>：API Key 输入框的提示"
        ]},
        { t: "callout", kind: "info", title: "自定义预设的执行逻辑", body: "若需要向请求体注入非标准的厂商特化参数（例如 Doubao 的 <code>thinking</code>），除了扩展 PRESETS 之外，还需要在 <code>MethodBridge._httpAsk</code> 中增加对应分支。仅新增 PRESETS 条目只影响 GUI 展示，不会自动改变请求体结构。" },
        { t: "h2", text: "6. 修改 @match（关键）" },
        { t: "callout", kind: "important", title: "你很可能需要这一步", body: "使用自定义 <code>webpage</code> 方案时，如果目标域名不在脚本的 <code>@match</code> 列表里，<strong>脚本无法在目标页面注入桥接器</strong>，智能答题会因「AI 桥接器未响应」而失败。" },
        { t: "h3", text: "6.1 当前 @match 列表" },
        { t: "code", text: '// @match        *://www.uooc.net.cn/*\\n// @match        *://uooc.net.cn/*\\n// @match        *://*.uooc.net.cn/*\\n// @match        *://uooc.online/*\\n// @match        *://*.uooc.online/*\\n// @match        *://chat.deepseek.com/*' },
        { t: "h3", text: "6.2 如何添加" },
        { t: "p", text: "在脚本头部（即 <code>// ==UserScript==</code> 与 <code>// ==/UserScript==</code> 之间的部分）追加一行：<code>// @match        *://【AI 网站域名】/*</code>" },
        { t: "p", text: "下面是常见 AI 网页端的建议 @match" },
        { t: "table", head: ["服务", "建议 @match"], rows: [
            ["ChatGPT", "<code>*://chat.openai.com/*</code>、<code>*://chatgpt.com/*</code>"],
            ["Claude", "<code>*://claude.ai/*</code>"],
            ["通义千问", "<code>*://tongyi.aliyun.com/*</code>"],
            ["文心一言", "<code>*://yiyan.baidu.com/*</code>"],
            ["Kimi", "<code>*://kimi.moonshot.cn/*</code>"],
            ["自定义私有部署", "<code>*://你的域名/*</code>"]
        ]},
        { t: "callout", kind: "info", title: "通配符说明", body: "<code>*://*.example.com/*</code> 匹配 example.com 的所有子域，但<strong>不</strong>匹配 example.com 本身。若两者都要，需写两行。修改脚本后需<strong>刷新目标页面</strong>让脚本重新注入。" },
        { t: "h2", text: "7. 常见问题" },
        { t: "qa", list: [
            { q: "保存方案后，如何切换为「使用中」？", a: "回到 UOOC 学习助手面板 → 设置 → 🔐 智能闯关设置 → 「AI 方案」下拉选择。" },
            { q: "选择自定义方案后，智能答题报「AI 桥接器未响应」？", a: "按 §6 检查 <code>@match</code> 是否包含目标域名，并确认已刷新目标页面。" },
            { q: "为什么「思考过程」会被当成答案返回？", a: "<code>selectors.response</code> 需精确指向<strong>正式回答容器</strong>，避免匹配到思考过程的 DOM。DeepSeek 内置方案已处理好这一点。" },
            { q: "怎样让发送按钮更精准？", a: "用浏览器 DevTools 复制按钮的选择器，填入 <code>selectors.send</code>；若页面有多个候选，用 <code>sendScoring</code> 打分。" },
            { q: "修改内置方案会怎样？", a: "内置方案只读，只能查看。如需定制，请复制其 JSON，修改 <code>id</code>（建议 <code>custom-</code> 前缀），另存为新方案。" }
        ]},
        { t: "h2", text: "8. 完整实例集" },
        { t: "h3", text: "8.1 基于内置方案定制" },
        { t: "p", text: "内置方案只读。定制时先复制内置 JSON，改 <code>id</code>（加 <code>custom-</code> 前缀）、改 <code>windowName</code>（避免与内置方案复用同一窗口），再保存为新方案。" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "custom-deepseek-v2",\\n  "name": "DeepSeek 网页版（定制）",\\n  "type": "webpage",\\n  "config": {\\n    "url": "https://chat.deepseek.com/",\\n    "windowName": "uooc_deepseek_custom"\\n  },\\n  "selectors": {\\n    "input": "textarea[placeholder*=\\"给 DeepSeek\\"], textarea",\\n    "send": "[role=\\"button\\"]",\\n    "sendScoring": [\\n      "class:ds-button--circle:+10",\\n      "class:ds-button--primary:+5"\\n    ],\\n    "response": ".ds-assistant-message-main-content",\\n    "generatingText": "停止生成"\\n  },\\n  "wait": {\\n    "readyMs": 30000,\\n    "responseStableMs": 2500,\\n    "responseGraceMs": 20000\\n  }\\n}' },
        { t: "h3", text: "8.2 接入 Claude 网页版" },
        { t: "p", text: "Claude 的输入框是 contenteditable 的 div，发送按钮有 aria-label，回答容器带 data-testid。以下是一个可工作的起点。" },
        { t: "code", text: '{\\n  "schemaVersion": "1.0",\\n  "id": "custom-claude-web",\\n  "name": "Claude 网页版",\\n  "type": "webpage",\\n  "config": {\\n    "url": "https://claude.ai/",\\n    "windowName": "uooc_claude"\\n  },\\n  "selectors": {\\n    "input": "div[contenteditable=\\"true\\"]",\\n    "send": "button[aria-label*=\\"Send\\"]",\\n    "response": "div[data-testid=\\"chat-message-content\\"]",\\n    "generatingText": "Stop generating"\\n  },\\n  "wait": {\\n    "readyMs": 30000,\\n    "responseStableMs": 2500,\\n    "responseGraceMs": 20000\\n  }\\n}' },
        { t: "callout", kind: "important", title: "必须同步修改 @match", body: "使用上例前，请在脚本头部加入 <code>// @match        *://claude.ai/*</code>，并刷新 Claude 页面让脚本重新注入。否则会因桥接器未注入而报「AI 桥接器未响应」。" },
        { t: "h2", text: "9. 调试手册" },
        { t: "h3", text: "9.1 正常流程的信号序列" },
        { t: "ol", list: [
            "主页面日志：「等待 AI 桥接器就绪（上限 30 秒）…」",
            "AI 窗口右上角出现黄色徽章：「UOOC 桥接器 已加载（等待主页面）」",
            "主页面日志：「AI 桥接器已就绪」",
            "AI 窗口徽章变绿后淡出",
            "主页面日志：「等待响应…（5s / 30s）」出现，代表心跳正常",
            "逐题询问时日志出现「询问 AI：…」「💾 答案已写入缓存」"
        ]},
        { t: "h3", text: "9.2 常见故障对照表" },
        { t: "table", head: ["现象", "诊断", "处理"], rows: [
            ["AI 徽章始终黄色", "桥接器已加载但未收到主页面消息", "检查主页面是否曾打开该 AI 窗口；控制台看 postMessage 是否被浏览器拦截"],
            ["主页面报「AI 桥接器未响应」", "目标域名不在 @match，或 AI 页面未刷新", "按 §5 补 @match；刷新目标页面；确认 popup 未跳转到非白名单域名"],
            ["返回文本包含「思考过程」", "selectors.response 误匹配", "改为精确定位正式回答容器，避免匹配到思考过程的 DOM"],
            ["发送按钮点不到", "send 选择器命中多个、或命中了隐藏按钮", "用 sendScoring 打分；确保可见且位于底部的按钮分数最高"],
            ["回答被截断", "responseStableMs 太短", "增大到 3000~4000ms；同时把 responseGraceMs 提高到 30000"],
            ["【答案】标记缺失", "_extractAnswerSegment 严格化后无标记即失败", "提示词要求模型把「【答案】…」放在整个回答的最后一行；或把 responseGraceMs 调大"]
        ]},
        { t: "h2", text: "10. 术语表" },
        { t: "table", head: ["术语", "含义"], rows: [
            ["<strong>MethodDescriptor</strong>", "方案描述对象，即保存的那段 JSON"],
            ["<strong>MethodBridge</strong>", "主页面侧客户端，负责 open / popup / postMessage / ask"],
            ["<strong>桥接器（Bridge）</strong>", "注入到 AI 页面里的脚本片段，负责 DOM 操作"],
            ["<strong>CONFIG 消息</strong>", "主 → AI，下发 selectors / wait 参数"],
            ["<strong>ASK 消息</strong>", "主 → AI，下发题目提示词"],
            ["<strong>ANSWER 消息</strong>", "AI → 主，回传回答全文或错误"],
            ["<strong>sendScoring</strong>", "发送按钮的打分规则数组，格式 class:片段:+分"],
            ["<strong>responseStableMs</strong>", "回答内容保持稳定多久算完成"],
            ["<strong>responseGraceMs</strong>", "已稳定但缺【答案】标记时，最多再等多久"]
        ]}
    ];

    var tocCtl = makeDocTocController({
        docBodyId: "doc-body",
        tocListId: "toc-list",
        docContentId: "doc-content"
    });

    document.querySelectorAll(".tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            var view = tab.dataset.view;
            document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t === tab); });
            $("view-manage").style.display = view === "manage" ? "grid" : "none";
            var doc = $("view-doc");
            if (doc) doc.classList.toggle("active", view === "doc");
            document.querySelector(".toolbar").style.display = view === "manage" ? "flex" : "none";
            if (view === "doc") tocCtl.build(DOC_DATA);
        });
    });

    var tocBtn = $("btn-toc");
    if (tocBtn) tocBtn.addEventListener("click", function () { $("view-doc").classList.toggle("toc-open"); });

    requestList();
    _connectTimeout = setTimeout(function () {
        if (allMethods.length === 0 && (!window.opener || window.opener.closed)) {
            document.body.innerHTML = '<div class="empty-hint" style="height:100vh;">无法连接到主页面，请从 UOOC 学习助手重新打开本页面</div>';
        }
    }, 10000);
})();
<\/script>
</body>
</html>`;
        return html;
    }

    /* ============================================================
     * 【代码改动应用器 HTML】文档查看器与 AI 方案管理器一致
     * ============================================================ */
    function _buildPatcherHtml() {
        // 【重要】本函数体内任何模板字面量若需输出换行，必须用 String.fromCharCode(10)，
        // 禁止写裸的 \n 或真换行——单个 \n 会被外层模板字面量解释成真换行，
        // 落入内嵌 <script> 的字符串字面量后导致 SyntaxError（脚本曾因此瘫痪，见顶部注释【二】L 条）
        var css = _commonManagerCss();
        var renderJS = _commonRenderJS();
        var consoleHook = _commonConsoleHook("patcher");
        var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>代码改动应用器</title>\n<script>\n' + consoleHook + '\n<\/script>\n<style>\n' + css + `
.grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 6px; padding: 6px; min-height: 0; }
@media (max-width: 700px) and (orientation: portrait) {
    .grid { grid-template-columns: 1fr; grid-template-rows: repeat(4, minmax(160px, 1fr)); overflow-y: auto; }
}
.pane { display: flex; flex-direction: column; background: #161b22; border: 1px solid #21262d; border-radius: 6px; overflow: hidden; min-height: 0; user-select: none; }
.pane-body { flex: 1; position: relative; display: flex; min-height: 0; }
.paste-btn { position: absolute; left: 10px; top: 50%; right: 10px; bottom: 10px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 6px; background: rgba(30,37,46,0.92); border: 2px dashed #3a4a56; border-radius: 8px; color: #90a4ae; font-size: 11px; font-weight: bold; font-family: inherit; cursor: pointer; transition: background .15s, border-color .15s, color .15s; z-index: 2; }
.paste-btn:hover { background: rgba(45,54,64,0.96); border-color: #4dd0e1; color: #4dd0e1; }
.paste-btn::before { content: "\u{1F4CB}"; font-size: 18px; line-height: 1; }
.pane-head { flex: 0 0 auto; padding: 6px 12px; background: #1c2128; border-bottom: 1px solid #21262d; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #4dd0e1; }
.badge { font-size: 11px; font-weight: normal; padding: 1px 6px; border-radius: 3px; background: #2d333b; color: #90a4ae; }
.hint { font-size: 11px; color: #6e7681; font-weight: normal; }
textarea, pre, .report-body { flex: 1; background: #0d1117; color: #e6e6e6; border: none; outline: none; resize: none; padding: 8px 12px; font-family: "JetBrains Mono","Consolas","Monaco",monospace; font-size: 12px; line-height: 1.55; overflow: auto; margin: 0; white-space: pre; user-select: text; -webkit-user-select: text; }
.report-body { font-family: "Consolas",monospace; user-select: text; -webkit-user-select: text; }
.rep-item { padding: 2px 0; word-break: break-all; }
.rep-item.ok { color: #66bb6a; }
.rep-item.err { color: #ef5350; }
.rep-item.warn { color: #ffa726; }
.rep-item.info { color: #90a4ae; }
.rep-preview { color: #ef5350; font-size: 11px; padding: 4px 10px; margin: 2px 0; white-space: pre-wrap; background: rgba(239,83,80,0.08); border-left: 3px solid #ef5350; border-radius: 3px; }
</style>
</head>
<body>
<div class="header">
    <h1>🔧 代码改动应用器</h1>
    <div class="tabs">
        <div class="tab active" data-view="manage">操作</div>
        <div class="tab" data-view="doc">文档</div>
    </div>
    <div class="toolbar">
        <button id="btnApply" title="应用改动"><span class="btn-icon">▶</span><span class="btn-text">应用改动</span></button>
        <button id="btnCopy" class="sec" title="复制结果"><span class="btn-icon">📋</span><span class="btn-text">复制结果</span></button>
        <button id="btnDownload" class="sec" title="下载"><span class="btn-icon">💾</span><span class="btn-text">下载</span></button>
        <button id="btnClear" class="warn" title="清空"><span class="btn-icon">🗑</span><span class="btn-text">清空</span></button>
    </div>
</div>
<div class="grid" id="view-manage">
    <div class="pane">
        <div class="pane-head"><span>📄 旧代码</span><span class="badge" id="oldBadge">0 字符 / 0 行</span></div>
        <div class="pane-body">
            <textarea id="oldCode" spellcheck="false" placeholder="在此粘贴旧代码..."></textarea>
            <button class="paste-btn" id="btnPasteOld" type="button">从剪切板粘贴</button>
        </div>
    </div>
    <div class="pane">
        <div class="pane-head"><span>✅ 新代码</span><span class="badge" id="newBadge">等待应用</span></div>
        <pre id="newCode" spellcheck="false"></pre>
    </div>
    <div class="pane">
        <div class="pane-head"><span>📝 改动点</span><span class="hint">标记：<span id="tagName">@DESC@ / @FIND@ / @REPLACE@ / @END@</span></span></div>
        <div class="pane-body">
            <textarea id="changes" spellcheck="false" placeholder="在此填写改动点"></textarea>
            <button class="paste-btn" id="btnPasteChanges" type="button">从剪切板粘贴</button>
        </div>
    </div>
    <div class="pane">
        <div class="pane-head"><span>📊 报告</span><span class="badge" id="repBadge">—</span></div>
        <div class="report-body" id="report"></div>
    </div>
</div>
<div class="view-doc" id="view-doc">
    <button class="toc-btn" id="btn-toc" title="展开 / 关闭目录" aria-label="目录">
        <svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="5" x2="19" y2="19"/>
            <line x1="19" y1="5" x2="5" y2="19"/>
        </svg>
    </button>
    <nav class="toc-panel">
        <ul class="toc-list" id="toc-list"></ul>
    </nav>
    <div class="doc-body" id="doc-body">
        <div class="doc" id="doc-content"></div>
    </div>
</div>
<script>
(function () {
    "use strict";
    var $ = function (id) { return document.getElementById(id); };
    // 用动态拼接避免源码里出现连续三个 # （应用器自身改动点也使用该约定）
    var H = "\\u0023";
    var T = H + H + H;
    var TAG_DESC    = T + "DESC"    + T;
    var TAG_FIND    = T + "FIND"    + T;
    var TAG_REPLACE = T + "REPLACE" + T;
    var TAG_END     = T + "END"     + T;

    function normalizeSmartPunctuation(s) {
        if (s == null) return { text: "", count: 0 };
        var original = String(s);
        var out = original
            .replace(/[\u201C\u201D\u201E\u201F\uFF02]/g, '"')
            .replace(/[\u2018\u2019\u201A\u201B\uFF07]/g, "'");
        var count = 0;
        for (var j = 0; j < original.length; j++) {
            var c = original.charCodeAt(j);
            if (c === 0x201C || c === 0x201D || c === 0x201E || c === 0x201F || c === 0xFF02 ||
                c === 0x2018 || c === 0x2019 || c === 0x201A || c === 0x201B || c === 0xFF07) {
                count++;
            }
        }
        return { text: out, count: count };
    }
    function parseChanges(text) {
        var changes = [];
        if (!text) return changes;
        var blocks = text.split(TAG_END);
        for (var i = 0; i < blocks.length; i++) {
            var raw = blocks[i];
            if (!raw || !raw.trim()) continue;
            var findIdx = raw.indexOf(TAG_FIND);
            var repIdx  = raw.indexOf(TAG_REPLACE);
            if (findIdx === -1 || repIdx === -1) continue;
            if (repIdx < findIdx) continue;
            var desc = "";
            var head = raw.substring(0, findIdx);
            var dMatch = head.match(new RegExp(TAG_DESC.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&") + "[ \\\\t]*([^\\\\n\\\\r]*)"));
            if (dMatch) desc = dMatch[1].trim();
            var findText = raw.substring(findIdx + TAG_FIND.length, repIdx);
            var replaceText = raw.substring(repIdx + TAG_REPLACE.length);
            findText = stripOuterNewline(findText);
            replaceText = stripOuterNewline(replaceText);
            var nFind = normalizeSmartPunctuation(findText);
            var nRep  = normalizeSmartPunctuation(replaceText);
            changes.push({ desc: desc, find: nFind.text, replace: nRep.text, normalized: nFind.count + nRep.count });
        }
        return changes;
    }
    function stripOuterNewline(s) {
        if (s == null) return "";
        s = s.replace(/^(?:\\r\\n|\\n|\\r)/, "");
        s = s.replace(/(?:\\r\\n|\\n|\\r)$/, "");
        return s;
    }
    function validateJS(code) {
        if (!code || !code.trim()) return { ok: true };
        try {
            new Function(code);
            return { ok: true };
        } catch (e) {
            var isSyn = (e && e.name === "SyntaxError") || (e instanceof SyntaxError);
            if (!isSyn) return { ok: true };
            var line = 0, col = 0;
            var stack = String(e.stack || "");
            var m = stack.match(/<anonymous>:(\\d+):(\\d+)/);
            if (m) { line = parseInt(m[1], 10); col = parseInt(m[2], 10); }
            return { ok: false, line: line, col: col, message: String(e.message || e) };
        }
    }
    function previewAroundLine(code, lineNo, radius) {
        if (!lineNo || lineNo < 1) return "";
        var lines = code.split(/\\r?\\n/);
        var start = Math.max(1, lineNo - (radius || 3));
        var end = Math.min(lines.length, lineNo + (radius || 3));
        var out = [];
        for (var i = start; i <= end; i++) {
            var marker = (i === lineNo) ? "\\u25b6 " : "  ";
            var content = String(lines[i - 1] == null ? "" : lines[i - 1]);
            if (content.length > 140) content = content.slice(0, 140) + "\\u2026";
            out.push(marker + i + " \\u2502 " + content);
        }
        return out.join("\\n");
    }
    function applyChanges() {
        var oldCode = $("oldCode").value;
        var changesRaw = $("changes").value;
        var reportEl = $("report");
        var newEl = $("newCode");
        reportEl.innerHTML = "";
        newEl.textContent = "";
        if (!oldCode) { addRep("err", "❌ 旧代码为空。"); setBadge("newBadge", "无输出"); return; }
        if (!changesRaw.trim()) { addRep("err", "❌ 改动点为空。"); setBadge("newBadge", "无输出"); return; }
        var changes = parseChanges(changesRaw);
        if (changes.length === 0) { addRep("err", "❌ 未解析到任何改动。"); setBadge("newBadge", "无输出"); return; }
        var _totalNorm = 0;
        for (var _ni = 0; _ni < changes.length; _ni++) {
            if (changes[_ni] && changes[_ni].normalized) _totalNorm += changes[_ni].normalized;
        }
        addRep("info", "📋 共 " + changes.length + " 处改动，开始应用...");
        if (_totalNorm > 0) {
            addRep("info", "🔤 已自动规范化 " + _totalNorm + " 个智能标点字符（弯引号 → ASCII 引号）");
        }
        var code = oldCode, ok = 0, warn = 0, err = 0;
        changes.forEach(function (ch, i) {
            var idx = i + 1, name = ch.desc ? "（" + ch.desc + "）" : "";
            if (!ch.find) { err++; addRep("err", "[" + idx + "] ❌ FIND 为空" + name); return; }
            var count = 0, scanFrom = 0, firstPos = -1;
            while (true) {
                var p = code.indexOf(ch.find, scanFrom);
                if (p === -1) break;
                if (firstPos === -1) firstPos = p;
                count++; scanFrom = p + ch.find.length;
                if (count >= 2) break;
            }
            if (count === 0) { err++; addRep("err", "[" + idx + "] ❌ 未找到" + name); addRep("preview", previewLines(ch.find)); return; }
            if (count > 1) { warn++; addRep("warn", "[" + idx + "] ⚠ 多处匹配" + name); }
            else { ok++; addRep("ok", "[" + idx + "] ✅ " + name); }
            code = code.substring(0, firstPos) + ch.replace + code.substring(firstPos + ch.find.length);
        });
        newEl.textContent = code;
        setBadge("newBadge", code.length + " 字符 / " + countLines(code) + " 行");
        var _repText = "成功 " + ok + " / 警告 " + warn + " / 失败 " + err;
        var _repEl = $("repBadge");
        var _syntax = validateJS(code);
        if (!_syntax.ok) {
            addRep("err", "\\u274c 语法错误：新代码无法通过 JavaScript 解析");
            addRep("err", "   " + _syntax.message);
            if (_syntax.line > 0) {
                addRep("err", "   位置：第 " + _syntax.line + " 行" + (_syntax.col > 0 ? " 第 " + _syntax.col + " 列" : ""));
                addRep("preview", previewAroundLine(code, _syntax.line, 3));
            }
            _repText += " \\u00b7 语法错误";
            if (_repEl) _repEl.style.color = "#ef5350";
        } else if (err > 0) {
            if (_repEl) _repEl.style.color = "#ef5350";
        } else if (warn > 0) {
            if (_repEl) _repEl.style.color = "#ffa726";
        } else {
            if (_repEl) _repEl.style.color = "#66bb6a";
        }
        setBadge("repBadge", _repText);
    }
    function previewLines(s) {
        return s.split(/\\r?\\n/).slice(0, 3).map(function (l) { return "  │ " + (l.length > 100 ? l.slice(0, 100) + "…" : l); }).join("\\n");
    }
    function countLines(s) { return s ? s.split(/\\r?\\n/).length : 0; }
    function addRep(type, msg) {
        var el = document.createElement("div");
        el.className = (type === "preview") ? "rep-preview" : ("rep-item " + type);
        el.textContent = msg;
        $("report").appendChild(el);
        $("report").scrollTop = $("report").scrollHeight;
    }
    function setBadge(id, text) { var el = $(id); if (el) el.textContent = text; }
    function copyOutput() {
        var t = $("newCode").textContent;
        if (!t) { alert("暂无内容"); return; }
        navigator.clipboard ? navigator.clipboard.writeText(t).then(function () { flash("已复制"); }, function () { fallbackCopy(t); }) : fallbackCopy(t);
    }
    function fallbackCopy(t) {
        var ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); flash("已复制"); } catch (e) { alert("复制失败"); }
        document.body.removeChild(ta);
    }
    function flash(msg) { var b = $("repBadge"); var o = b.textContent; b.textContent = msg; b.style.color = "#66bb6a"; setTimeout(function () { b.textContent = o; b.style.color = ""; }, 1500); }
    function downloadOutput() {
        var t = $("newCode").textContent;
        if (!t) { alert("暂无内容"); return; }
        var blob = new Blob([t], { type: "text/plain;charset=utf-8" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "new_code.txt";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    }
    function clearAll() {
        if (!confirm("确定清空？")) return;
        $("oldCode").value = ""; $("changes").value = ""; $("newCode").textContent = ""; $("report").innerHTML = "";
        updateBadge(); setBadge("newBadge", "等待应用"); setBadge("repBadge", "—");
    }
    function updateBadge() { var s = $("oldCode").value; setBadge("oldBadge", s.length + " 字符 / " + countLines(s) + " 行"); }

    // 顶部提示：实际使用的分隔符（用户阅读用）
    $("tagName").textContent = T + "DESC" + T + " / " + TAG_FIND + " / " + TAG_REPLACE + " / " + TAG_END;
    $("changes").placeholder = TAG_DESC + " 说明\\n" + TAG_FIND + "\\n原文\\n" + TAG_REPLACE + "\\n新文\\n" + TAG_END;

    $("btnApply").addEventListener("click", applyChanges);
    $("btnCopy").addEventListener("click", copyOutput);
    $("btnDownload").addEventListener("click", downloadOutput);
    $("btnClear").addEventListener("click", clearAll);
    $("oldCode").addEventListener("input", updateBadge);

    (function bindPasteButtons() {
        function _bind(btnId, taId) {
            var btn = $(btnId);
            var ta = $(taId);
            if (!btn || !ta) return;
            function updateVisibility() {
                btn.style.display = ta.value ? "none" : "flex";
            }
            ta.addEventListener("input", updateVisibility);
            btn.addEventListener("click", function () {
                if (!navigator.clipboard || !navigator.clipboard.readText) {
                    alert("当前浏览器不支持读取剪切板，请手动粘贴。");
                    return;
                }
                navigator.clipboard.readText().then(function (text) {
                    if (!text) { alert("剪切板为空。"); return; }
                    ta.value = text;
                    ta.dispatchEvent(new Event("input", { bubbles: true }));
                    updateVisibility();
                }, function (err) {
                    alert("读取剪切板失败：" + (err && err.message ? err.message : err) + "。请确认页面处于聚焦状态，并已授予剪切板权限。");
                });
            });
            updateVisibility();
        }
        _bind("btnPasteOld", "oldCode");
        _bind("btnPasteChanges", "changes");
    })();
    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); applyChanges(); }
    });
    ["oldCode", "changes"].forEach(function (id) {
        $(id).addEventListener("keydown", function (e) {
            if (e.key === "Tab") {
                e.preventDefault();
                var ta = e.target, s = ta.selectionStart, en = ta.selectionEnd;
                ta.value = ta.value.substring(0, s) + "    " + ta.value.substring(en);
                ta.selectionStart = ta.selectionEnd = s + 4;
            }
        });
    });

` + renderJS + `
    var DOC_DATA = [
        { t: "h1", text: "代码改动应用器 · 格式说明" },
        { t: "p", text: "应用器用于<strong>批量修改脚本文本</strong>。把「旧代码」与「改动点」提供给应用器，它按改动点逐块查找替换，输出「新代码」。" },
        { t: "callout", kind: "info", title: "应用器的作用", body: "当目标页面因版本更新导致<strong>元素布局发生改动</strong>（选择器失效、DOM 层级调整等），可将脚本源码与新页面的 <code>outerHTML</code>（通过主面板设置页的「复制当前页 outerHTML」获取）一并发送给 AI，请其协助修改。<strong>AI 只需输出改动点</strong>（<code>###FIND###</code> / <code>###REPLACE###</code> 块），不必输出完整脚本——大幅降低 AI 输出长度、减少出错概率，也便于人工逐块审查。" },
        { t: "callout", kind: "important", title: "典型用法", body: "把旧脚本粘到「📄 旧代码」、AI 给出的改动点粘到「📝 改动点」，点「▶ 应用改动」生成「✅ 新代码」，复制回脚本编辑器即可。" },
        { t: "h2", text: "1. 工作流" },
        { t: "ol", list: [
            "把要修改的脚本完整粘贴到左上角 <code>📄 旧代码</code>。",
            "在左下角 <code>📝 改动点</code> 填入若干改动块。",
            "点顶部 <code>▶ 应用改动</code>（或按 <code>Ctrl+Enter</code>）。",
            "查看右下角 <code>📊 报告</code>，确认结果。",
            "点 <code>📋 复制结果</code> 把新代码复制回脚本。"
        ]},
        { t: "h2", text: "2. 改动点格式" },
        { t: "p", text: "每块由 4 个标记组成（<code>DESC</code> 可选）：" },
        { t: "code", text: '###DESC### 可选，简短说明本块做什么\\n###FIND###\\n需要被替换的原始代码（必须与「旧代码」完全一致）\\n###REPLACE###\\n替换后的新代码\\n###END###' },
        { t: "table", head: ["标记", "含义"], rows: [
            ["<code>###DESC###</code>", "可选。写在 FIND 之前的任意位置，用于人类阅读。只能是单行。"],
            ["<code>###FIND###</code>", "必填。要被替换的原文。"],
            ["<code>###REPLACE###</code>", "必填。替换后的新文。"],
            ["<code>###END###</code>", "必填。标记本块结束。"]
        ]},
        { t: "h2", text: "3. 匹配规则" },
        { t: "ul", list: [
            "精确字符串匹配：<strong>区分大小写</strong>、<strong>区分空白</strong>（空格 / Tab / 换行必须一致）。",
            "每块只替换<strong>第一个</strong>匹配；同一文本出现多处时报告区会给出「⚠ 多处匹配」警告。",
            "匹配失败<strong>不会中断</strong>其他改动块，报告区会显示 FIND 内容前三行供排查。",
            "FIND / REPLACE 内容可包含反引号、美元符号、模板字符串等特殊字符。"
        ]},
        { t: "callout", kind: "important", title: "必须与旧代码完全一致", body: "FIND 必须与「旧代码」<strong>逐字符一致</strong>（含缩进、空行、换行符）。建议直接从旧代码中<strong>复制粘贴</strong>，不要手敲。" },
        { t: "callout", kind: "warn", title: "分隔符说明", body: "为避免歧义，三个井号是改动块的分隔符。若必须在 FIND/REPLACE 中插入三个连续的井号，请先把它拆成两份字符串拼接，或在源码里用 Unicode 转义 \\\\u0023 表达。" },
        { t: "h2", text: "4. 常见错误与排查" },
        { t: "table", head: ["现象", "原因", "处理"], rows: [
            ["报告「❌ 未找到」", "FIND 与旧代码不完全一致", "从旧代码重新复制 FIND；检查是否混入全角字符"],
            ["报告「⚠ 多处匹配」", "同一文本出现多次", "在 FIND 中前后各加一行上下文让它唯一"],
            ["新代码缺了某段", "FIND 内容尾部被吃掉", "检查 FIND 尾部是否少复制了换行符"],
            ["报错后其他块也失败", "改动块之间相互影响", "把相互影响的改动合并成一个块，或分两步应用"]
        ]},
                { t: "h2", text: "5. FIND 匹配失败与语法错误的成因与规避" },
        { t: "callout", kind: "warn", title: "核心问题", body: "应用器只执行字符串查找替换，不进行语义分析。当 FIND 与旧代码存在字符级差异时匹配失败；当 REPLACE 生成的代码无法被 JavaScript 解析时，会在目标页面抛出 SyntaxError。本章列出常见成因、判定方法与规避策略。" },
        { t: "h3", text: "5.1 FIND 的采集来源" },
        { t: "p", text: "FIND 必须与旧代码逐字符一致。确保字符级一致性的前提，是让 FIND 与旧代码来自同一个文本通道。" },
        { t: "table", head: ["采集来源", "可用性", "说明"], rows: [
            ["Tampermonkey 编辑器 / VS Code / 记事本", "推荐", "纯文本编辑器不做标点替换，字符保持原文"],
            ["浏览器 DevTools Sources", "推荐", "同上"],
            ["聊天窗口 / Markdown 渲染器 / 富文本编辑器", "禁用", "在渲染层替换标点，复制结果与源码不一致"]
        ]},
        { t: "h3", text: "5.2 字符替换风险表" },
        { t: "p", text: "下表列出在非纯文本通道中会被静默替换的常见字符，及其导致的后果。" },
        { t: "table", head: ["字符", "常见替换结果", "后果", "规避方式"], rows: [
            ["直双引号", "弯双引号", "FIND 匹配失败；或 REPLACE 写入全角引号导致语法错误", "自 v0.12.21 起应用器会自动规范化，见 §5.9"],
            ["直单引号", "弯单引号", "同上", "同上"],
            ["反引号", "被作为 Markdown 代码标记剥除", "FIND 匹配失败；或 REPLACE 内容缺失", "避免在 FIND 中使用；或改用不含反引号的锚点"],
            ["反斜杠", "折叠为单个、或加倍为两个", "正则表达式或转义序列语义改变", "用字符类规避（例如以 [0-9] 代替数字匹配）"],
            ["连续两个减号", "长破折号", "FIND 匹配失败", "改用不含该组合的锚点"],
            ["连续三个句点", "省略号", "同上", "同上"]
        ]},
        { t: "h3", text: "5.3 FIND 锚点的选择策略" },
        { t: "p", text: "FIND 越短，包含特殊字符的概率越低，匹配失败的风险也越低。改动目标位置本身含特殊字符时，将改动拆分为多个改动块，每块的 FIND 只锚定不含特殊字符的片段。" },
        { t: "ul", list: [
            "优先使用不含引号、反引号、反斜杠的连续英文标识符作为锚点。",
            "改动点跨越特殊字符时，拆成多个改动块；每块独立成功或失败，便于定位。",
            "一个改动块内 FIND 的内容应保持唯一；若在旧代码中多次出现，报告区会给出「多处匹配」警告。"
        ]},
        { t: "h3", text: "5.4 匹配失败后的处理流程" },
        { t: "p", text: "应用器报告「未找到」意味着 FIND 与旧代码存在字符级差异，或 FIND 在旧代码中出现次数为零。反复提交同一 FIND 不会改变结果。处理流程如下：" },
        { t: "ol", list: [
            "回到纯文本编辑器，重新选取目标片段并复制，替换应用器中的 FIND。",
            "若仍失败，将 FIND 缩短至首尾各保留一段独特的上下文，去除中间可能被替换的字符。",
            "若仍失败，放弃应用器，手动修改源码中的对应位置。"
        ]},
        { t: "h3", text: "5.5 建议手动修改的场景" },
        { t: "p", text: "以下情形建议直接手动修改源码，不走应用器流程：" },
        { t: "ul", list: [
            "改动涉及脚本的语法结构（例如：HTML 字符串中的裸双引号、模板字面量中的裸换行）。",
            "目标位置包含大量特殊字符，FIND 拆分成本高于直接手改。",
            "改动量极小（一至两行内），手改比走应用器更可靠。"
        ]},
        { t: "h3", text: "5.6 典型错误实例" },
        { t: "p", text: "以下实例均来自真实故障，每条列出描述、代码文本、正确做法。" },
        { t: "ol", list: [
            "<strong>FIND 中的引号被替换</strong><br><strong>描述</strong>：从聊天窗口复制 FIND 时，源码里的 ASCII 双引号会被渲染层替换为弯引号，导致应用器找不到对应片段。<br><strong>代码文本</strong>：<code>text: &#34;实例集&#34;</code>（原文） → <code>text: &#8220;实例集&#8221;</code>（复制后）<br><strong>正确做法</strong>：从纯文本编辑器重新复制 FIND；或依赖应用器自 v0.12.21 起的自动还原。",
            "<strong>REPLACE 中引入裸双引号</strong><br><strong>描述</strong>：HTML 内容里直接嵌入 ASCII 双引号，会提前终止该字符串，使内嵌 script 的解析失败。<br><strong>代码文本</strong>：<code>body: &#34;…type: &#34;disabled&#34;…&#34;</code>（内层双引号提前闭合外层字符串）<br><strong>正确做法</strong>：内层双引号改用 HTML 实体 <code>&amp;quot;</code> 表达（浏览器渲染时还原为双引号）。",
            "<strong>模板字面量中的裸换行</strong><br><strong>描述</strong>：模板字面量里的换行转义会被解释为真换行，落到内嵌 script 的字符串字面量内部，引发 SyntaxError。<br><strong>代码文本</strong>：<code>arr.join(&#34;&#92;n&#34;)</code><br><strong>正确做法</strong>：改用 <code>arr.join(String.fromCharCode(10))</code>。",
            "<strong>模板字面量吞掉反斜杠</strong><br><strong>描述</strong>：模板字面量里的单反斜杠会与其后的字符组成转义序列，导致正则元字符（如空白符、数字匹配符）退化为字面量匹配。<br><strong>代码文本</strong>：<code>match(/^([0-9]+)[.]&#92;s/)</code><br><strong>正确做法</strong>：在模板字面量里对该反斜杠写两次：<code>match(/^([0-9]+)[.]&#92;&#92;s/)</code>。",
            "<strong>改动块分隔符被误解析</strong><br><strong>描述</strong>：FIND 或 REPLACE 里出现连续三个井号，会被应用器误判为改动块结束标记，导致后续内容错位。<br><strong>代码文本</strong>：FIND 内容里嵌入连续三个井号<br><strong>正确做法</strong>：将该组合拆成两份字符串拼接，或以 Unicode 转义表达。",
            "<strong>HTML 属性中的反斜杠转义被吞掉</strong><br><strong>描述</strong>：向外层模板字面量生成的内嵌 &lt;script&gt; 里写入形如 &lt;b style=&#92;&quot;color:#ef5350;&#92;&quot;&gt; 的 HTML 片段时，双反斜杠转义序列会被外层模板字面量解释成单个双引号，导致内嵌字符串被提前闭合，抛出 SyntaxError: Unexpected identifier。<br><strong>代码文本</strong>：<code>body: &#34;…&lt;b style=&#92;&#34;color:#ef5350;&#92;&#34;&gt;…&#34;</code>（内层双引号破坏外层字符串）<br><strong>正确做法</strong>：HTML 属性改用单引号包裹，避免在字符串里出现裸双引号：<code>body: &#34;…&lt;b style=&#39;color:#ef5350;&#39;&gt;…&#34;</code>。"
        ]},
        { t: "h3", text: "5.7 应用器的语法校验" },
        { t: "p", text: "自脚本 v0.12.21 起，应用器在输出新代码前调用 JavaScript 解析器对结果做一次语法校验，拦截「改动本身合法、但生成的代码无法被 JS 解析」的情况。" },
        { t: "ul", list: [
            "校验方式：对「新代码」整体调用 <code>new Function(code)</code>，仅编译不执行，无副作用。",
            "通过：右上角报告徽章变绿，可以复制回脚本。",
            "不通过：报告区以红色显示 SyntaxError 的 message 与出错行号，并展示出错行上下三行作为上下文；报告徽章追加「语法错误」标记。"
        ]},
        { t: "h3", text: "5.8 语法校验的边界" },
        { t: "ul", list: [
            "可以捕获：字符串未闭合、括号未闭合、模板字面量中的裸换行、改动块分隔符被误解析、保留字误用、ES 语法错误等。",
            "不能捕获：运行期错误（例如访问 undefined 的属性）、逻辑错误、DOM 选择器错误、responsePath 配置错误。",
            "看到「通过」只代表代码能被 JavaScript 解析，不代表代码按预期运行。"
        ]},
        { t: "h3", text: "5.9 智能标点自动规范化" },
        { t: "p", text: "自脚本 v0.12.21 起，应用器在解析改动点时自动执行智能标点规范化：将弯引号、全角引号统一还原为 ASCII 直引号，避免因复制来源导致的引号变形。" },
        { t: "table", head: ["原始字符", "Unicode 码位", "规范化为"], rows: [
            ["左右双弯引号", "U+201C / U+201D", "直双引号"],
            ["双低位引号", "U+201E / U+201F", "直双引号"],
            ["全角双引号", "U+FF02", "直双引号"],
            ["左右单弯引号", "U+2018 / U+2019", "直单引号"],
            ["单低位引号", "U+201A / U+201B", "直单引号"],
            ["全角单引号", "U+FF07", "直单引号"]
        ]},
        { t: "p", text: "规范化在 FIND 和 REPLACE 上都会执行。若本次改动的文本中包含被替换的字符，报告区会显示「已自动规范化 N 个智能标点字符」作为提示。" },
        { t: "callout", kind: "info", title: "边界情形：需要保留弯引号时", body: "规范化流程只匹配实际的弯引号字符（U+201C / U+201D 等），不触碰 ASCII 实体串。若需要在文档里原样展示弯引号，请在源码里改以 HTML 实体书写——想展示 <code>&#8220;中文引号&#8221;</code>，源码就写 <code>&amp;#8220;中文引号&amp;#8221;</code>。实体不会被规范化拉直，渲染时浏览器自动还原为弯引号。" },
        { t: "callout", kind: "info", title: "处理流程与规范化位置", body: "应用器依次执行三步：智能标点规范化 → 字符串查找替换 → 语法校验。规范化解决复制来源带来的字符变形，查找替换解决改动是否落到正确位置，语法校验解决应用结果是否可被 JavaScript 解析。三步全部通过，才表示本次改动可以合入。" },
        { t: "callout", kind: "warn", title: "校验只报告首处错误", body: "若一次改动引入多处语法错误，解析器只会指出第一处。修好后重新应用，以暴露后续错误。" },
        { t: "h2", text: "6. 实例集" },
        { t: "h3", text: "6.1 文本替换" },
        { t: "code", text: '###DESC### 将 GREETING 改为中文并追加版本号\\n###FIND###\\nconst GREETING = "hello";\\n###REPLACE###\\nconst GREETING = "你好";\\nconst VERSION = "1.0";\\n###END###' },
        { t: "h3", text: "6.2 修改函数签名" },
        { t: "code", text: '###DESC### sleep 增加可选 reason\\n###FIND###\\nfunction sleep(ms) { return new Promise(r => setTimeout(r, ms)); }\\n###REPLACE###\\nfunction sleep(ms, reason) { return new Promise(r => setTimeout(r, ms)); }\\n###END###' },
        { t: "h3", text: "6.3 修改 CSS 变量" },
        { t: "code", text: '###DESC### 面板宽度改为 480px\\n###FIND###\\n--uooc-panel-width: 420px;\\n###REPLACE###\\n--uooc-panel-width: 480px;\\n###END###' },
        { t: "h2", text: "7. 快捷键" },
        { t: "table", head: ["快捷键", "作用"], rows: [
            ["<code>Ctrl / Cmd + Enter</code>", "应用改动"],
            ["<code>Tab</code>", "在旧代码 / 改动点文本框中插入 4 空格"]
        ]}
    ];

    var tocCtl = makeDocTocController({
        docBodyId: "doc-body",
        tocListId: "toc-list",
        docContentId: "doc-content"
    });

    function _switchView(view) {
        try {
            console.log("[UOOC-Patcher] switchView:", view);
            document.querySelectorAll(".tab").forEach(function (t) {
                t.classList.toggle("active", t.dataset.view === view);
            });
            var vm = $("view-manage");
            if (vm) vm.style.display = view === "manage" ? "grid" : "none";
            var vd = $("view-doc");
            if (vd) {
                if (view === "doc") vd.classList.add("active");
                else vd.classList.remove("active");
                vd.style.display = view === "doc" ? "flex" : "none";
            }
            var tb = document.querySelector(".toolbar");
            if (tb) tb.style.display = view === "manage" ? "flex" : "none";
            if (view === "doc") {
                try { tocCtl.build(DOC_DATA); }
                catch (e) { console.error("[UOOC-Patcher] tocCtl.build error:", e); }
            }
        } catch (e) {
            console.error("[UOOC-Patcher] switchView error:", e);
        }
    }

    // 事件委托（捕获阶段）+ 直接 onclick，双保险
    document.addEventListener("click", function (e) {
        var t = e.target;
        while (t && t !== document) {
            if (t.classList && t.classList.contains("tab") && t.dataset && t.dataset.view) {
                _switchView(t.dataset.view);
                return;
            }
            t = t.parentNode;
        }
    }, true);

    document.querySelectorAll(".tab").forEach(function (tab) {
        tab.onclick = function () { _switchView(tab.dataset.view); };
    });

    var tocBtn = $("btn-toc");
    if (tocBtn) tocBtn.onclick = function () { $("view-doc").classList.toggle("toc-open"); };

    updateBadge();

    (function bindTabClick() {
        var tabs = document.querySelectorAll(".tab");
        for (var i = 0; i < tabs.length; i++) {
            (function (tab) {
                tab.onclick = function () {
                    var v = tab.getAttribute("data-view");
                    var list = document.querySelectorAll(".tab");
                    for (var j = 0; j < list.length; j++) {
                        if (list[j].getAttribute("data-view") === v) list[j].classList.add("active");
                        else list[j].classList.remove("active");
                    }
                    var vm = document.getElementById("view-manage");
                    var vd = document.getElementById("view-doc");
                    var tb = document.querySelector(".toolbar");
                    if (v === "doc") {
                        if (vm) vm.style.display = "none";
                        if (vd) { vd.classList.add("active"); vd.style.display = "flex"; }
                        if (tb) tb.style.display = "none";
                        try { tocCtl.build(DOC_DATA); } catch (err) {}
                    } else {
                        if (vm) vm.style.display = "grid";
                        if (vd) { vd.classList.remove("active"); vd.style.display = "none"; }
                        if (tb) tb.style.display = "flex";
                    }
                };
            })(tabs[i]);
        }
    })();
})();
<\/script>
</body>
</html>`;
        return html;
    }

    /* ============================================================
     * 【强制页面尺寸】应用
     * ============================================================ */
    function applyForceAspect(mode) {
        let styleEl = document.getElementById("uooc-force-aspect-style");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "uooc-force-aspect-style";
            document.head.appendChild(styleEl);
        }
        const html = document.documentElement;
        const body = document.body;

        html.style.removeProperty("background");
        html.style.removeProperty("display");
        html.style.removeProperty("align-items");
        html.style.removeProperty("justify-content");
        html.style.removeProperty("height");
        html.style.removeProperty("width");
        html.style.removeProperty("overflow");
        body.style.removeProperty("width");
        body.style.removeProperty("height");
        body.style.removeProperty("margin");
        body.style.removeProperty("position");
        body.style.removeProperty("overflow");
        body.style.removeProperty("background");

        if (mode === "none") { styleEl.textContent = ""; return; }
        const ratio = mode === "16:9" ? 16 / 9 : 4 / 3;
        const size = _computeForceSize(window.innerWidth, window.innerHeight, ratio);
        styleEl.textContent = `
            html.uooc-force-aspect {
                background: #000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                height: 100vh !important;
                width: 100vw !important;
                overflow: hidden !important;
            }
            html.uooc-force-aspect body {
                width: ${size.w}px !important;
                height: ${size.h}px !important;
                margin: 0 !important;
                overflow: auto !important;
                background: #fff !important;
                position: relative !important;
            }
        `;
        html.classList.add("uooc-force-aspect");
    }
    window.addEventListener("resize", () => {
        const mode = (getSettings().forceAspect) || "none";
        if (mode !== "none") {
            document.documentElement.classList.remove("uooc-force-aspect");
            setTimeout(() => applyForceAspect(mode), 30);
        }
    });

    /* ============================================================
     * 【全局状态】
     * ============================================================ */
    let running = false;
    let scanning = false;
    let stopRequested = false;
    let scanCancelFlag = false;

    /* 【v0.12.21】本次递归已成功处理（playTaskpoint / processNonVideoTaskpoint 返回 true）
       的任务点集合。使用 name|path 作为键，兼容 scanItems 中出现的同名项
       （重复扫描或缓存与 DOM 不一致可能导致）。
       作用：
         1) 自动重试递归时跳过本轮已完成项，避免重复播放同一视频；
         2) 防止 DOM 未同步造成的"完成 → rescan 改回未完成 → 再播放"死循环。
       每次 startRecursive 开始时清空。 */
    let _sessionOkItems = new Set();
    function _okKey(it) {
        if (!it) return "";
        var nm = it.name || "";
        var p = "";
        try { p = Array.isArray(it.path) ? it.path.join("/") : ""; } catch (e) {}
        /* 【v0.12.21 修复】同一小节内的视频/测验 name 与 path 可能完全相同
           （name 被 GENERIC_NAME_WORDS 退化为小节名），必须再区分 type、_ri、isVideo，
           否则视频处理完后会把同小节的测验误判为"已处理"而跳过。 */
        var ri = (typeof it._ri === "number") ? it._ri : -1;
        var tp = it.type || "";
        var vid = it.isVideo ? "V" : "N";
        return vid + "|" + tp + "|" + nm + "|" + p + "|" + ri;
    }

    let scanItems = [];
    let lastDoneVideoIdx = -1;
    let _curCi = -1, _curSi = -1;

    let challengeMode = false;
    let challengeBlockPoint = null;
    let autoScanTimer = null;
    let autoScanEnabled = true;
    let autoScanInProgress = false;
    let _lastChallengeKey = null;

    let recordQuizRunning = false;

    let _autoScanSuspended = false;
    let _autoScanWasEnabledBeforeSuspend = true;

    /* ============================================================
     * 【互斥判定】
     * ============================================================ */
    function getMutexState() {
        const scanningOn = scanning;
        const runningOn = running;
        const recordOn = recordQuizRunning;
        const quizOn = UI.isQuizButtonRunning && UI.isQuizButtonRunning();
        return {
            scanning: scanningOn,
            running: runningOn,
            recordQuizRunning: recordOn,
            quizRunning: quizOn,
            any: scanningOn || runningOn || recordOn || quizOn
        };
    }
    UI._registerMutexCheck(getMutexState);

    /* ============================================================
     * 【方案管理器消息桥】管理器通过 postMessage 与主页面通信
     * ============================================================ */
    window.addEventListener("message", (ev) => {
        const d = ev.data;
        if (!d || typeof d !== "object" || !d.__uooc_methods) return;
        const src = ev.source;
        const _reply = (payload) => {
            try { src?.postMessage(Object.assign({ __uooc_methods: true }, payload), "*"); } catch (e) {}
        };
        switch (d.type) {
            case "REQUEST_LIST":
                _reply({ type: "LIST", methods: MethodStore.list(), activeId: MethodStore.getActiveId() });
                break;
            case "UPSERT": {
                const res = MethodStore.upsert(d.method);
                _reply({ type: "RESULT", action: "UPSERT", ok: !!res.ok, error: res.error || null });
                break;
            }
            case "REMOVE": {
                const res = MethodStore.remove(d.id);
                _reply({ type: "RESULT", action: "REMOVE", ok: !!res.ok, error: res.error || null });
                break;
            }
            case "SET_ACTIVE": {
                const ok = MethodStore.setActiveId(d.id);
                _reply({ type: "RESULT", action: "SET_ACTIVE", ok, error: ok ? null : "无效 id" });
                break;
            }
            case "CONSOLE_MSG": {
                try {
                    const srcTag = d.source === "patcher" ? "[应用器]" : "[方案管理器]";
                    const isWarn = d.level === "warn";
                    const icon = isWarn ? "⚠️" : "❌";
                    const lvl = isWarn ? "warn" : "err";
                    const msg = String(d.message || "");
                    UI.log(icon + " " + srcTag + " " + msg, lvl);
                } catch (e) {}
                break;
            }
        }
    });

    /* ============================================================
     * 【自动更新挂起/恢复】
     * ============================================================ */
    function suspendAutoScanForMutex() {
        if (autoScanTimer) {
            _autoScanSuspended = true;
            _autoScanWasEnabledBeforeSuspend = autoScanEnabled;
            stopAutoScanLoop();
            UI.log("⏸ 因其他任务启动，自动更新已暂停", "info");
        } else {
            _autoScanSuspended = false;
            _autoScanWasEnabledBeforeSuspend = autoScanEnabled;
        }
    }
    function resumeAutoScanAfterMutex() {
        const wasRunning = _autoScanSuspended;
        const wasEnabled = _autoScanWasEnabledBeforeSuspend;
        _autoScanSuspended = false;
        _autoScanWasEnabledBeforeSuspend = autoScanEnabled;
        if (!wasRunning) return;
        if (!wasEnabled) return;
        if (!autoScanEnabled) return;
        if (!challengeMode) return;
        if (running || scanning || recordQuizRunning) return;
        if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) return;
        startAutoScanLoop();
        UI.log("▶ 自动更新已恢复", "info");
    }

    /* ============================================================
     * 【扫描缓存】按课程 ID 区分
     * ============================================================ */
    const STORAGE_PREFIX = "uooc_helper_scan_";
    const STORAGE_VERSION_PREFIX = "2.6";

    function getCourseId() {
        const hashMatch = location.hash.match(/#\/(\d+)/);
        if (hashMatch) return hashMatch[1];
        try {
            const usp = new URLSearchParams(location.search);
            const q = usp.get("courseId") || usp.get("course_id") || usp.get("id");
            if (q && /^\d+$/.test(q)) return q;
        } catch (e) {}
        const pathMatch = location.pathname.match(/\/(?:course|learn)\/(\d+)/);
        if (pathMatch) return pathMatch[1];
        const backLink = document.querySelector('a.goback[href*="/home/course/"]');
        if (backLink) {
            const m = (backLink.getAttribute("href") || "").match(/\/course\/(\d+)/);
            if (m) return m[1];
        }
        return null;
    }
    function getCourseName() {
        const h3 = document.querySelector(".learn-head-title h3");
        return h3 ? (h3.textContent || "").trim() : "";
    }
    function getStorageKey() {
        const id = getCourseId();
        if (!id) return null;
        return STORAGE_PREFIX + id;
    }
    function serializeScanItemsForStorage(items) {
        return items.map(it => {
            const copy = {};
            for (const k in it) { if (k === "el") continue; copy[k] = it[k]; }
            return copy;
        });
    }

    let _saveTimer = null;
    let _lastSavedHash = null;
    function computeScanHash() {
        return JSON.stringify({
            n: scanItems.length,
            c: scanItems.filter(it => it.complete).length,
            m: challengeMode ? 1 : 0,
            s: UI.getChapterStatuses().join(",")
        });
    }
    function scheduleSave(delay = 800) {
        if (_saveTimer) clearTimeout(_saveTimer);
        _saveTimer = setTimeout(() => { _saveTimer = null; saveScanCache(); }, delay);
    }

    function saveScanCache() {
        const key = getStorageKey();
        if (!key) { UI.log("无法确定课程 ID，跳过缓存保存", "debug"); return false; }
        const hash = computeScanHash();
        if (hash === _lastSavedHash) return false;
        try {
            let _courseName2 = "";
            try { _courseName2 = (typeof getCourseName === "function" ? getCourseName() : "") || ""; } catch (e) {}
            const payload = {
                version: STORAGE_VERSION_PREFIX,
                courseId: getCourseId(),
                courseName: _courseName2,
                timestamp: Date.now(),
                challengeMode, challengeBlockPoint, autoScanEnabled,
                chapterScanStatus: UI.getChapterStatuses(),
                scanItems: serializeScanItemsForStorage(scanItems)
            };
            localStorage.setItem(key, JSON.stringify(payload));
            _lastSavedHash = hash;
            const real = scanItems.filter(it => !it.isChallengeMarker);
            const doneCount = real.filter(it => it.complete).length;
            UI.log(`💾 扫描结果已保存到缓存（任务点 ${real.length} 项，已完成 ${doneCount} 项）`, "warn");
            UI.setCacheBtnCleared(false);
            return true;
        } catch (e) {
            UI.log(`保存缓存失败：${e && e.message ? e.message : e}`, "err");
            return false;
        }
    }

    function loadScanCache() {
        const key = getStorageKey();
        if (!key) return { error: "no-key" };
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return { error: "no-cache" };
            const data = JSON.parse(raw);
            if (!data) return { error: "bad-json" };
            const v = String(data.version || "");
            if (!v.startsWith(STORAGE_VERSION_PREFIX)) return { error: "version-mismatch", foundVersion: v };
            if (!Array.isArray(data.scanItems)) return { error: "bad-structure" };
            return { ok: true, data };
        } catch (e) { return { error: "exception", message: e && e.message ? e.message : String(e) }; }
    }
    function clearScanCache() {
        const key = getStorageKey();
        if (!key) return false;
        try { localStorage.removeItem(key); _lastSavedHash = null; return true; } catch (e) { return false; }
    }
    function deriveChapterStatusesFromScanItems() {
        const chapterLIs = document.querySelectorAll("ul.rank-1 > li.catalogItem");
        const total = chapterLIs.length;
        if (total === 0) return [];
        const statuses = new Array(total).fill("empty");
        for (const it of scanItems) {
            if (it.isChallengeMarker) continue;
            if (it._ci >= 0 && it._ci < total) statuses[it._ci] = "ok";
        }
        if (challengeMode && challengeBlockPoint) {
            const ci = challengeBlockPoint.ci;
            if (ci >= 0 && ci < total) statuses[ci] = "challenge";
            for (let i = ci + 1; i < total; i++) if (statuses[i] === "empty") statuses[i] = "challengePending";
        }
        return statuses;
    }

    function restoreFromCache(data) {
        if (!data) return null;
        scanItems = data.scanItems || [];
        challengeMode = !!data.challengeMode;
        challengeBlockPoint = data.challengeBlockPoint || null;
        autoScanEnabled = data.autoScanEnabled !== false;
        _curCi = -1; _curSi = -1;
        UI.setScanResultText(scanItemsToText(scanItems));
        if (Array.isArray(data.chapterScanStatus) && data.chapterScanStatus.length > 0) {
            UI.setChapterScanStatus(data.chapterScanStatus);
        } else {
            const derived = deriveChapterStatusesFromScanItems();
            if (derived.length > 0) UI.setChapterScanStatus(derived);
        }
        const real = scanItems.filter(it => !it.isChallengeMarker);
        UI.setTaskProgress(real.filter(it => it.complete).length, real.length);
        refreshAfterScanItemsChanged();
        UI.setAutoScanEnabled(autoScanEnabled);
        _lastSavedHash = computeScanHash();

        if (challengeMode && autoScanEnabled) {
            setTimeout(() => {
                if (!running && !scanning && !autoScanTimer) startAutoScanLoop();
            }, 1200);
        }
        const t = new Date(data.timestamp).toLocaleString("zh-CN", { hour12: false });
        return { timestamp: data.timestamp, formattedTime: t, courseName: data.courseName };
    }

    let _cacheRestored = false;
    function tryRestoreCache(verbose = false) {
        if (_cacheRestored) return true;
        if (scanItems.length > 0) { _cacheRestored = true; return true; }
        const res = loadScanCache();
        if (res.ok) {
            const info = restoreFromCache(res.data);
            if (info) {
                _cacheRestored = true;
                const real = res.data.scanItems.filter(it => !it.isChallengeMarker);
                UI.log(`📦 已从本地缓存恢复扫描结果（${real.length} 项任务点，保存于 ${info.formattedTime}）`, "ok");
                UI.setStatus(`已加载缓存（${info.formattedTime}）`);
                return true;
            }
        }
        if (verbose) {
            switch (res.error) {
                case "no-key": UI.log(`📦 无法识别课程 ID`, "warn"); break;
                case "no-cache": UI.log("📦 当前课程无本地缓存", "info"); break;
                case "version-mismatch": UI.log(`📦 缓存版本不兼容（发现 ${res.foundVersion}）`, "warn"); break;
                case "bad-json": UI.log("📦 缓存 JSON 损坏", "warn"); break;
                case "bad-structure": UI.log("📦 缓存结构异常", "warn"); break;
                case "exception": UI.log(`📦 读取缓存异常：${res.message}`, "err"); break;
                default: UI.log("📦 无可用缓存", "info");
            }
        }
        return false;
    }

    /* ============================================================
     * 【播放辅助 / 弹窗清理 / 自动答题】
     * ============================================================ */
    function keepPlaying() {
        const video = getVideoEl();
        if (video) {
            try {
                if (!video.muted) video.muted = true;
                const rate = Number(getSettings().videoPlaybackRate) || 2;
                if (Math.abs(video.playbackRate - rate) > 0.01) video.playbackRate = rate;
                if (video.paused && !video.ended) video.play().catch(() => {});
            } catch (e) {}
        }
    }
    setInterval(keepPlaying, 500);

    function hasSmartVerificationLayer() {
        let found = false;
        document.querySelectorAll(".layui-layer").forEach(layer => {
            const t = layer.innerText || "";
            if (t.includes("验证") || t.includes("智能") || t.includes("提交") || layer.querySelector(".layui-layer-btn")) found = true;
        });
        return found;
    }
    function clearShader() {
        document.querySelectorAll(".layui-layer.layui-layer-dialog").forEach(dlg => {
            const t = dlg.innerText || "";
            if (/测验通过|可以继续|提交成功|已完成/.test(t) && !/验证|智能/.test(t)) {
                const btn = dlg.querySelector(".layui-layer-btn0") || dlg.querySelector(".layui-layer-btn a");
                if (btn) { try { btn.click(); } catch (e) {} }
                try {
                    const sid = dlg.id ? dlg.id.replace("layui-layer", "layui-layer-shade") : "";
                    const sh = sid ? document.getElementById(sid) : null;
                    if (sh) sh.remove();
                } catch (e) {}
            }
        });
        if (hasSmartVerificationLayer()) return;
        document.querySelectorAll("div.layui-layer-shade").forEach(s => s.remove());
        document.querySelectorAll(".layui-layer.layui-layer-page").forEach(e => {
            const t = e.innerText || "";
            if (!t.includes("验证") && !t.includes("智能") && !t.includes("提交")) e.remove();
        });
        document.querySelectorAll(".vjs-mask").forEach(e => e.remove());
        let quizDom = document.querySelector(".smallTest-view, .small-test-view");
        if (quizDom && quizDom.offsetTop > 600) quizDom.style.display = "none";
    }
    setInterval(clearShader, 800);

    let lastQuizQuestion = null;
    /* 同一视频内匹配失败的题目只记录一次，避免每 500ms 刷屏日志 */
    let _quizNoMatchLogged = new Set();
    function autoAnswerQuiz() {
        const quizLayer = document.querySelector("#quizLayer");
        if (!(quizLayer && quizLayer.style.display !== "none")) {
            lastQuizQuestion = null;
            _quizNoMatchLogged.clear();
            const answeredLayer = document.querySelector("#quizLayer.answered");
            if (answeredLayer) answeredLayer.classList.remove("answered");
            return;
        }
        try {
            const videoDiv = document.querySelector("div[uooc-video]");
            if (!videoDiv) return;
            const source = videoDiv.getAttribute("source");
            if (!source) return;
            let quizList;
            try { quizList = JSON.parse(source).quiz || []; }
            catch (e) { UI.log("自动答题：解析 source JSON 失败 -> " + e.message, "err"); return; }
            const quizQuestionElem = document.querySelector(".smallTest-view .ti-q-c, .small-test-view .ti-q-c");
            if (!quizQuestionElem) return;
            const quizQuestion = quizQuestionElem.innerHTML.trim();
            if (lastQuizQuestion === quizQuestion && quizLayer.classList.contains("answered")) return;
            if (_quizNoMatchLogged.has(quizQuestion)) return;
            const quizIndex = quizList.findIndex(q => q.question === quizQuestion);
            if (quizIndex === -1) {
                _quizNoMatchLogged.add(quizQuestion);
                UI.log("自动答题：题库中未匹配，跳过（本视频不再重复记录）", "warn");
                return;
            }
            let quizAnswer;
            try { quizAnswer = eval(quizList[quizIndex].answer); }
            catch (e) { UI.log("自动答题：解析答案失败 -> " + e.message, "err"); return; }
            const quizOptions = quizLayer.querySelector("div.ti-alist");
            if (!quizOptions) return;
            for (const ans of quizAnswer) {
                const idx = ans.charCodeAt(0) - "A".charCodeAt(0);
                const opt = quizOptions.children[idx];
                if (opt) opt.click();
            }
            const btn = quizLayer.querySelector("button");
            if (btn) btn.click();
            quizLayer.classList.add("answered");
            lastQuizQuestion = quizQuestion;
            UI.log(`自动答题：${quizQuestion.slice(0, 30)} → ${quizAnswer.toString()}`, "ok");
        } catch (error) {
            UI.log("自动答题出错：" + (error && error.message ? error.message : error), "err");
        }
    }
    setInterval(autoAnswerQuiz, 500);

    /* ============================================================
     * 【扫描结果文本序列化】
     * ============================================================ */
    function makeChallengeMarker() {
        return {
            isChallengeMarker: true, name: CHALLENGE_MARKER_NAME, type: "限制标记",
            isVideo: false, isTaskpoint: false, complete: false,
            path: [], _ci: -1, _si: -1, _ri: -1
        };
    }

    function computeSeqMap(items) {
        const counters = new Map();
        const seqMap = new Array(items.length);
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.isChallengeMarker) { seqMap[i] = 0; continue; }
            const sectionKey = it.path.slice(0, -1).join("/");
            const key = sectionKey + "||" + it.type;
            const n = (counters.get(key) || 0) + 1;
            counters.set(key, n);
            seqMap[i] = n;
        }
        return seqMap;
    }

    function scanItemsToText(items) {
        if (!items || !items.length) return "";
        const seqMap = computeSeqMap(items);
        return items.map((it, i) => {
            if (it.isChallengeMarker) return `[${CHALLENGE_MARKER_NAME}]`;
            const mark = it.complete ? "Y" : "N";
            const pathText = it.path.length ? it.path.join("/") : it.name;
            const seq = seqMap[i];
            return `${mark} ${it.type}#${seq} ${pathText}`;
        }).join("\n");
    }

    function textToScanItems(text) {
        const lines = String(text || "").split("\n");
        const result = [];
        for (const raw of lines) {
            const line = raw.replace(/\r/g, "").trimEnd();
            if (!line.trim()) continue;
            const markerMatch = line.match(/^\[(.+)\]$/);
            if (markerMatch) {
                result.push({
                    isChallengeMarker: true, name: markerMatch[1], type: "限制标记",
                    isVideo: false, isTaskpoint: false, complete: false,
                    path: [], _ci: -1, _si: -1, _ri: -1
                });
                continue;
            }
            const m = line.match(/^([YyNn])\s+(\S+)\s+(.+)$/);
            if (!m) { UI.log(`无法解析行：${line.slice(0, 40)}`, "warn"); continue; }
            const mark = m[1].toUpperCase();
            const typeRaw = m[2];
            const seqMatch = typeRaw.match(/^(.+?)#\d+$/);
            const type = seqMatch ? seqMatch[1] : typeRaw;
            const pathText = m[3];
            const complete = mark === "Y";
            const path = pathText.split("/").map(s => s.trim()).filter(s => s.length);
            if (path.length === 0) continue;
            const name = path[path.length - 1];
            const isVideo = type === "视频";
            result.push({ el: null, name, type, isVideo, isTaskpoint: true, complete, path, _ci: -1, _si: -1, _ri: -1 });
        }
        return result;
    }

    function mergeIndexes(newItems, oldItems) {
        const oldMap = new Map();
        for (const it of oldItems) {
            if (it.isChallengeMarker) continue;
            if (!it.path || !it.path.length) continue;
            const key = it.path.join("/") + "|" + it.type;
            if (!oldMap.has(key)) oldMap.set(key, []);
            oldMap.get(key).push(it);
        }
        for (const it of newItems) {
            if (it.isChallengeMarker) continue;
            const key = it.path.join("/") + "|" + it.type;
            const list = oldMap.get(key);
            if (list && list.length) {
                const old = list.shift();
                it._ci = old._ci; it._si = old._si; it._ri = old._ri; it.el = old.el;
            }
        }
        return newItems;
    }

    function findMarkerIdx() { return scanItems.findIndex(it => it.isChallengeMarker); }

    function rebuildChapterStatusFromScanItems() {
        const chapterLIs = document.querySelectorAll("ul.rank-1 > li.catalogItem");
        const total = chapterLIs.length;
        if (total === 0) return;
        const old = UI.getChapterStatuses();
        const statuses = new Array(total).fill("empty");
        for (let i = 0; i < total; i++) {
            if (i < old.length && old[i] && old[i] !== "empty") statuses[i] = old[i];
        }
        for (const it of scanItems) {
            if (it.isChallengeMarker) continue;
            if (it._ci >= 0 && it._ci < total) {
                if (statuses[it._ci] === "empty") statuses[it._ci] = "ok";
            }
        }
        if (challengeMode && challengeBlockPoint) {
            const ci = challengeBlockPoint.ci;
            if (ci >= 0 && ci < total) statuses[ci] = "challenge";
            for (let i = ci + 1; i < total; i++) if (statuses[i] === "empty") statuses[i] = "challengePending";
        }
        UI.setChapterScanStatus(statuses);
    }

    function syncTaskProgress() {
        const markerIdx = findMarkerIdx();
        const realItems = markerIdx >= 0
            ? scanItems.slice(0, markerIdx).concat(scanItems.slice(markerIdx + 1))
            : scanItems;
        UI.setTaskProgress(realItems.filter(it => it.complete).length, realItems.length);
    }

    function refreshAfterScanItemsChanged() {
        const markerIdx = findMarkerIdx();
        const hasMarker = markerIdx >= 0;
        const realItems = hasMarker
            ? scanItems.slice(0, markerIdx).concat(scanItems.slice(markerIdx + 1))
            : scanItems;

        UI.setScanItemsEmpty(realItems.length === 0);

        lastDoneVideoIdx = -1;
        for (let i = realItems.length - 1; i >= 0; i--) {
            if (realItems[i].isVideo && realItems[i].complete) { lastDoneVideoIdx = i; break; }
        }
        const doneCount = realItems.filter(it => it.complete).length;
        UI.setTaskProgress(doneCount, realItems.length);

        let lastDoneDisplay = "（无）";
        if (lastDoneVideoIdx >= 0) {
            const seqMap = computeSeqMap(realItems);
            const seq = seqMap[lastDoneVideoIdx];
            const item = realItems[lastDoneVideoIdx];
            lastDoneDisplay = `[${seq} ${item.path.join("/")}]`;
        }

        const targets = realItems.filter((it, i) => i < lastDoneVideoIdx && !it.complete);
        const targetVideos = targets.filter(it => it.isVideo).length;
        const firstMissingVideoBefore = realItems.findIndex((it, i) => i < lastDoneVideoIdx && it.isVideo && !it.complete);
        const _autoNow2 = (function () {
            try {
                if (typeof _getSubmitMode === "function") return _getSubmitMode() === "auto";
                return QuizCache.ensure().submitMode === "auto";
            } catch (e) { return false; }
        })();
        let _effectiveLastDoneIdx = lastDoneVideoIdx;
        if (_autoNow2) {
            for (let i = realItems.length - 1; i >= 0; i--) {
                if (realItems[i].isTaskpoint && realItems[i].complete) { _effectiveLastDoneIdx = i; break; }
            }
        }
        const optAEnabled = _autoNow2
            ? (realItems.findIndex((it, i) => i < _effectiveLastDoneIdx && it.isTaskpoint && !it.complete) !== -1)
            : (firstMissingVideoBefore !== -1);
        let optBEnabled;
        if (_autoNow2) {
            optBEnabled = false;
            const _markerLimit = hasMarker ? markerIdx : realItems.length;
            for (let i = _effectiveLastDoneIdx + 1; i < _markerLimit; i++) {
                const it = realItems[i];
                if (it.isChallengeMarker) continue;
                if (!it.isTaskpoint) continue;
                if (it.complete) continue;
                optBEnabled = true;
                break;
            }
        } else {
            optBEnabled = realItems.some(it => !it.complete);
        }

        /* auto 模式下脚本会处理非视频任务点，"全部完成 / 未被限制任务点已完成"
           的判断应基于所有任务点，而不是仅基于视频任务点。
           否则只要视频都完成，即便还有未完成的测验任务点，
           按钮也会错误显示"【未被限制的】任务点已全部完成"并禁用。
           手动模式下保持原视频口径。
           本处自行读取当前提交模式，不依赖外部已有的 autoSubmit 变量，
           以兼容"提交方式迁移到全局设置"改动是否已应用。 */
        const _autoSubmitNow = (function () {
            try {
                if (typeof _getSubmitMode === "function") return _getSubmitMode() === "auto";
                return QuizCache.ensure().submitMode === "auto";
            } catch (e) { return false; }
        })();

        const allVideoItems = realItems.filter(it => it.isVideo);
        const allVideosDoneForManual = allVideoItems.length > 0 && allVideoItems.every(it => it.complete);
        const allTaskpointsDone = realItems.length > 0 && realItems.every(it => it.complete);
        const allVideosDone = _autoSubmitNow ? allTaskpointsDone : allVideosDoneForManual;

        let unrestrictVideosDone = false;
        let unrestrictAllDone = false;
        if (hasMarker) {
            const beforeMarker = scanItems.slice(0, markerIdx).filter(it => !it.isChallengeMarker);
            const videosBefore = beforeMarker.filter(it => it.isVideo);
            const vDone = videosBefore.length > 0 && videosBefore.every(it => it.complete);
            const allDone = beforeMarker.length > 0 && beforeMarker.every(it => it.complete);
            unrestrictVideosDone = _autoSubmitNow ? allDone : vDone;
            unrestrictAllDone = allDone;
        }

        let infoHTML = `
            共扫描到任务点 <b style="color:#4dd0e1;">${realItems.length}</b> 个，
            已完成 <b style="color:#66bb6a;">${doneCount}</b> 个。<br>
        `;
        if (hasMarker) {
            infoHTML += `<span style="color:#ffa726;">⚠ 存在待扫描任务被闯关模式限制（标记前 ${scanItems.slice(0, markerIdx).filter(it => !it.isChallengeMarker).length} 项）</span><br>`;
        }
        const autoSubmit = _getSubmitMode() === "auto";
        infoHTML += `最后一个已完成${autoSubmit ? "任务点" : "视频"}：<b style="color:#ffa726;">${esc(lastDoneDisplay)}</b><br>`;

        if (targets.length === 0) {
            infoHTML += `<span style="color:#66bb6a;">断点之前未完成任务点：0 个，其中未完成${autoSubmit ? "任务点" : "视频任务点"}：0 个</span>`;
        } else {
            infoHTML += `断点之前未完成任务点：<b style="color:#ffa726;">${targets.length}</b> 个，`;
            infoHTML += `其中未完成${autoSubmit ? "任务点" : "视频任务点"}：<b style="color:#ef5350;">${targetVideos}</b> 个`;
            infoHTML += `<div style="margin-top:6px;max-height:110px;overflow-y:auto;background:#101418;padding:5px 7px;border-radius:4px;font-size:10.5px;line-height:1.55;">`;
            for (const it of targets) {
                const icon = it.isVideo ? "🎬" : (it.type === "测验" ? "📝" : "📌");
                infoHTML += `<div style="color:#e6e6e6;word-break:break-all;">
                    <span style="color:#ffa726;">${icon}</span>
                    <span style="color:#90a4ae;">[${esc(it.type)}]</span>
                    <span>${esc(it.path.join("/"))}</span>
                </div>`;
            }
            infoHTML += `</div>`;
        }

        UI.setTaskInfo(infoHTML);
        UI.setOptions(optAEnabled && !unrestrictVideosDone, optBEnabled && !unrestrictVideosDone, optAEnabled ? "A" : "B");
        UI.setAllVideosDone(allVideosDone);
        UI.setUnrestrictedVideosDone(hasMarker && unrestrictVideosDone && !unrestrictAllDone);
        UI.setChallengeMode(challengeMode);
        UI.setChallengeCfg(unrestrictAllDone ? "已完成" : "未完成");

        if (hasMarker && unrestrictVideosDone && !unrestrictAllDone) {
            UI.setChallengeWarning("闯关模式前的视频任务点已经全部完成，配置智能闯关模式或自主完成测验任务点以进行后续操作");
        } else {
            UI.setChallengeWarning("");
        }
    }

    /* ============================================================
     * 【扫描】
     * ============================================================ */
    function chapterNameOf(titleEl) {
        if (!titleEl) return "";
        const oneline = titleEl.querySelector(".oneline");
        const t = (oneline || titleEl).innerText || (oneline || titleEl).textContent || "";
        return t.trim().replace(/\s+/g, " ").slice(0, 80);
    }
    function detectChallengeBlock(sectionLi) {
        const unfoldInfo = sectionLi.querySelector(":scope > .unfoldInfo");
        if (!unfoldInfo) return false;
        const text = unfoldInfo.textContent || unfoldInfo.innerText || "";
        return text.includes("闯关模式");
    }

    async function activateChapter(chapterLi, title) {
        if (chapterLi.querySelector(":scope > ul.rank-2")) return { activated: true };
        for (let attempt = 0; attempt < 2; attempt++) {
            try { title.click(); } catch (e) {}
            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
                await sleep(200);
                if (scanCancelFlag || stopRequested) return { activated: false };
                if (chapterLi.querySelector(":scope > ul.rank-2")) return { activated: true };
            }
            if (attempt === 0) await sleep(300);
        }
        return { activated: false };
    }

    async function activateSection(sectionLi, title) {
        if (sectionLi.querySelector(":scope > .resourcelist")) return { activated: true, hasResources: true };
        for (let attempt = 0; attempt < 2; attempt++) {
            try { title.click(); } catch (e) {}
            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
                await sleep(200);
                if (scanCancelFlag || stopRequested) return { activated: false, hasResources: false };
                if (sectionLi.querySelector(":scope > .resourcelist")) return { activated: true, hasResources: true };
                if (detectChallengeBlock(sectionLi)) return { activated: true, hasResources: false, challenge: true };
            }
            if (attempt === 0) await sleep(300);
        }
        return { activated: false, hasResources: false };
    }

    const GENERIC_NAME_WORDS = ["视频", "文档", "测验", "图片", "PPT", "其他", "讨论", "作业", "阅读", "资料", "任务", "文本", "附件"];

    function parseResource(el, path, ci, si, ri) {
        const nameSpan = el.querySelector(".tag-source-name");
        if (!nameSpan) return null;
        const isTaskpoint = nameSpan.classList.contains("taskpoint");
        if (!isTaskpoint) return null;

        const rawName = (nameSpan.innerText || "").trim();
        const isVideo  = !!el.querySelector(".icon-video");
        const isQuiz   = !!el.querySelector(".icon-dingdanguanli");
        const isDoc    = !!el.querySelector(".icon-wendang1");
        const isAttach = !!el.querySelector(".icon-huixingzhen");

        let type = "其他";
        if (isVideo) type = "视频";
        else if (isQuiz) type = "测验";
        else if (isDoc) type = "文档";
        else if (isAttach) type = "附件";
        else if (/测验|测试|考试|答题/.test(rawName)) type = "测验";
        else if (/讨论/.test(rawName)) type = "讨论";
        else if (/作业/.test(rawName)) type = "作业";
        else if (/文档|阅读|资料/.test(rawName)) type = "文档";

        let nameText = rawName;
        if (!nameText || GENERIC_NAME_WORDS.includes(nameText)) {
            nameText = path[path.length - 1] || "(未命名)";
        }
        return {
            el, name: nameText, type, isVideo, isTaskpoint: true,
            complete: el.classList.contains("complete"),
            path: path.slice(),
            _ci: ci, _si: si, _ri: ri
        };
    }

    async function scanCourse(fromCi = 0, fromSi = 0, autoStart = true) {
        if (scanning) { UI.log("扫描进行中", "warn"); return { challengeDetected: false }; }
        if (running) { UI.log("递归运行中，暂不扫描", "warn"); return { challengeDetected: false }; }

        const root = document.querySelector("ul.rank-1");
        if (!root) {
            UI.log("❌ 未找到课程目录 ul.rank-1。", "err");
            UI.setTaskInfo("❌ 未找到课程目录 <code>ul.rank-1</code>。");
            return { challengeDetected: false };
        }

        scanning = true;
        scanCancelFlag = false;
        stopRequested = false;
        UI.setScanning(true);
        UI.setChapterErrorLine("");
        UI.log(`🔍 开始顺序扫描课程目录（从第 ${fromCi + 1} 章）…`, "run");
        UI.setStatus("扫描中…");
        const t0 = performance.now();

        const items = [];

        if (fromCi > 0 || fromSi > 0) {
            for (const it of scanItems) {
                if (it.isChallengeMarker) continue;
                if (it._ci < fromCi) items.push(it);
                else if (it._ci === fromCi && it._si < fromSi) items.push(it);
            }
        }

        let failedChapters = 0, failedSections = 0;
        const failedChapterIdxs = [];
        let challengeDetected = false;
        let challengeAt = null;
        let chapterLIs = [];

        try {
            chapterLIs = Array.from(root.children).filter(el => el.classList.contains("catalogItem"));
            UI.log(`顶层章节数量：${chapterLIs.length}`, "info");

            const existing = UI.getChapterStatuses();
            const init = new Array(chapterLIs.length).fill("empty");
            for (let i = 0; i < chapterLIs.length; i++) {
                if (i < existing.length && existing[i]) init[i] = existing[i];
                else if (i < fromCi) init[i] = "ok";
            }
            UI.setChapterScanStatus(init);

            for (let i = 0; i < fromCi && i < chapterLIs.length; i++) {
                if (init[i] === "empty") UI.markChapterStatus(i, "ok");
            }

            for (let ci = fromCi; ci < chapterLIs.length; ci++) {
                if (scanCancelFlag || challengeDetected) break;

                UI.markChapterStatus(ci, "processing");
                UI.setStatus(`扫描章节 ${ci + 1}/${chapterLIs.length}`);

                let chapterHasError = false;
                try {
                    const chapterLi = chapterLIs[ci];
                    const chapterTitle = chapterLi.querySelector(":scope > .basic.chapter") || chapterLi.querySelector(":scope > .basic");
                    if (!chapterTitle) { UI.log(`第 ${ci+1} 章无标题元素`, "warn"); chapterHasError = true; continue; }
                    const chapterName = chapterNameOf(chapterTitle) || `第${ci+1}章`;
                    UI.log(`📖 章节 ${ci+1}：${chapterName}`, "info");

                    const chapResult = await activateChapter(chapterLi, chapterTitle);
                    if (!chapResult.activated) {
                        UI.log(`  ⚠ 章节展开失败`, "err");
                        failedChapters++; chapterHasError = true; continue;
                    }

                    const ul2 = chapterLi.querySelector(":scope > ul.rank-2");
                    if (!ul2 || ul2.children.length === 0) { UI.log(`  └ 无小节`, "debug"); continue; }
                    const sectionLIs = Array.from(ul2.children);
                    UI.log(`  └ 小节数：${sectionLIs.length}`, "debug");

                    const _startSi = (ci === fromCi) ? Math.max(0, Number(fromSi) || 0) : 0;
                    for (let si = _startSi; si < sectionLIs.length; si++) {
                        if (scanCancelFlag || challengeDetected) break;
                        const sectionLi = sectionLIs[si];
                        const sectionTitle = sectionLi.querySelector(":scope > .basic");
                        if (!sectionTitle) continue;
                        const sectionName = chapterNameOf(sectionTitle) || `第${si+1}节`;
                        const path = [chapterName, sectionName];

                        const secResult = await activateSection(sectionLi, sectionTitle);

                        if (secResult.challenge || detectChallengeBlock(sectionLi)) {
                            UI.log(`🛑 检测到闯关模式拦截：${sectionName}`, "warn");
                            challengeDetected = true;
                            challengeAt = { ci, si, chapterName, sectionName };
                            break;
                        }

                        if (!secResult.activated) {
                            UI.log(`    ⚠ ${sectionName.slice(0, 30)} 激活失败（超时），跳过该小节`, "warn");
                            failedSections++; chapterHasError = true;
                            if (/测验|测试|考试/.test(sectionName)) {
                                items.push({
                                    el: sectionTitle, name: sectionName, type: "测验",
                                    isVideo: false, isTaskpoint: true,
                                    complete: sectionTitle.classList.contains("complete"),
                                    path, _ci: ci, _si: si, _ri: -1
                                });
                            }
                            continue;
                        }

                        if (secResult.hasResources) {
                            const resourcelist = sectionLi.querySelector(":scope > .resourcelist");
                            const resources = Array.from(resourcelist.querySelectorAll(":scope > .basic"));
                            let added = 0;
                            for (let ri = 0; ri < resources.length; ri++) {
                                const info = parseResource(resources[ri], path, ci, si, ri);
                                if (info) { items.push(info); added++; }
                            }
                            UI.log(`    · ${sectionName.slice(0, 30)}（${added} 个任务点）`, "debug");
                        } else {
                            if (/测验|测试|考试/.test(sectionName)) {
                                items.push({
                                    el: sectionTitle, name: sectionName, type: "测验",
                                    isVideo: false, isTaskpoint: true,
                                    complete: sectionTitle.classList.contains("complete"),
                                    path, _ci: ci, _si: si, _ri: -1
                                });
                                UI.log(`    · ${sectionName.slice(0, 30)}（测验）`, "debug");
                            } else {
                                UI.log(`    · ${sectionName.slice(0, 30)}（激活成功但无资源）`, "debug");
                            }
                        }
                    }
                } catch (chapterErr) {
                    UI.log(`章节 ${ci+1} 扫描异常：${chapterErr && chapterErr.message ? chapterErr.message : chapterErr}`, "err");
                    chapterHasError = true;
                } finally {
                    if (challengeDetected) {
                        UI.markChapterStatus(ci, "challenge");
                        for (let k = ci + 1; k < chapterLIs.length; k++) UI.markChapterStatus(k, "challengePending");
                    } else {
                        if (chapterHasError) failedChapterIdxs.push(ci + 1);
                        UI.markChapterStatus(ci, chapterHasError ? "err" : "ok");
                    }
                }
            }
        } catch (e) {
            UI.log(`扫描异常：${e && e.message ? e.message : e}`, "err");
        }

        scanItems = items;
        _curCi = -1; _curSi = -1;
        _cacheRestored = true;

        const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

        if (challengeDetected) {
            challengeMode = true;
            challengeBlockPoint = challengeAt;
            scanItems.push(makeChallengeMarker());
            UI.log(`🛑 扫描已因闯关模式暂停：共 ${items.length} 个任务点（已保留），用时 ${elapsed}s`, "warn");
            UI.log(`   闯关拦截点：${challengeAt.chapterName} / ${challengeAt.sectionName}`, "warn");
        } else {
            challengeMode = false;
            challengeBlockPoint = null;
            UI.log(`✅ 扫描完成，共 ${items.length} 个任务点，用时 ${elapsed}s`, "ok");
            if (failedChapters || failedSections) UI.log(`⚠ 共 ${failedChapters} 章节、${failedSections} 小节激活失败`, "warn");
            if (failedChapterIdxs.length > 0) UI.setChapterErrorLine(`第${failedChapterIdxs.join("、")}章扫描时出现错误，请查看日志`);
        }

        UI.setScanResultText(scanItemsToText(scanItems));
        refreshAfterScanItemsChanged();

        scanning = false;
        UI.setScanning(false);

        saveScanCache();

        if (challengeDetected && !running && autoStart) {
            UI.log("🚀 检测到闯关，自动对已扫描部分开始递归…", "run");
            setTimeout(() => { if (!running) startRecursive("A"); }, 600);
        } else if (challengeDetected && !running && !autoStart) {
            UI.log("ℹ 扫描已完成（自动更新触发）。如要处理新发现的任务点，请手动点击「开始递归」", "info");
        }
        return { challengeDetected };
    }

    /* ============================================================
     * 【自动扫描循环】
     * ============================================================ */
    function startAutoScanLoop() {
        if (!autoScanEnabled) return;
        if (autoScanTimer) return;
        const intervalMs = Math.max(3, Number(getSettings().autoScanInterval) || 15) * 1000;
        UI.log(`已启动自动更新完成状态检查（每 ${intervalMs / 1000} 秒一次）`, "info");

        setTimeout(() => {
            if (autoScanInProgress) return;
            if (!autoScanEnabled) return;
            if (running || scanning) return;
            autoScanBeforeMarker().catch(() => {});
        }, 1500);

        autoScanTimer = setInterval(async () => {
            if (autoScanInProgress) return;
            if (running || scanning) return;
            await autoScanBeforeMarker();
        }, intervalMs);
    }
    function stopAutoScanLoop() {
        if (autoScanTimer) { clearInterval(autoScanTimer); autoScanTimer = null; }
    }

    async function autoScanBeforeMarker() {
        if (autoScanInProgress) return;
        if (!challengeMode) return;
        if (running || scanning) return;

        const markerIdx = findMarkerIdx();
        if (markerIdx < 0) return;

        const pending = [];
        for (let i = 0; i < markerIdx; i++) {
            const it = scanItems[i];
            if (it.isChallengeMarker) continue;
            if (!it.isTaskpoint) continue;
            if (it.complete) continue;
            pending.push(it);
        }

        if (pending.length === 0) {
            const beforeMarker = scanItems.slice(0, markerIdx).filter(it => !it.isChallengeMarker);
            const allDone = beforeMarker.length > 0 && beforeMarker.every(it => it.complete);
            if (allDone) {
                UI.log("🎉 闯关前所有任务点已完成！继续向后扫描…", "ok");
                stopAutoScanLoop();
                setTimeout(() => { continueScanAfterChallenge(); }, 1200);
            }
            return;
        }

        autoScanInProgress = true;
        UI.setAutoScanning(true);
        UI.log(`自动更新完成状态：待检查 ${pending.length} 个未完成任务点`, "debug");

        try {
            for (const it of pending) {
                if (it._ci < 0 || it._si < 0) {
                    const found = await findSectionByPath(it.path);
                    if (found) { it._ci = found.ci; it._si = found.si; }
                }
            }

            const sectionMap = new Map();
            for (const it of pending) {
                if (it._ci < 0 || it._si < 0) continue;
                const key = it._ci + "," + it._si;
                if (!sectionMap.has(key)) sectionMap.set(key, { ci: it._ci, si: it._si, items: [] });
                sectionMap.get(key).items.push(it);
            }

            let changed = 0;
            const root = document.querySelector("ul.rank-1");

            if (root) {
                const chapterLIs = Array.from(root.children).filter(el => el.classList.contains("catalogItem"));
                for (const { ci, si, items: pendingItems } of sectionMap.values()) {
                    try {
                        const chapterLi = chapterLIs[ci];
                        if (!chapterLi) continue;
                        const chapterTitle = chapterLi.querySelector(":scope > .basic.chapter") || chapterLi.querySelector(":scope > .basic");
                        if (chapterTitle) await activateChapter(chapterLi, chapterTitle);
                        const ul2 = chapterLi.querySelector(":scope > ul.rank-2");
                        if (!ul2) continue;
                        const sectionLi = ul2.children[si];
                        if (!sectionLi) continue;
                        const sectionTitle = sectionLi.querySelector(":scope > .basic");
                        if (sectionTitle) await activateSection(sectionLi, sectionTitle);

                        const rl = sectionLi.querySelector(":scope > .resourcelist");
                        const resources = rl ? Array.from(rl.querySelectorAll(":scope > .basic")) : [];

                        for (const it of pendingItems) {
                            let domEl = null;
                            if (it._ri === -1) domEl = sectionTitle;
                            else if (it._ri >= 0 && it._ri < resources.length) domEl = resources[it._ri];
                            else continue;
                            if (!domEl) continue;
                            const isComplete = domEl.classList.contains("complete");
                            if (isComplete && it.complete !== true) {
                                it.complete = true;
                                changed++;
                                UI.log(`自动更新：${it.name} 已完成（更新对应行）`, "ok");
                            }
                        }
                    } catch (e) {
                        UI.log(`自动更新 (${ci},${si}) 异常：${e && e.message ? e.message : e}`, "warn");
                    }
                }
            }

            if (changed > 0) {
                UI.setScanResultText(scanItemsToText(scanItems));
                refreshAfterScanItemsChanged();
                UI.log(`自动更新：更新了 ${changed} 个任务点状态`, "ok");
                scheduleSave();
            }
        } finally {
            UI.setAutoScanning(false);
            autoScanInProgress = false;
        }

        const idx = findMarkerIdx();
        if (idx < 0) return;
        const beforeMarker = scanItems.slice(0, idx).filter(it => !it.isChallengeMarker);
        const allDone = beforeMarker.length > 0 && beforeMarker.every(it => it.complete);
        if (allDone) {
            UI.log("🎉 闯关前所有任务点已完成！继续向后扫描…", "ok");
            stopAutoScanLoop();
            setTimeout(() => { continueScanAfterChallenge(); }, 1200);
        }
    }

    async function continueScanAfterChallenge() {
        if (!challengeBlockPoint) return;
        if (running || scanning) return;
        const prevKey = `${challengeBlockPoint.ci}:${challengeBlockPoint.si}:${challengeBlockPoint.sectionName}`;
        if (_lastChallengeKey === prevKey) {
            UI.log(`⚠ 闯关拦截点未推进：${challengeBlockPoint.chapterName} / ${challengeBlockPoint.sectionName}`, "err");
            UI.log("已停止自动继续扫描以避免死循环。", "warn");
            stopAutoScanLoop();
            autoScanEnabled = false;
            UI.setAutoScanEnabled(false);
            return;
        }
        _lastChallengeKey = prevKey;

        const _savedCi = Number(challengeBlockPoint.ci) || 0;
        const _savedSi = Number(challengeBlockPoint.si) || 0;

        // 不预检查，直接重新扫描拦截点所在小节；由 scanCourse 内部的 detectChallengeBlock
        // 判断该小节是否仍被闯关限制。若仍被限制，scanCourse 会再次把 challengeBlockPoint
        // 设为同一位置并返回；下次进入本函数时 prevKey 相同即自动停止，避免死循环。
        UI.log(`➡ 从闯关拦截点重新扫描（第 ${_savedCi + 1} 章第 ${_savedSi + 1} 节）…`, "run");
        scanItems = scanItems.filter(it => !it.isChallengeMarker);
        challengeMode = false;
        UI.setChallengeMode(false);
        challengeBlockPoint = null;
        await scanCourse(_savedCi, _savedSi, false);
    }

    /* ============================================================
     * 【递归】
     * ============================================================ */
    function resolveStartIndex(mode) {
        const auto = _getSubmitMode() === "auto";
        const markerIdx = findMarkerIdx();
        const limit = markerIdx >= 0 ? markerIdx : scanItems.length;
        const _skip = (it) => _sessionOkItems.has(_okKey(it));

        /* 从 0 开始找第一个未完成的任务点（跳过闯关标记、非任务点、已完成、本次会话已处理） */
        function _firstPendingIdx() {
            for (let i = 0; i < limit; i++) {
                const it = scanItems[i];
                if (it.isChallengeMarker) continue;
                if (!it.isTaskpoint) continue;
                if (it.complete) continue;
                if (_skip(it)) continue;
                return i;
            }
            return -1;
        }

        /* auto 模式下，无论用户选的是 A 还是 B，都从第一个未完成项开始。
           原因：mode B 从"最后一个已完成项之后"查找时，如果剩余未完成项位于更前面
           （例如最后一个已完成视频是 1.5 节，而未完成项位于 1.5 之前的某个测验），
           就会返回 -1，导致递归立即结束、表现为"点击开始递归无反应"。
           auto 模式下目标是处理所有未完成项，从最早的开始最稳。 */
        if (auto) return _firstPendingIdx();

        if (mode === "A") return _firstPendingIdx();

        /* 非 auto 的 mode B：先从最后一个已完成视频之后查找 */
        if (lastDoneVideoIdx >= 0) {
            for (let i = lastDoneVideoIdx + 1; i < limit; i++) {
                const it = scanItems[i];
                if (it.isChallengeMarker) continue;
                if (!it.isTaskpoint) continue;
                if (it.complete) continue;
                if (_skip(it)) continue;
                return i;
            }
            /* 断点之后无未完成项，回退到第一个未完成项，避免"点击无反应" */
            const fb = _firstPendingIdx();
            if (fb >= 0) return fb;
            return -1;
        }

        return _firstPendingIdx();
    }

    async function focusTaskpoint(item) {
        const root = document.querySelector("ul.rank-1");
        if (!root) return null;
        let ci = item._ci, si = item._si;
        if (ci < 0 || si < 0) {
            UI.log(`索引无效，按路径重新定位：${item.path.join("/")}`, "info");
            const found = await findSectionByPath(item.path);
            if (!found) { UI.log(`❌ 路径定位失败：${item.path.join("/")}`, "err"); return null; }
            ci = found.ci; si = found.si;
            item._ci = ci; item._si = si;
            if (item._ri < 0) item._ri = 0;
        }
        const chapterLIs = Array.from(root.children).filter(el => el.classList.contains("catalogItem"));
        if (ci >= chapterLIs.length) return null;
        const chapterLi = chapterLIs[ci];
        if (ci !== _curCi) {
            const chapterTitle = chapterLi.querySelector(":scope > .basic.chapter") || chapterLi.querySelector(":scope > .basic");
            const r = await activateChapter(chapterLi, chapterTitle);
            if (!r.activated) return null;
            _curCi = ci; _curSi = -1;
        }
        const ul2 = chapterLi.querySelector(":scope > ul.rank-2");
        if (!ul2) return null;
        const sectionLIs = Array.from(ul2.children);
        if (si < 0 || si >= sectionLIs.length) return null;
        const sectionLi = sectionLIs[si];
        if (si !== _curSi) {
            const sectionTitle = sectionLi.querySelector(":scope > .basic");
            await activateSection(sectionLi, sectionTitle);
            _curSi = si;
        }
        if (detectChallengeBlock(sectionLi)) {
            UI.log(`🛑 小节"${item.path[item.path.length-1]}"被闯关模式拦截`, "warn");
            return null;
        }

        const rl = sectionLi.querySelector(":scope > .resourcelist");
        if (item.isVideo) {
            if (!rl) { UI.log(`⚠ 小节无资源列表："${item.path[item.path.length-1]}"`, "warn"); return null; }
            const resources = Array.from(rl.querySelectorAll(":scope > .basic"));
            if (resources.length === 0) { UI.log(`⚠ 小节资源列表为空："${item.path[item.path.length-1]}"`, "warn"); return null; }
            const ri = item._ri >= 0 ? item._ri : 0;
            if (ri >= resources.length) return resources[0];
            return resources[ri];
        }
        if (rl) {
            const resources = Array.from(rl.querySelectorAll(":scope > .basic"));
            if (resources.length > 0) {
                const ri = item._ri >= 0 ? item._ri : 0;
                if (ri < resources.length) return resources[ri];
                for (const r of resources) {
                    const nameSpan = r.querySelector(".tag-source-name");
                    if (nameSpan && (nameSpan.innerText || "").trim() === item.name) return r;
                }
                return resources[0];
            }
        }
        return sectionLi.querySelector(":scope > .basic");
    }

    async function processNonVideoTaskpoint(item) {
        const el = await focusTaskpoint(item);
        if (!el) {
            UI.log(`❌ 无法定位任务点：${item.name}`, "err");
            return false;
        }

        try { el.click(); } catch (e) {}
        await sleep(1500);

        if (item.type === "测验") {
            /* 通知 UI：递归已运行到测验任务点。
               按钮切回"智能答题（当前选中任务点）"，并显示题目处理进度。
               无论 QuizSolver.start() 正常返回还是抛异常，最后都会复位。
               QuizSolver.start() 内部会：
                 - 写题目缓存（QuizCache.save）
                 - 通过 onEvent('progress', ...) 更新按钮进度
                 - 通过 onEvent('log', ...) 追加到智能闯关日志
                 - 结束后按 _getSubmitMode() 的最新值决定是否自动提交 */
            try { UI.setRecursiveAtQuiz(true); } catch (e) {}
            try {
                const questions = await waitForQuizLoaded(null, null, 30000);
                if (questions.length === 0) {
                    UI.log(`⚠ 未加载到测验题目：${item.name}`, "warn");
                    return false;
                }

                UI.log(`开始智能答题：${item.name}`, "run");
                const result = await QuizSolver.start({ isRecursive: true });
                return !!(result && result.submitted);
            } finally {
                try { UI.setRecursiveAtQuiz(false); } catch (e) {}
            }
        }

        await sleep(2000);
        await rescanCurrentSection(item);
        return !!item.complete;
    }

    async function findSectionByPath(path) {
        const root = document.querySelector("ul.rank-1");
        if (!root || !path || path.length < 2) return null;
        const chapterLIs = Array.from(root.children).filter(el => el.classList.contains("catalogItem"));
        const chapterName = path[0], sectionName = path[1];
        for (let ci = 0; ci < chapterLIs.length; ci++) {
            const chapterLi = chapterLIs[ci];
            const chapterTitle = chapterLi.querySelector(":scope > .basic.chapter") || chapterLi.querySelector(":scope > .basic");
            if (!chapterTitle) continue;
            if (chapterNameOf(chapterTitle) !== chapterName) continue;
            const r = await activateChapter(chapterLi, chapterTitle);
            if (!r.activated) continue;
            const ul2 = chapterLi.querySelector(":scope > ul.rank-2");
            if (!ul2) continue;
            const sectionLIs = Array.from(ul2.children);
            for (let si = 0; si < sectionLIs.length; si++) {
                const sectionLi = sectionLIs[si];
                const sectionTitle = sectionLi.querySelector(":scope > .basic");
                if (!sectionTitle) continue;
                if (chapterNameOf(sectionTitle) !== sectionName) continue;
                return { ci, si, sectionLi };
            }
        }
        return null;
    }

    async function rescanCurrentSection(item) {
        if (item._ci < 0 || item._si < 0) return;
        const root = document.querySelector("ul.rank-1");
        if (!root) return;
        const chapterLIs = Array.from(root.children).filter(el => el.classList.contains("catalogItem"));
        const chapterLi = chapterLIs[item._ci];
        if (!chapterLi) return;
        const ul2 = chapterLi.querySelector(":scope > ul.rank-2");
        if (!ul2) return;
        const sectionLi = ul2.children[item._si];
        if (!sectionLi) return;
        const rl = sectionLi.querySelector(":scope > .resourcelist");
        if (!rl) return;
        const resources = Array.from(rl.querySelectorAll(":scope > .basic"));
        let changed = 0;
        for (let ri = 0; ri < resources.length; ri++) {
            const isComplete = resources[ri].classList.contains("complete");
            for (const it of scanItems) {
                if (it.isChallengeMarker) continue;
                if (it._ci === item._ci && it._si === item._si && it._ri === ri) {
                    if (it.complete !== isComplete) { it.complete = isComplete; changed++; }
                    break;
                }
            }
        }
        if (changed > 0) {
            UI.setScanResultText(scanItemsToText(scanItems));
            refreshAfterScanItemsChanged();
            UI.log(`本小节重扫：更新 ${changed} 个任务点状态`, "debug");
            scheduleSave();
        }
    }

    function waitVideoEnd(timeoutMs) {
        if (!timeoutMs) timeoutMs = 40 * 60 * 1000;
        return new Promise(resolve => {
            const video = getVideoEl();
            if (!video) { resolve(false); return; }
            let settled = false;
            let pollTimer = null, timeoutTimer = null;
            const cleanup = () => {
                video.removeEventListener("ended", onEnded);
                if (pollTimer) clearInterval(pollTimer);
                if (timeoutTimer) clearTimeout(timeoutTimer);
            };
            const finish = ok => {
                if (settled) return;
                settled = true; cleanup();
                setTimeout(() => resolve(ok), 900);
            };
            const onEnded = () => finish(true);
            video.addEventListener("ended", onEnded);
            const ensurePlay = () => {
                try {
                    if (!video.muted) video.muted = true;
                    const rate = Number(getSettings().videoPlaybackRate) || 2;
                    if (Math.abs(video.playbackRate - rate) > 0.01) video.playbackRate = rate;
                    if (video.paused && !video.ended) video.play().catch(() => {});
                } catch (e) {}
            };
            ensurePlay();
            pollTimer = setInterval(() => {
                if (stopRequested) { finish(false); return; }
                ensurePlay();
                if (video.ended) { finish(true); return; }
            }, 1000);
            const playBtn = document.querySelector(".vjs-big-play-button");
            if (playBtn) playBtn.click();
            timeoutTimer = setTimeout(() => { UI.log("⏱ 播放超时", "warn"); finish(false); }, timeoutMs);
        });
    }

    async function playTaskpoint(item) {
        let el;
        try { el = await focusTaskpoint(item); }
        catch (e) { UI.log(`定位异常：${e && e.message ? e.message : e}`, "err"); return false; }
        if (!el) { UI.log(`❌ 无法定位任务点：${item.name}`, "err"); return false; }
        if (el.classList.contains("complete")) {
            if (!item.complete) {
                item.complete = true;
                UI.setScanResultText(scanItemsToText(scanItems));
                refreshAfterScanItemsChanged();
                UI.log(`⏭ 检测到已完成，自动更新：${item.name}`, "info");
                scheduleSave();
            } else {
                UI.log(`⏭ 页面显示已完成：${item.name}`, "debug");
            }
            return true;
        }
        UI.log(`▶ 开始播放：${item.name}`, "run");
        UI.setStatus(`播放中：${item.name.slice(0, 18)}`);
        try { el.click(); }
        catch (e) { UI.log(`点击异常：${e && e.message ? e.message : e}`, "err"); return false; }
        await sleep(1500);
        clearShader();
        let video = getVideoEl();
        if (!video) {
            UI.log("未找到播放器，等待 3 秒后重试…", "warn");
            await sleep(3000);
            video = getVideoEl();
            if (!video) { UI.log("❌ 未找到播放器，跳过", "err"); return false; }
        }
        const ok = await waitVideoEnd();
        if (ok) UI.log(`✅ 完成：${item.name}`, "ok");
        else UI.log(`⚠ 未正常结束：${item.name}`, "warn");
        return ok;
    }

    async function startRecursive(mode) {
        if (running) { UI.log("递归已在运行中", "warn"); return; }
        if (!scanItems.length) { UI.log("❌ 尚未扫描，无法开始", "err"); return; }

        const MAX_AUTO_RETRY = 3;
        let autoRetryCount = 0;
        let currentMode = mode;

        running = true;
        stopRequested = false;
        _curCi = -1; _curSi = -1;
        _sessionOkItems = new Set();
        UI.setRunning(true);
        try { UI.setRecursiveAtQuiz(false); } catch (e) {}

        while (true) {
            const startIdx = resolveStartIndex(currentMode);
            if (startIdx < 0) {
                if (autoRetryCount === 0) {
                    UI.log("ℹ 无可递归的起点（可能已全部完成或仅剩闯关限制）", "warn");
                } else {
                    UI.log("ℹ 自动重试时无可递归的起点，流程结束", "info");
                }
                break;
            }

            const startItem = scanItems[startIdx];
            syncTaskProgress();
            UI.setStatus("递归运行中…");
            if (autoRetryCount === 0) {
                UI.log(`🚀 递归开始（模式 ${currentMode}），起点：第 ${startIdx + 1} 项 —— ${startItem ? startItem.name : "?"}`, "run");
            } else {
                UI.log(`🔄 自动重试递归（第 ${autoRetryCount}/${MAX_AUTO_RETRY} 次，模式 A），起点：第 ${startIdx + 1} 项 —— ${startItem ? startItem.name : "?"}`, "run");
            }

            let hitChallengeMarker = false;
            let pausedByUser = false;

            for (let i = startIdx; i < scanItems.length; i++) {
                if (stopRequested) { UI.log("⏹ 递归已被手动暂停", "warn"); pausedByUser = true; break; }
                const item = scanItems[i];
                if (item.isChallengeMarker) { UI.log("🛑 遇到闯关限制标记，停止当前递归", "warn"); hitChallengeMarker = true; break; }
                if (!item.isTaskpoint) continue;
                if (item.complete) continue;
                if (_sessionOkItems.has(_okKey(item))) continue;

                if (item.isVideo) {
                    const ok = await playTaskpoint(item);
                    if (ok) {
                        _sessionOkItems.add(_okKey(item));
                        item.complete = true;
                        UI.setScanResultText(scanItemsToText(scanItems));
                        await rescanCurrentSection(item);
                        syncTaskProgress();
                        scheduleSave();
                    }
                } else {
                    if (_getSubmitMode() === "auto") {
                        UI.log(`▶ 处理任务点（${item.type}）：${item.name}`, "run");
                        const ok = await processNonVideoTaskpoint(item);
                        if (ok) {
                            _sessionOkItems.add(_okKey(item));
                            item.complete = true;
                            UI.setScanResultText(scanItemsToText(scanItems));
                            await rescanCurrentSection(item);
                            syncTaskProgress();
                            scheduleSave();
                        }
                    } else {
                        UI.log(`⏭ 跳过非视频（${item.type}）：${item.name}`, "info");
                    }
                }
            }

            if (pausedByUser || stopRequested) break;
            if (!hitChallengeMarker) break;

            /* 遇到闯关限制标记：检查断点之前是否仍有未完成任务点 */
            const markerIdxNow = findMarkerIdx();
            const limitNow = markerIdxNow >= 0 ? markerIdxNow : scanItems.length;

            function _countPending() {
                let n = 0;
                for (let i = 0; i < limitNow; i++) {
                    const it = scanItems[i];
                    if (it.isChallengeMarker) continue;
                    if (!it.isTaskpoint) continue;
                    if (it.complete) continue;
                    if (_sessionOkItems.has(_okKey(it))) continue;
                    n++;
                }
                return n;
            }

            let pendingBefore = _countPending();
            if (pendingBefore === 0) {
                UI.log("ℹ 断点之前已无未完成任务点，递归正常结束", "info");
                break;
            }

            if (autoRetryCount >= MAX_AUTO_RETRY) {
                UI.log(`⚠ 断点之前仍有 ${pendingBefore} 个未完成任务点，但已自动重试 ${MAX_AUTO_RETRY} 次，停止自动重试`, "warn");
                break;
            }

            /* 先重扫断点之前的相关小节，尽量让 DOM 状态同步 */
            UI.log(`🔍 断点之前仍有 ${pendingBefore} 个未完成任务点，先重扫相关小节…`, "info");
            try {
                for (let i = 0; i < limitNow; i++) {
                    const it = scanItems[i];
                    if (it.isChallengeMarker) continue;
                    if (!it.isTaskpoint) continue;
                    if (it.complete) continue;
                    if (_sessionOkItems.has(_okKey(it))) continue;
                    try { await rescanCurrentSection(it); } catch (e) {}
                }
            } catch (e) {}

            let pendingAfter = _countPending();
            if (pendingAfter === 0) {
                UI.log("✅ 重扫后所有任务点已完成，递归正常结束", "ok");
                break;
            }

            autoRetryCount++;
            currentMode = "A";
            UI.log(`🔄 重扫后仍有 ${pendingAfter} 个未完成任务点，自动从第一个未完成任务点重新递归…`, "info");
            await sleep(1500);
            _curCi = -1; _curSi = -1;
        }

        running = false;
        UI.setRunning(false);
        refreshAfterScanItemsChanged();
        UI.setStatus(stopRequested ? "已暂停" : "递归结束");
        UI.log(stopRequested ? "⏸ 递归已暂停" : "🏁 递归流程结束", stopRequested ? "warn" : "ok");
        saveScanCache();
        if (challengeMode && autoScanEnabled && !autoScanTimer && !scanning && !recordQuizRunning) {
            setTimeout(() => {
                if (!running && !scanning && !autoScanTimer) {
                    startAutoScanLoop();
                    UI.log("▶ 递归结束后已自动恢复完成状态检查", "info");
                }
            }, 1500);
        }
    }

    /* ============================================================
     * 【记录已完成测验】
     * ============================================================ */
    function readSelectedAnswer(q) {
        try {
            const answerBox = q.boxEl.querySelector(".answerBox");
            if (answerBox) {
                let correctAnswer = "";
                let studentAnswer = "";
                const titleEls = answerBox.querySelectorAll(".answerBox-title");
                titleEls.forEach(titleEl => {
                    const title = (titleEl.textContent || "").trim();
                    const contentEl = titleEl.nextElementSibling;
                    if (!contentEl) return;
                    const content = (contentEl.textContent || "").trim();
                    if (title.includes("正确答案")) correctAnswer = content;
                    else if (title.includes("你的答案")) studentAnswer = content;
                });
                const ans = correctAnswer || studentAnswer;
                if (ans) {
                    if (q.type === "text") return ans.replace(/<[^>]+>/g, "").trim().slice(0, 60);
                    const labels = new Set(q.options.map(o => (o.label || "").toUpperCase()));
                    const letters = (ans.toUpperCase().match(/[A-Z]/g) || []).filter(L => labels.has(L));
                    const unique = Array.from(new Set(letters)).sort();
                    if (unique.length > 0) return unique.join("");
                }
            }
            if (q.type === "single" || q.type === "multiple") {
                const labels = [];
                const opts = q.boxEl.querySelectorAll(".ti-a");
                opts.forEach((opt) => {
                    const input = opt.querySelector('input[type="radio"], input[type="checkbox"]');
                    if (input && input.checked) {
                        const labelEl = opt.querySelector(".ti-a-i");
                        let label = (labelEl?.innerText || "").trim().replace(/[\.\s].*/, "").slice(0, 2);
                        if (label) labels.push(label.toUpperCase());
                    }
                });
                labels.sort();
                return labels.length > 0 ? labels.join("") : null;
            }
            if (q.type === "text") {
                const ueBox = q.boxEl.querySelector(".ue-container");
                if (!ueBox) return null;
                const ta = ueBox.querySelector('textarea.hide, textarea');
                if (ta && ta.value) return String(ta.value).replace(/<[^>]+>/g, "").trim().slice(0, 60);
                const doc = ueBox.ownerDocument;
                const win = (doc && doc.defaultView) || window;
                const UE = win.UE || (win.parent && win.parent.UE);
                if (UE && UE.instants) {
                    for (const k of Object.keys(UE.instants)) {
                        const inst = UE.instants[k];
                        if (!inst) continue;
                        try {
                            const html = inst.getContent() || "";
                            const text = String(html).replace(/<[^>]+>/g, "").trim().slice(0, 60);
                            if (text) return text;
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    async function waitForQuizLoaded(expectedTaskId, expectedTitle, timeoutMs) {
        timeoutMs = timeoutMs || 30000;
        const t0 = Date.now();
        while (Date.now() - t0 < timeoutMs) {
            await sleep(500);
            const doc = getQuizDoc();
            if (!doc) continue;
            const containers = doc.querySelectorAll(".testPaperShow .queContainer");
            if (containers.length === 0) continue;
            let curTaskId = "";
            try {
                const win = doc.defaultView || window;
                curTaskId = win.taskId || "";
            } catch (e) {}
            if (expectedTaskId && curTaskId && curTaskId !== expectedTaskId) continue;
            if (expectedTitle) {
                const tEl = doc.querySelector(".testPaper-Top .fl_left");
                const curTitle = tEl ? (tEl.innerText || "").trim() : "";
                if (curTitle && curTitle !== expectedTitle) {
                    if (Date.now() - t0 < 5000) continue;
                }
            }
            const questions = QuizExtractor_extract();
            if (questions.length > 0) return questions;
        }
        return [];
    }

    async function recordCompletedQuizzes() {
        if (recordQuizRunning) return;

        const markerIdx = findMarkerIdx();
        const limit = markerIdx >= 0 ? markerIdx : scanItems.length;

        const doneQuizzes = [];
        for (let i = 0; i < limit; i++) {
            const it = scanItems[i];
            if (it.isChallengeMarker) continue;
            if (!it.isTaskpoint) continue;
            if (it.type !== "测验") continue;
            if (!it.complete) continue;
            doneQuizzes.push(it);
        }
        if (doneQuizzes.length === 0) {
            UI.log("没有已完成的测验任务点需要记录", "info");
            UI.setStatus("记录已完成测验：无已完成测验");
            return;
        }

        suspendAutoScanForMutex();
        recordQuizRunning = true;
        UI.refreshButtonStates();
        UI.setStatus(`记录已完成测验中（共 ${doneQuizzes.length} 个）…`);
        UI.log(`开始记录已完成测验：共 ${doneQuizzes.length} 个`, "run");

        let ok = 0, skip = 0;
        try {
            for (let k = 0; k < doneQuizzes.length; k++) {
                const q = doneQuizzes[k];
                UI.setStatus(`记录已完成测验 (${k + 1}/${doneQuizzes.length})…`);
                try {
                    const el = await focusTaskpoint(q);
                    if (!el) { skip++; UI.log(`无法定位：${q.name}`, "warn"); continue; }
                    const beforeInfo = getTaskpointInfo();
                    try { el.click(); } catch (e) {}
                    clearShader();
                    const oldHash = location.hash;
                    for (let w = 0; w < 15; w++) {
                        await sleep(200);
                        if (location.hash !== oldHash) break;
                        if (getQuizDoc()) break;
                    }
                    const loadedQuestions = await waitForQuizLoaded(null, null, 30000);
                    await sleep(400);
                    let questions = loadedQuestions.length > 0 ? loadedQuestions : QuizExtractor_extract();
                    if (questions.length === 0) {
                        await sleep(3000);
                        questions = QuizExtractor_extract();
                    }
                    if (questions.length === 0) {
                        skip++;
                        UI.log(`无题目可提取：${q.name}（可能未成功进入任务点）`, "warn");
                        try {
                            const doc = getQuizDoc();
                            const hasShow = !!(doc && doc.querySelector(".testPaperShow"));
                            const hasQue  = !!(doc && doc.querySelector(".testPaperShow .queContainer"));
                            const curInfo = getTaskpointInfo();
                            const iframeCount = document.querySelectorAll("iframe").length;
                            const dataIframeCount = document.querySelectorAll("[data-iframe-src]").length;
                            UI.log(`诊断：testPaperShow=${hasShow}, queContainer=${hasQue}, 当前任务点=${curInfo.title || curInfo.taskId}, 点击前任务点=${beforeInfo.title || beforeInfo.taskId}, iframe=${iframeCount}, data-iframe-src=${dataIframeCount}`, "debug");
                        } catch (e) {}
                        continue;
                    }
                    let tpInfo = getTaskpointInfo();
                    if (!tpInfo.title || tpInfo.taskId === "unknown") {
                        for (let attempt = 0; attempt < 8; attempt++) {
                            await sleep(300);
                            const retry = getTaskpointInfo();
                            if (retry.title || (retry.taskId && retry.taskId !== "unknown")) { tpInfo = retry; break; }
                        }
                        if (!tpInfo.title || tpInfo.taskId === "unknown") {
                            try {
                                const doc = getQuizDoc();
                                if (doc) {
                                    const t1 = doc.querySelector(".testPaper-Top .fl_left");
                                    if (t1) {
                                        const title = (t1.innerText || t1.textContent || "").trim();
                                        if (title) tpInfo = { taskId: title, title };
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                    const cache = QuizCache.ensure();
                    let effectiveTaskId = tpInfo.taskId;
                    if (!cache.taskpoints[effectiveTaskId]) {
                        const hashSet = new Set(questions.map(q => q.hash));
                        for (const tid in cache.taskpoints) {
                            const etp = cache.taskpoints[tid];
                            if (!etp || !Array.isArray(etp.questions)) continue;
                            let found = false;
                            for (const eq of etp.questions) {
                                if (eq && hashSet.has(eq.hash)) { found = true; break; }
                            }
                            if (found) { effectiveTaskId = tid; break; }
                        }
                        if (effectiveTaskId !== tpInfo.taskId) {
                            UI.log(`检测到题目哈希已在缓存任务点 ${effectiveTaskId} 中，合并到该任务点`, "ok");
                        }
                    }
                    if (!cache.taskpoints[effectiveTaskId]) {
                        cache.taskpoints[effectiveTaskId] = { taskId: tpInfo.taskId, title: tpInfo.title, questions: [], timestamp: Date.now() };
                    }
                    const tp = cache.taskpoints[effectiveTaskId];
                    tp.title = tpInfo.title || tp.title;
                    tp.timestamp = Date.now();
                    const existMap = new Map();
                    for (const eq of tp.questions) existMap.set(eq.hash, eq);
                    for (const qq of questions) {
                        const answers = readSelectedAnswer(qq);
                        const entry = existMap.get(qq.hash);
                        if (entry) {
                            if (answers && !entry.answer) entry.answer = answers;
                            entry.timestamp = Date.now();
                        } else {
                            tp.questions.push({
                                index: qq.index, hash: qq.hash, type: qq.type,
                                question: qq.question, options: qq.options,
                                answer: answers || null, timestamp: Date.now(),
                            });
                        }
                    }
                    QuizCache.save(cache);
                    ok++;
                    UI.log(`已记录：${tp.title || tp.taskId}（${tp.questions.length} 题）`, "ok");
                } catch (e) {
                    skip++;
                    UI.log(`记录失败：${q.name} - ${e.message}`, "warn");
                }
            }
        } finally {
            recordQuizRunning = false;
            UI.refreshButtonStates();
            UI.log(`记录已完成测验结束：成功 ${ok} 个，跳过 ${skip} 个`, skip > 0 ? "warn" : "ok");
            UI.setStatus(`记录已完成测验结束（成功 ${ok}）`);
            resumeAutoScanAfterMutex();
        }
    }

    /* ============================================================
     * 【任务点切换检测】用户切到别的题 → 重置"智能答题"按钮
     * ============================================================ */
    const _quizDocBound = new WeakSet();
    function bindQuizDocListeners(doc) {
        if (!doc || _quizDocBound.has(doc)) return;
        _quizDocBound.add(doc);
        try {
            const queList = doc.querySelector("#queList");
            if (queList) {
                queList.addEventListener("click", () => {
                    if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) return;
                    if (UI.isQuizButtonCompleted && UI.isQuizButtonCompleted()) UI.resetQuizButton();
                }, true);
            }
            doc.addEventListener("mouseover", (e) => {
                try {
                    const t = e.target;
                    if (!t) return;
                    const box = t.closest && t.closest(".queContainer");
                    if (!box) return;
                    if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) return;
                    if (UI.isQuizButtonCompleted && UI.isQuizButtonCompleted()) UI.resetQuizButton();
                } catch (e) {}
            }, true);
        } catch (e) {}
    }
    setInterval(() => {
        const doc = getQuizDoc();
        if (doc) bindQuizDocListeners(doc);
    }, 2000);

    /* ============================================================
     * 【UI 回调】
     * ============================================================ */
    UI.onStart(async () => {
        if (running) {
            stopRequested = true;
            const video = getVideoEl();
            if (video && !video.paused) { try { video.pause(); } catch (e) {} }
            UI.log("⏸ 用户请求暂停", "warn");
            UI.setStatus("递归已暂停");
            return;
        }
        if (scanning) { UI.log("扫描中，请稍候…", "warn"); return; }
        if (recordQuizRunning) { UI.log("记录已完成测验进行中，请稍候…", "warn"); return; }
        if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) { UI.log("智能答题进行中，请稍候…", "warn"); return; }

        _lastChallengeKey = null;

        if (!scanItems.length) {
            UI.log("当前扫描结果为空，将先进行扫描…", "info");
            suspendAutoScanForMutex();
            try { await scanCourse(); } finally {}
            if (!scanItems.length) {
                UI.log("❌ 扫描完成但未发现任务点", "err");
                resumeAutoScanAfterMutex();
                return;
            }
        } else {
            UI.log(`使用当前扫描结果（共 ${scanItems.length} 个任务点）开始递归`, "info");
        }

        const mode = UI.getSelectedOption();
        if (!mode) { UI.log("❌ 未选择有效的递归模式", "err"); resumeAutoScanAfterMutex(); return; }
        UI.log(`用户选择递归模式：${mode === "A" ? "从第一个未完成视频开始" : "从最后一个已完成视频之后开始"}`, "run");

        suspendAutoScanForMutex();
        try { await startRecursive(mode); } finally { resumeAutoScanAfterMutex(); }
    });

    UI.onRescan(async () => {
        if (running) { UI.log("递归运行中，无法扫描", "warn"); return; }
        if (scanning) { UI.log("扫描进行中…", "warn"); return; }
        if (recordQuizRunning) { UI.log("记录已完成测验进行中，无法扫描", "warn"); return; }
        if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) { UI.log("智能答题进行中，无法扫描", "warn"); return; }

        suspendAutoScanForMutex();
        stopAutoScanLoop();
        challengeMode = false;
        challengeBlockPoint = null;
        scanItems = [];
        autoScanEnabled = true;
        _cacheRestored = false;
        _lastSavedHash = null;
        _lastChallengeKey = null;
        UI.setAutoScanEnabled(true);
        UI.setStatus("重新扫描中…");
        UI.resetQuizButton();
        try { await scanCourse(0, 0, false); } finally { UI.setStatus("待机（未扫描）"); resumeAutoScanAfterMutex(); }
    });

    UI.onUpdateScan(() => {
        if (running || scanning || recordQuizRunning) { UI.log("其他任务进行中，无法更新扫描结果", "warn"); return; }
        if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) { UI.log("智能答题进行中，无法更新扫描结果", "warn"); return; }
        const text = UI.getScanResultText();
        const newItems = textToScanItems(text);
        const merged = mergeIndexes(newItems, scanItems);
        scanItems = merged;
        _cacheRestored = true;
        _lastChallengeKey = null;
        UI.setScanItemsEmpty(scanItems.length === 0);
        if (!scanItems.some(it => it.isChallengeMarker)) {
            challengeMode = false;
            challengeBlockPoint = null;
            stopAutoScanLoop();
        } else {
            challengeMode = true;
        }
        rebuildChapterStatusFromScanItems();
        refreshAfterScanItemsChanged();
        UI.log(`✅ 更新成功：共 ${scanItems.filter(it => !it.isChallengeMarker).length} 个任务点`, "ok");
        saveScanCache();
    });

    UI.onAutoScanToggle((on) => {
        autoScanEnabled = on;
        UI.log(`自动更新完成状态已${on ? "开启" : "关闭"}`, "info");
        if (on) {
            if (challengeMode) {
                if (!running && !scanning && !recordQuizRunning && !(UI.isQuizButtonRunning && UI.isQuizButtonRunning())) startAutoScanLoop();
                else UI.log("自动更新将在当前任务结束后启动", "info");
            } else {
                UI.log("提示：当前尚未检测到闯关限制，自动更新将在检测到闯关后自动开始", "warn");
            }
        } else {
            stopAutoScanLoop();
        }
        scheduleSave();
    });

    UI.onClearCache(() => {
        if (clearScanCache()) {
            _cacheRestored = true;
            UI.setCacheBtnCleared(true);
            UI.log("🗑 已清除当前课程的扫描缓存", "ok");
        } else {
            UI.log("🗑 清除缓存失败（可能无缓存或课程 ID 未识别）", "warn");
        }
    });

    UI.onRedirect(() => {
        const newUrl = "/home/learn/index" + location.hash;
        UI.log("已确认重定向，正在跳转至旧版页面…", "warn");
        try {
            sessionStorage.setItem("uooc_redirect_notice", JSON.stringify({
                from: location.href, to: location.origin + newUrl, ts: Date.now()
            }));
        } catch (e) {}
        console.log("[UOOC 学习助手] 用户点击重定向按钮，跳转至", newUrl);
        location.replace(newUrl);
    });

    QuizSolver.onEvent((evt, a, b) => {
        if (evt === "log") UI.appendQuizLog(a, b);
        else if (evt === "status") UI.setQuizStatus(a);
        else if (evt === "progress") UI.setQuizFillProgress(a, b);
    });

    /* HTTP 类型的通信细节转发到智能闯关日志 */
    if (typeof LLM_BRIDGE.onQuizLog === "function") {
        LLM_BRIDGE.onQuizLog((msg, type) => {
            try { UI.appendQuizLog("[API] " + msg, type || "debug"); } catch (e) {}
        });
    }

    UI.onQuizToggleStart(async () => {
        if (UI.isQuizButtonCompleted && UI.isQuizButtonCompleted()) return;
        if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) return;
        if (running || scanning || recordQuizRunning) { UI.log("存在其他任务正在运行，无法开始智能答题", "warn"); return; }
        UI.setQuizSubmitMode(_getSubmitMode());

        suspendAutoScanForMutex();
        UI.setQuizButtonRunning(true);
        UI.setQuizFillProgress(0, 0);
        UI.setQuizStatus("准备中…");
        UI.appendQuizLog("开始智能闯关流程", "run");
        try {
            await QuizSolver.start();
            UI.setQuizButtonCompleted();
            UI.setQuizStatus("已完成");
        } catch (e) {
            UI.appendQuizLog(`流程异常：${e.message}`, "err");
            UI.setQuizStatus("异常终止");
            UI.resetQuizButton();
        } finally {
            UI.setQuizButtonRunning(false);
            resumeAutoScanAfterMutex();
        }
    });

    UI.onQuizToggleStop(() => {
        if (UI.isQuizButtonRunning && UI.isQuizButtonRunning()) {
            QuizSolver.stop();
            UI.appendQuizLog("已请求停止", "warn");
        }
    });

    UI.onQuizRecord(async () => { await recordCompletedQuizzes(); });

    UI.onQuizClear(() => {
        if (QuizCache.clear()) {
            UI.appendQuizLog("已清除当前课程的闯关缓存", "ok");
            UI.setQuizSubmitMode("manual");
        } else {
            UI.appendQuizLog("清除失败（可能无缓存或课程 ID 未识别）", "warn");
        }
    });

    /* ============================================================
     * 【启动】
     * ============================================================ */
    function init() {
        UI.log("脚本已加载 v1.0.1.e", "ok");

        applyMobileView(getSettings().mobileView);
        applyForceAspect(getSettings().forceAspect);

        try {
            UI.setQuizSubmitMode(_getSubmitMode());
        } catch (e) {}

        if (_isNewPage) {
            UI.setShowRedirectButton(true);
            UI.log("检测到应用到新版页面，请点击下方按钮重定向至旧版页面", "warn");
            UI.setStatus("检测到新版页面，等待用户确认重定向");
        }

        try {
            const raw = sessionStorage.getItem("uooc_redirect_notice");
            if (raw) {
                sessionStorage.removeItem("uooc_redirect_notice");
                const d = JSON.parse(raw);
                if (d && d.ts && (Date.now() - d.ts) < 60000) {
                    setTimeout(() => { UI.log("已从新版页面重定向至旧版页面", "warn"); }, 200);
                }
            }
        } catch (e) {}

        if (!_isNewPage) UI.setStatus("待机（未扫描）");
        UI.setScanItemsEmpty(true);
        UI.setScanning(false);
        UI.setRunning(false);
        UI.switchTab("tasks");
        try { UI.updateSubmitModeUI(); } catch (e) {}

        tryRestoreCache(false);
        setTimeout(() => { tryRestoreCache(true); }, 800);
        setTimeout(() => { tryRestoreCache(true); }, 2000);
        setTimeout(() => { tryRestoreCache(true); }, 4000);

        window.addEventListener("hashchange", () => {
            if (_cacheRestored) return;
            setTimeout(() => { tryRestoreCache(false); }, 500);
        });

        setTimeout(() => {
            const id = getCourseId();
            if (!id) UI.log("📦 提示：未能从 URL/DOM 识别课程 ID，缓存可能无法命中", "debug");
            else UI.log(`📦 课程 ID：${id}`, "debug");
        }, 2500);

        setTimeout(() => {
            const doc = getQuizDoc();
            if (doc && doc !== document) {
                UI.appendQuizLog("已检测到题目位于 iframe 内，将使用 iframe 文档提取题目", "info");
            }
            bindQuizDocListeners(doc);
        }, 3000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

# 日本語学習システム

**由 Claude Code 对话直接担任老师 + 数据维护者**的日语学习系统。备考 JLPT N3。

- **学习入口**:Claude Code 对话框。你在这里上课、答题、提问;我(Claude Code)负责授课、出题、批改、评分、纠错、答疑,并真实修改本地数据。
- **网站**:只读的学习管理后台,展示课程/进度/单词/语法/错题/成绩/统计/复习。**没有也不需要 AI 对话框、不接入任何 API、不需要 API Key。**

## 怎么用(两步)

### 1) 上课 —— 在 Claude Code 对话框里
在本项目目录打开 Claude Code,直接说:

- **「开始今天的课程」** → 我会读取进度,从当前课程(现在是 L02)开始,走完整 1 小时教学流程(复习检查 → 讲解 → 课中测试 → 询问后做课后测试 → 评分 → 逐题纠错 → 答疑 → 更新数据)。
- 其他常用命令:
  - 「继续上次课程」「开始课后测试」「复习上一课」
  - 「今天只有20分钟」「今天可以学2小时」「今天很累」「今天只复习」
  - 「查看我的进度」「我没听懂」

> 即使开新会话/关掉再开,我也会先读 `CLAUDE.md` + `data/current_session.json` + `student_profile.md`,从上次中断的环节继续。

### 2) 看进度 —— 打开网站
```bash
./start.command
```
或手动:
```bash
python3 -m http.server 8000
```
然后浏览器访问 **http://localhost:8000/web/**

> 注意:必须通过本地服务器打开,**不要直接双击 `web/index.html`**(浏览器安全策略会拦截读取本地 JSON)。

## 目录结构
```
日语/
├── CLAUDE.md              # ★ 长期教学规则(每次会话先读)
├── student_profile.md     # 个人档案(人类可读)
├── README.md
├── start.command          # 一键启动网站
├── data/                  # ★ 学习数据(JSON,我负责维护,网站只读)
│   ├── profile.json           个人档案(结构化)
│   ├── courses.json           完整课程表(5阶段/72课)
│   ├── grammar.json           语法库
│   ├── vocabulary.json        单词库
│   ├── errors.json            错题本
│   ├── tests.json             测试记录
│   ├── reviews.json           间隔复习队列
│   ├── study_log.json         学习日志与统计
│   ├── mastery.json           知识点多维掌握
│   └── current_session.json   ★ 当前课程与环节(续课关键)
├── lessons/               # 我的教学讲义(学生无需阅读)
│   ├── lesson-02.md           第一节正式课脚本
│   └── _lesson-template.md    课程模板
└── web/                   # 只读网站
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## 网站页面
首页 · 课程地图 · 今日课程 · 语法库 · 单词库 · 错题本 · 测试记录 · 学习分析 · 复习计划。

## 数据安全 / 备份
所有学习记录是 `data/` 下的纯文本 JSON。备份只需复制整个 `data/` 文件夹,或用 Git 历史回溯。页面刷新、项目重启、开新会话都不会丢数据。

## 📱 手机 / 远程使用
本项目托管在 GitHub:**https://github.com/lapiko12138-spec/japanese-n3-tutor**

两条通道(看进度 / 上课是分开的):

1. **手机看进度仪表盘** → 浏览器打开 GitHub Pages:
   **https://lapiko12138-spec.github.io/japanese-n3-tutor/**
   (每次 `git push` 后约 1 分钟自动更新;加到手机主屏即可像 App 一样用。)

2. **手机上课(老师)** → 手机浏览器打开 **https://claude.ai/code**,连上本仓库 `japanese-n3-tutor`,开一个会话,直接说「开始今天的课程」。
   它会自动读 `CLAUDE.md` + `current_session.json` 续上进度,上完课把数据 commit & push 回 GitHub,Pages 仪表盘随之更新。

**同步纪律**:每个会话开始会 `git pull`、结束会 `git push`;**同一时间只在一处上课**(别同时在 Mac 和手机改数据),换设备前先让当前一方 push。

> 远程同样遵守只读原则:网站里不会有 AI 对话框、不接入任何 API。教学只在 Claude Code 会话中发生。

## 当前状态
- 已完成:入学诊断(水平定位 N5 后半 ~ N4 初级)、系统初始化。
- 下一步:第一节正式课 **L02 · 动词辞书形与三种类别**。
- 在 Claude Code 对话框中说 **「开始今天的课程」** 即可开始。

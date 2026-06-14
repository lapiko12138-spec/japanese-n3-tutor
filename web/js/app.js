/* 日本語学習 · 只读学习管理后台
   仅读取 /data/*.json 并展示。所有数据由 Claude Code 在对话中维护。本文件不含任何 AI / 网络教学逻辑。 */

const FILES = {
  profile: "profile.json", courses: "courses.json", grammar: "grammar.json",
  vocab: "vocabulary.json", errors: "errors.json", tests: "tests.json",
  reviews: "reviews.json", study: "study_log.json", mastery: "mastery.json",
  session: "current_session.json"
};
const DATA = {};

/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const parseD = s => { if(!s) return null; const d=new Date(s+"T00:00:00"); return isNaN(d)?null:d; };
const daysFromToday = s => { const d=parseD(s); if(!d) return null; return Math.round((d-today())/86400000); };
const fmtDue = s => { const n=daysFromToday(s); if(n==null) return "—"; if(n<0) return `逾期 ${-n} 天`; if(n===0) return "今天"; if(n===1) return "明天"; return `${n} 天后`; };

const jlptBadge = j => j ? `<span class="badge b-${(j||"").toLowerCase()}">${esc(j)}</span>` : "";
const LESSON_STATUS = {
  completed:["已完成","b-green"], in_progress:["进行中","b-amber"], unlocked:["可学习","b-blue"],
  needs_review:["需复习","b-amber"], locked:["未解锁","b-gray"]
};
const lessonStatusBadge = s => { const m=LESSON_STATUS[s]||["—","b-gray"]; return `<span class="badge ${m[1]}">${m[0]}</span>`; };
function masteryBadge(m){
  const green=["稳定掌握","基本掌握"], blue=["能独立使用","初步理解","能识别","提示下能用"],
        amber=["正在学习","需要复习"], red=["已遗忘","未掌握"];
  let c="b-gray";
  if(green.includes(m)) c="b-green"; else if(blue.includes(m)) c="b-blue";
  else if(amber.includes(m)) c="b-amber"; else if(red.includes(m)) c="b-red";
  return `<span class="badge ${c}">${esc(m||"未学习")}</span>`;
}
const byId = (arr, id, key="id") => (arr||[]).find(x => x[key]===id);
const examplesHTML = exs => (exs||[]).map(e =>
  `<div class="ex"><div class="jp">${esc(e.jp)}</div><div class="kana">${esc(e.kana)}</div><div class="cn">${esc(e.cn)}</div></div>`).join("");

/* ---------- load ---------- */
async function load(){
  try{
    const entries = await Promise.all(Object.entries(FILES).map(async ([k,f]) => {
      const r = await fetch(`../data/${f}`, {cache:"no-store"});
      if(!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
      return [k, await r.json()];
    }));
    entries.forEach(([k,v]) => DATA[k]=v);
    route();
  }catch(err){
    $("#topbar-left").textContent = "数据加载失败";
    $("#view").innerHTML = `<div class="err-box">
      <b>无法读取本地学习数据</b>(${esc(err.message)})<br/><br/>
      这个网站需要通过本地服务器打开,不能直接双击 HTML。请在项目根目录运行:<br/>
      <code>./start.command</code> &nbsp;或&nbsp; <code>python3 -m http.server 8000</code><br/>
      然后访问 <code>http://localhost:8000/web/</code></div>`;
  }
}

/* ---------- router ---------- */
const VIEWS = {};
function route(){
  const v = (location.hash.replace("#","") || "home");
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view===v));
  topbar();
  $("#view").innerHTML = (VIEWS[v] || VIEWS.home)();
  bindViewEvents(v);
}
window.addEventListener("hashchange", route);

function topbar(){
  const s=DATA.session, st=DATA.study?.stats||{};
  const cur = byId(DATA.courses?.lessons, s?.currentLessonId);
  $("#topbar-left").innerHTML = `当前:<b>${esc(s?.currentLessonId||"—")} ${esc(cur?.title||"")}</b> · 状态 <b>${esc(s?.phaseLabel||s?.phase||"—")}</b>`;
  $("#topbar-right").innerHTML =
    `<span class="badge b-indigo">🔥 连续 ${st.streakDays||0} 天</span>
     <span class="badge b-gray">已完成 ${st.lessonsCompleted||0} 课</span>`;
}

/* ---------- shared bits ---------- */
function currentLesson(){ return byId(DATA.courses?.lessons, DATA.session?.currentLessonId); }
function dueReviews(){ return (DATA.reviews?.items||[]).filter(i => { const n=daysFromToday(i.dueDate); return n!=null && n<=0; }); }
function pageHead(title, desc){ return `<h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p>`; }

/* ===================== HOME ===================== */
VIEWS.home = () => {
  const s=DATA.session, st=DATA.study?.stats||{}, p=DATA.profile;
  const cur=currentLesson(), nextL=byId(DATA.courses?.lessons, nextLessonId(cur));
  const stage=byId(DATA.courses?.stages, cur?.stageId);
  const due=dueReviews();
  const lastTest=(DATA.tests?.tests||[]).slice(-1)[0];
  const errTypes=topErrorTypes();
  const newG=(cur?.newGrammar||[]).map(id=>byId(DATA.grammar?.points,id)).filter(Boolean);
  const newV=(cur?.newVocab||[]).map(id=>byId(DATA.vocab?.words,id)).filter(Boolean);

  return pageHead("首页", `目标 ${esc(p?.goal||"")} · 当前水平 ${esc(p?.currentLevel?.overall||"")}`)
  + `<div class="card hero">
      <div class="big">${esc(stage?.name||"")} · 下一节正式课</div>
      <div class="lesson-title">${esc(cur?.id||"")} ${esc(cur?.title||"")}</div>
      <div>${jlptBadge(cur?.jlpt)} <span class="badge b-blue">预计 ${esc(cur?.estMinutes||"—")} 分钟</span> ${lessonStatusBadge(cur?.status)}</div>
      <div class="cta">在 Claude Code 对话框中说 <b>「开始今天的课程」</b> 即可开始学习</div>
    </div>`
  + `<div class="grid g3" style="margin-top:16px">
      ${miniCard("当前阶段", esc(stage?.name||"—"), "sm")}
      ${miniCard("当前课程", `${esc(cur?.id||"")} ${esc(cur?.title||"")}`, "sm")}
      ${miniCard("下一课", nextL?`${esc(nextL.id)} ${esc(nextL.title)}`:"—", "sm")}
    </div>`
  + `<h2 class="sec">今日应学习内容</h2>
     <div class="card">
       <div class="kv"><span class="k">学习目标</span><span>${(cur?.objectives||[]).map(esc).join(" · ")||"—"}</span></div>
       <div class="kv"><span class="k">新语法 (${newG.length})</span><span>${newG.map(g=>esc(g.name)).join(" / ")||"—"}</span></div>
       <div class="kv"><span class="k">新单词 (${newV.length})</span><span class="jp">${newV.map(w=>esc(w.kanji)).join("、")||"—"}</span></div>
     </div>`
  + `<div class="grid g2" style="margin-top:16px">
       <div class="card">
         <div class="k">到期复习 · ${due.length} 项</div>
         ${due.length? `<div class="rowlist" style="margin-top:8px">${due.slice(0,5).map(r=>
            `<div class="kv"><span class="dot ${daysFromToday(r.dueDate)<0?'red':'amber'}"></span><span>${esc(r.label)}</span><span class="spacer"></span><span class="kana">${fmtDue(r.dueDate)}</span></div>`).join("")}</div>`
          : `<div class="empty" style="margin-top:8px">暂无到期复习</div>`}
       </div>
       <div class="card">
         <div class="k">最近成绩</div>
         ${lastTest? `<div style="margin-top:6px"><div class="v sm">${esc(lastTest.courseName)}</div>
            <div class="sub" style="color:var(--muted);font-size:13px;margin-top:4px">${esc(lastTest.date)} · ${lastTest.totalScore!=null?`<b>${lastTest.totalScore} 分</b>`:"诊断定位"} · ${esc(lastTest.masteryLevel||"")}</div></div>`
          : `<div class="empty" style="margin-top:8px">暂无成绩</div>`}
         <div class="k" style="margin-top:14px">高频错误类型</div>
         <div class="tag-row">${errTypes.length?errTypes.map(t=>`<span class="badge b-red">${esc(t[0])} ×${t[1]}</span>`).join(""):'<span class="kana">—</span>'}</div>
       </div>
     </div>`
  + `<div class="grid g4" style="margin-top:16px">
      ${statCard(st.streakDays||0,"连续天数")}
      ${statCard(st.lessonsCompleted||0,"已完成课程")}
      ${statCard(st.wordsLearned||0,"已学单词")}
      ${statCard(st.grammarLearned||0,"已学语法")}
     </div>`;
};
const miniCard=(k,v,cls="")=>`<div class="card"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
const statCard=(v,label)=>`<div class="card stat"><div class="v">${v}<span class="unit">${label}</span></div></div>`;

function nextLessonId(cur){
  if(!cur) return null;
  const ls=(DATA.courses?.lessons||[]).slice().sort((a,b)=>a.order-b.order);
  const i=ls.findIndex(l=>l.id===cur.id);
  return i>=0 && i<ls.length-1 ? ls[i+1].id : null;
}
function topErrorTypes(){
  const m={}; (DATA.errors?.errors||[]).forEach(e=>{ if(e.errorType) m[e.errorType]=(m[e.errorType]||0)+1; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4);
}

/* ===================== COURSE MAP ===================== */
VIEWS.map = () => {
  const stages=(DATA.courses?.stages||[]).slice().sort((a,b)=>a.order-b.order);
  const curId=DATA.session?.currentLessonId;
  let html=pageHead("课程地图", `共 ${DATA.courses?.meta?.totalLessons||0} 课 / ${stages.length} 阶段 · 按前置关系顺序解锁`);
  stages.forEach(stg=>{
    const ls=(DATA.courses?.lessons||[]).filter(l=>l.stageId===stg.id).sort((a,b)=>a.order-b.order);
    const done=ls.filter(l=>l.status==="completed").length;
    html+=`<div class="stage"><div class="stage-head">${jlptBadge(stg.jlpt)}<span class="stage-name">${esc(stg.name)}</span>
      <span class="pct">${done}/${ls.length} 完成</span></div>
      <div class="bar" style="margin-bottom:12px"><i style="width:${ls.length?Math.round(done/ls.length*100):0}%"></i></div>`;
    ls.forEach(l=>{
      const isCur=l.id===curId;
      const cls=l.status==="locked"?"locked":""; const curCls=isCur?"current":"";
      const pre=(l.prerequisites||[]).join("、");
      html+=`<div class="lesson-card ${cls} ${curCls}">
        <div class="lesson-no">${esc(l.id)}</div>
        <div class="lesson-main">
          <div class="lesson-name">${esc(l.title)} ${isCur?'<span class="badge b-red">当前</span>':""}</div>
          <div class="lesson-meta">${esc((l.objectives||[]).slice(0,2).join(" · "))}${pre?` · 前置:${esc(pre)}`:""}</div>
        </div>
        ${l.score!=null?`<span class="badge b-indigo">${l.score}分</span>`:""}
        ${jlptBadge(l.jlpt)} ${lessonStatusBadge(l.status)}
      </div>`;
    });
    html+=`</div>`;
  });
  return html;
};

/* ===================== TODAY ===================== */
VIEWS.today = () => {
  const cur=currentLesson(), s=DATA.session;
  if(!cur) return pageHead("今日课程","")+`<div class="empty">未设置当前课程</div>`;
  const stage=byId(DATA.courses?.stages,cur.stageId);
  const g=(cur.newGrammar||[]).map(id=>byId(DATA.grammar?.points,id)).filter(Boolean);
  const v=(cur.newVocab||[]).map(id=>byId(DATA.vocab?.words,id)).filter(Boolean);
  const prog=s?.teachingProgress||{}; const total=prog.totalBlocks||0, doneN=(prog.completedBlocks||[]).length;
  return pageHead(`今日课程 · ${esc(cur.id)} ${esc(cur.title)}`, `${esc(stage?.name||"")} · ${jlptBadge(cur.jlpt)} · 预计 ${esc(cur.estMinutes)} 分钟`)
  + `<div class="notice">本页仅展示课程信息。授课、提问、测试、批改都在 <b>Claude Code 对话框</b> 中进行——本页面没有也不会有 AI 对话框。</div>`
  + `<div class="grid g3">
      ${miniCard("当前环节", esc(s?.phaseLabel||s?.phase||"—"),"sm")}
      ${miniCard("授课进度", total?`${doneN}/${total} 块`:"—","sm")}
      ${miniCard("课后测试", s?.postTestReady?"已就绪":"未开始","sm")}
    </div>`
  + `<h2 class="sec">学习目标</h2><div class="card"><ul style="margin:0;padding-left:20px">${(cur.objectives||[]).map(o=>`<li>${esc(o)}</li>`).join("")}</ul></div>`
  + (total?`<h2 class="sec">知识块</h2><div class="card"><div class="rowlist">${(prog.blockTitles||[]).map((t,i)=>{
      const done=(prog.completedBlocks||[]).includes(i);
      return `<div class="kv"><span class="dot ${done?'green':'gray'}"></span><span>${i+1}. ${esc(t)}</span><span class="spacer"></span><span class="kana">${done?'✓ 已完成':'待学'}</span></div>`;
    }).join("")}</div></div>`:"")
  + `<h2 class="sec">本课语法 (${g.length})</h2>${g.length?`<div class="rowlist">${g.map(grammarRow).join("")}</div>`:`<div class="empty">本课无新语法</div>`}`
  + `<h2 class="sec">本课单词 (${v.length})</h2>${v.length?vocabTable(v):`<div class="empty">本课无新单词</div>`}`
  + (cur.note?`<h2 class="sec">课堂说明</h2><div class="card sub" style="color:var(--muted)">${esc(cur.note)}</div>`:"");
};

/* ===================== GRAMMAR ===================== */
function grammarRow(g){
  return `<div class="lrow"><div class="top">
      <span class="title jp">${esc(g.name)}</span>${jlptBadge(g.jlpt)}${masteryBadge(g.mastery)}
      <span class="spacer"></span><span class="kana">${g.lessonId?esc(g.lessonId):""}${g.nextReview?` · 复习 ${esc(g.nextReview)}`:""}</span>
    </div>
    <div class="sub jp">${esc(g.structure)}</div>
    <details style="margin-top:6px"><summary>讲解与例句</summary>
      <div class="sub" style="margin:6px 0">${esc(g.explanation)}</div>${examplesHTML(g.examples)}
      ${g.lastError?`<div class="kv"><span class="k">最近错误</span><span class="badge b-red">${esc(g.lastError)}</span></div>`:""}
    </details></div>`;
}
VIEWS.grammar = () => {
  const pts=(DATA.grammar?.points||[]);
  return pageHead("语法库", `共 ${pts.length} 个语法点 · 掌握度随教学更新`)
    + (pts.length?`<div class="rowlist">${pts.map(grammarRow).join("")}</div>`:`<div class="empty">暂无语法点</div>`);
};

/* ===================== VOCAB ===================== */
function vocabTable(words){
  return `<table class="tbl"><thead><tr><th>单词</th><th>假名</th><th>中文</th><th>词性</th><th>JLPT</th><th>掌握度</th><th>下次复习</th></tr></thead><tbody>
    ${words.map(w=>`<tr>
      <td class="jp"><b>${esc(w.kanji)}</b></td><td class="kana">${esc(w.kana)}</td><td>${esc(w.cn)}</td>
      <td>${esc(w.pos)}</td><td>${jlptBadge(w.jlpt)}</td><td>${masteryBadge(w.mastery)}</td>
      <td class="kana">${w.nextReview?esc(w.nextReview):"—"}</td></tr>`).join("")}
  </tbody></table>`;
}
VIEWS.vocab = () => {
  const words=(DATA.vocab?.words||[]);
  let html=pageHead("单词库", `共 ${words.length} 词`);
  html+=`<div class="filters" id="vfilter">
    <button data-f="all" class="active">全部</button>
    <button data-f="N5">N5</button><button data-f="N4">N4</button><button data-f="N3">N3</button>
    <button data-f="learning">学习中</button><button data-f="new">未学习</button></div>`;
  html+=`<div id="vlist">${words.length?vocabFull(words):`<div class="empty">暂无单词</div>`}</div>`;
  return html;
};
function vocabFull(words){
  return `<div class="rowlist">${words.map(w=>`<div class="lrow">
    <div class="top"><span class="title jp" style="font-size:17px">${esc(w.kanji)}</span><span class="kana">${esc(w.kana)}</span>
      <span>${esc(w.cn)}</span>${jlptBadge(w.jlpt)}<span class="badge b-gray">${esc(w.pos)}</span>${masteryBadge(w.mastery)}
      <span class="spacer"></span><span class="kana">${w.nextReview?`复习 ${esc(w.nextReview)}`:"未排复习"}</span></div>
    ${w.example?`<div class="ex"><span class="jp">${esc(w.example.jp)}</span> <span class="kana">${esc(w.example.kana)}</span><div class="cn">${esc(w.example.cn)}</div></div>`:""}
    <div class="tag-row">${(w.collocations||[]).map(c=>`<span class="badge b-blue jp">${esc(c)}</span>`).join("")}
      ${(w.confusable||[]).map(c=>`<span class="badge b-amber jp">易混:${esc(c)}</span>`).join("")}</div>
    ${w.note?`<div class="sub" style="color:var(--muted);margin-top:6px">${esc(w.note)}</div>`:""}
  </div>`).join("")}</div>`;
}

/* ===================== ERRORS ===================== */
VIEWS.errors = () => {
  const errs=(DATA.errors?.errors||[]);
  let html=pageHead("错题本", `共 ${errs.length} 条 · 错题用于生成后续针对性练习`);
  const types=[...new Set(errs.map(e=>e.errorType).filter(Boolean))];
  html+=`<div class="filters" id="efilter"><button data-f="all" class="active">全部</button>
    <button data-f="open">未纠正</button><button data-f="corrected">已纠正</button>
    ${types.map(t=>`<button data-f="t:${esc(t)}">${esc(t)}</button>`).join("")}</div>`;
  html+=`<div id="elist">${errs.length?errorsFull(errs):`<div class="empty">暂无错题</div>`}</div>`;
  return html;
};
function errorsFull(errs){
  return `<div class="rowlist">${errs.map(e=>`<div class="lrow">
    <div class="top"><span class="badge b-red">${esc(e.errorType||"错误")}</span>
      ${e.grammarPoint?`<span class="badge b-indigo">${esc(e.grammarPoint)}</span>`:""}
      <span class="badge ${e.corrected?'b-green':'b-amber'}">${e.corrected?"已纠正":"未纠正"}</span>
      ${e.repeated?'<span class="badge b-red">重复出现</span>':""}
      <span class="spacer"></span><span class="kana">${esc(e.date)} · ${esc(e.lessonId||"")}${e.nextReview?` · 复习 ${esc(e.nextReview)}`:""}</span></div>
    <div class="sub" style="margin-top:8px"><b>题目:</b>${esc(e.question)}</div>
    <div class="kv"><span class="k">我的答案</span><span style="color:var(--red)">${esc(e.myAnswer)}</span></div>
    <div class="kv"><span class="k">正确答案</span><span style="color:var(--green)" class="jp">${esc(e.correctAnswer)}</span></div>
    <div class="kv"><span class="k">原因</span><span>${esc(e.reason)}</span></div>
    ${e.fixLesson?`<div class="kv"><span class="k">修复课程</span><span>${esc(e.fixLesson)}</span></div>`:""}
  </div>`).join("")}</div>`;
}

/* ===================== TESTS ===================== */
VIEWS.tests = () => {
  const ts=(DATA.tests?.tests||[]).slice().reverse();
  let html=pageHead("测试记录", `共 ${ts.length} 条`);
  if(!ts.length) return html+`<div class="empty">暂无测试记录</div>`;
  html+=`<div class="rowlist">${ts.map(t=>`<div class="lrow">
    <div class="top"><span class="title">${esc(t.courseName)}</span>
      <span class="badge b-gray">${esc(t.lessonId||"")}</span>
      ${t.type==="diagnostic"?'<span class="badge b-blue">诊断</span>':""}
      ${t.passed===true?'<span class="badge b-green">通过</span>':t.passed===false?'<span class="badge b-red">未通过</span>':""}
      <span class="spacer"></span>
      ${t.totalScore!=null?`<span class="badge b-indigo" style="font-size:13px">${t.totalScore} 分</span>`:'<span class="badge b-blue">水平定位</span>'}
      <span class="kana">${esc(t.date)}</span></div>
    ${t.breakdown?`<div class="tag-row" style="margin-top:8px">${Object.entries(t.breakdown).map(([k,v])=>`<span class="badge b-gray">${esc(k)}: ${esc(v)}</span>`).join("")}</div>`:""}
    <div class="kv" style="margin-top:6px"><span class="k">错题数</span><span>${t.errorCount!=null?t.errorCount:"—"}</span></div>
    ${t.teacherNote?`<div class="kv"><span class="k">教师评语</span><span>${esc(t.teacherNote)}</span></div>`:""}
  </div>`).join("")}</div>`;
  return html;
};

/* ===================== ANALYTICS ===================== */
VIEWS.analytics = () => {
  const st=DATA.study?.stats||{}, p=DATA.profile;
  const scored=(DATA.tests?.tests||[]).filter(t=>t.totalScore!=null);
  let html=pageHead("学习分析", `备考 ${esc(p?.goal||"N3")} · 综合水平 ${esc(p?.currentLevel?.overall||"")}`);
  html+=`<div class="grid g4">
    ${statCard(st.streakDays||0,"连续天数")}
    ${statCard(st.totalMinutes||0,"总学习分钟")}
    ${statCard(st.totalSessions||0,"学习次数")}
    ${statCard(st.lessonsCompleted||0,"完成课程")}
    ${statCard(st.wordsLearned||0,"掌握单词")}
    ${statCard(st.grammarLearned||0,"掌握语法")}
    ${statCard((DATA.courses?.meta?.totalLessons||0),"课程总数")}
    ${statCard(dueReviews().length,"到期复习")}
  </div>`;
  html+=`<h2 class="sec">N3 准备进度</h2><div class="card">
    <div class="bar"><i style="width:${Math.max(2,st.n3Progress||0)}%"></i></div>
    <div class="pct" style="margin-top:6px">${st.n3Progress||0}% · 已完成 ${st.lessonsCompleted||0} / ${DATA.courses?.meta?.totalLessons||0} 课</div></div>`;
  html+=`<h2 class="sec">各等级水平定位</h2><div class="card">
    ${Object.entries(p?.currentLevel||{}).map(([k,v])=>{
      const label={overall:"综合",vocabulary:"词汇识别",reading:"简单阅读",grammar:"语法体系",output:"主动输出"}[k]||k;
      return `<div class="kv"><span class="k">${label}</span><span>${esc(v)}</span></div>`;}).join("")}</div>`;
  html+=`<h2 class="sec">薄弱能力(教学重点)</h2><div class="card"><div class="rowlist">
    ${(p?.weaknesses||[]).map((w,i)=>`<div class="kv"><span class="badge b-red">${i+1}</span><span>${esc(w)}</span></div>`).join("")}</div></div>`;
  html+=`<h2 class="sec">成绩趋势</h2>`;
  html+= scored.length? `<div class="rowlist">${scored.map(t=>`<div class="kv"><span class="k">${esc(t.lessonId)}</span>
      <div class="bar" style="flex:1;max-width:300px"><i style="width:${t.totalScore}%"></i></div>
      <span class="pct">${t.totalScore} 分</span></div>`).join("")}</div>`
    : `<div class="empty">还没有正式课后测试成绩。完成第一节课(L02)的课后测试后,这里会出现成绩曲线。</div>`;
  return html;
};

/* ===================== REVIEWS ===================== */
VIEWS.reviews = () => {
  const items=(DATA.reviews?.items||[]).slice().sort((a,b)=>(parseD(a.dueDate)||0)-(parseD(b.dueDate)||0));
  const overdue=items.filter(i=>daysFromToday(i.dueDate)<0);
  const todayI=items.filter(i=>daysFromToday(i.dueDate)===0);
  const upcoming=items.filter(i=>daysFromToday(i.dueDate)>0);
  const TYPE={word:["单词","b-blue"],grammar:["语法","b-indigo"],error:["错题","b-red"]};
  const row=i=>{ const t=TYPE[i.type]||["复习","b-gray"]; const n=daysFromToday(i.dueDate);
    return `<div class="lrow"><div class="top">
      <span class="dot ${n<0?'red':n===0?'amber':'green'}"></span>
      <span class="title">${esc(i.label||i.refId)}</span><span class="badge ${t[1]}">${t[0]}</span>
      <span class="spacer"></span><span class="badge ${n<=0?'b-amber':'b-gray'}">${fmtDue(i.dueDate)}</span>
      <span class="kana">${esc(i.dueDate)}</span></div>
      ${i.lastResult?`<div class="sub" style="color:var(--muted);margin-top:5px">上次:${esc(i.lastResult)}${i.fromError?` · 源错题 ${esc(i.fromError)}`:""}</div>`:""}
    </div>`; };
  let html=pageHead("复习计划", `间隔复习:${(DATA.reviews?.meta?.intervals||[]).join(" → ")}`);
  const block=(title,arr,cls)=> `<h2 class="sec">${title} · ${arr.length}</h2>${arr.length?`<div class="rowlist">${arr.map(row).join("")}</div>`:`<div class="empty">无</div>`}`;
  html+=block("⚠️ 已逾期",overdue);
  html+=block("📅 今天到期",todayI);
  html+=block("🗓️ 即将到来",upcoming);
  return html;
};

/* ---------- view-specific events (filters) ---------- */
function bindViewEvents(v){
  if(v==="vocab"){
    const wrap=$("#vfilter"), list=$("#vlist"), words=DATA.vocab?.words||[];
    wrap?.addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b)return;
      wrap.querySelectorAll("button").forEach(x=>x.classList.remove("active")); b.classList.add("active");
      const f=b.dataset.f; let arr=words;
      if(["N5","N4","N3"].includes(f)) arr=words.filter(w=>w.jlpt===f);
      else if(f==="learning") arr=words.filter(w=>w.masteryLevel>0 && !["稳定掌握","基本掌握"].includes(w.mastery));
      else if(f==="new") arr=words.filter(w=>(w.masteryLevel||0)===0);
      list.innerHTML=arr.length?vocabFull(arr):`<div class="empty">无符合条件的单词</div>`;
    });
  }
  if(v==="errors"){
    const wrap=$("#efilter"), list=$("#elist"), errs=DATA.errors?.errors||[];
    wrap?.addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b)return;
      wrap.querySelectorAll("button").forEach(x=>x.classList.remove("active")); b.classList.add("active");
      const f=b.dataset.f; let arr=errs;
      if(f==="open") arr=errs.filter(x=>!x.corrected);
      else if(f==="corrected") arr=errs.filter(x=>x.corrected);
      else if(f.startsWith("t:")) arr=errs.filter(x=>x.errorType===f.slice(2));
      list.innerHTML=arr.length?errorsFull(arr):`<div class="empty">无符合条件的错题</div>`;
    });
  }
}

load();

/* Abhyas Firebase-first test engine. UI renders from fast cache first; Firestore syncs in background. */
let firebaseConfig=null;

const exams=[
{name:"SSC CGL",icon:"📊",category:"SSC",desc:"Combined Graduate Level",subjects:["Quantitative Aptitude","Reasoning","General Awareness","English"]},
{name:"SSC CHSL",icon:"📝",category:"SSC",desc:"10+2 Level",subjects:["Quantitative Aptitude","Reasoning","General Awareness","English"]},
{name:"SSC GD Constable",icon:"🛡️",category:"SSC",desc:"General Duty Constable",subjects:["Reasoning","General Knowledge","Mathematics","English / Hindi"]},
{name:"SSC MTS",icon:"📋",category:"SSC",desc:"Multi Tasking Staff",subjects:["Numerical Ability","Reasoning","General Awareness","English"]},
{name:"SSC CPO",icon:"👮",category:"SSC",desc:"Central Police Organisation",subjects:["Reasoning","Quantitative Aptitude","General Awareness","English"]},
{name:"SSC Selection Post",icon:"🎯",category:"SSC",desc:"Selection Post",subjects:["General Intelligence","Quantitative Aptitude","English","General Awareness"]},
{name:"SSC Stenographer",icon:"⌨️",category:"SSC",desc:"Grade C & D",subjects:["Reasoning","General Awareness","English"]},
{name:"SSC JE",icon:"🛠️",category:"Engineering",desc:"Junior Engineer",subjects:["General Intelligence","General Awareness","Engineering"]},
{name:"IBPS PO",icon:"🏦",category:"Banking & Insurance",desc:"Probationary Officer",subjects:["Quantitative Aptitude","Reasoning","English","General Awareness"]},
{name:"IBPS Clerk",icon:"💳",category:"Banking & Insurance",desc:"Clerical Cadre",subjects:["Numerical Ability","Reasoning","English","General Awareness"]},
{name:"IBPS RRB PO",icon:"🏦",category:"Banking & Insurance",desc:"Regional Rural Bank Officer",subjects:["Quantitative Aptitude","Reasoning","English","General Awareness"]},
{name:"IBPS RRB Clerk",icon:"💼",category:"Banking & Insurance",desc:"Regional Rural Bank Clerk",subjects:["Numerical Ability","Reasoning","English","General Awareness"]},
{name:"SBI PO",icon:"🏛️",category:"Banking & Insurance",desc:"Probationary Officer",subjects:["Quantitative Aptitude","Reasoning","English","Banking Awareness"]},
{name:"SBI Clerk",icon:"🏦",category:"Banking & Insurance",desc:"Junior Associate",subjects:["Numerical Ability","Reasoning","English","General Awareness"]},
{name:"RRB NTPC",icon:"🚉",category:"Railways",desc:"Non-Technical Popular Categories",subjects:["Mathematics","Reasoning","General Awareness","General Science"]},
{name:"RRB Group D",icon:"🚆",category:"Railways",desc:"Level 1 Recruitment",subjects:["Mathematics","General Intelligence","General Science","General Awareness"]},
{name:"RRB ALP",icon:"🚄",category:"Railways",desc:"Assistant Loco Pilot",subjects:["Mathematics","Reasoning","General Science","General Awareness"]},
{name:"RRB Technician",icon:"🔧",category:"Railways",desc:"Technician",subjects:["Mathematics","General Intelligence","General Science","General Awareness"]},
{name:"RPF Constable",icon:"🚔",category:"Railways",desc:"Railway Protection Force",subjects:["Arithmetic","Reasoning","General Awareness"]},
{name:"UPSC Civil Services",icon:"🏛️",category:"Civil Services",desc:"IAS / CSE",subjects:["General Studies","CSAT","Current Affairs","Optional"]},
{name:"CDS",icon:"🎖️",category:"Defence",desc:"Combined Defence Services",subjects:["English","General Knowledge","Mathematics"]},
{name:"AFCAT",icon:"✈️",category:"Defence",desc:"Air Force Common Admission Test",subjects:["English","General Awareness","Reasoning","Numerical Ability"]},
{name:"CAPF AC",icon:"🪖",category:"Defence",desc:"Central Armed Police Forces",subjects:["General Ability","General Studies","Essay"]},
{name:"CTET",icon:"🎓",category:"Teaching",desc:"Central Teacher Eligibility Test",subjects:["Child Development","Mathematics","EVS","Language"]},
{name:"KVS",icon:"🏫",category:"Teaching",desc:"Kendriya Vidyalaya",subjects:["English","Hindi","Reasoning","General Awareness"]},
{name:"DSSSB",icon:"📚",category:"Teaching",desc:"Delhi Subordinate Services",subjects:["General Awareness","Reasoning","Numerical Ability","Language"]},
{name:"UGC NET",icon:"🎓",category:"Teaching",desc:"National Eligibility Test",subjects:["Teaching Aptitude","Research Aptitude","Subject Paper"]},
{name:"State PSC",icon:"🗺️",category:"State Exams",desc:"State Public Service Commission",subjects:["General Studies","Current Affairs","Reasoning","Language"]},
{name:"UPSSSC PET",icon:"📑",category:"State Exams",desc:"Preliminary Eligibility Test",subjects:["General Intelligence","General Awareness","Hindi","Numerical Ability"]},
{name:"UP Police",icon:"🚨",category:"Police",desc:"Uttar Pradesh Police",subjects:["General Knowledge","Reasoning","Numerical Ability","Hindi"]},
{name:"State Police",icon:"👮",category:"Police",desc:"State Police Recruitment",subjects:["General Knowledge","Reasoning","Numerical Ability","Current Affairs"]},
{name:"Insurance Exams",icon:"🛡️",category:"Insurance",desc:"Insurance Recruitment",subjects:["Reasoning","Quantitative Aptitude","English","General Awareness"]},
{name:"Nursing Exams",icon:"⚕️",category:"Nursing",desc:"Government Nursing Exams",subjects:["Nursing","General Awareness","Reasoning","English"]},
{name:"Judiciary Exams",icon:"⚖️",category:"Judiciary",desc:"Judicial Services",subjects:["Law","Constitution","Current Affairs","Language"]},
{name:"CUET",icon:"🎓",category:"UG Entrance",desc:"Common University Entrance Test",subjects:["Language","General Test","Domain Subjects"]}];
const seedSeries=[["SSC GD","SSC","SSC GD Complete Test Series","1200+","10"],["SSC CGL","SSC","SSC CGL Tier 1 Test Series","1500+","15"],["SSC CHSL","SSC","SSC CHSL Test Series","900+","10"],["RRB Group D","Railways","RRB Group D Test Series","900+","8"],["RRB NTPC","Railways","RRB NTPC Test Series","700+","8"],["IBPS PO","Banking","IBPS PO Prelims Test Series","600+","6"],["IBPS Clerk","Banking","IBPS Clerk Test Series","500+","6"],["SBI PO","Banking","SBI PO Test Series","450+","5"]].map((x,n)=>({id:"seed-"+n,exam:x[0],category:x[1],title:x[2],total:x[3],free:x[4],lang:"Hindi / English",types:"Full Mock • Sectional • PYQ"}));
const key="abhyas_fast_state_v3",runnerKey="abhyas_active_test_v1";let state=Object.assign({questions:0,tests:0,correct:0,attempted:0,streak:0,exam:"",recent:[]},safe(localStorage.getItem(key)));let series=[...seedSeries],db=null,user=null,online=false,runner=null,timer=null,currentTests=[],finishLock=false;
const $=id=>document.getElementById(id);function safe(v){try{return v?JSON.parse(v):{}}catch{return {}}}function save(){localStorage.setItem(key,JSON.stringify(state));stats();recent()}function persistRunner(){if(!runner)return;localStorage.setItem(runnerKey,JSON.stringify({...runner,review:[...runner.review]}))}function clearRunner(){localStorage.removeItem(runnerKey)}function startTimer(){clearInterval(timer);timer=setInterval(()=>{if(!runner||finishLock)return;runner.seconds--;renderTimer();persistRunner();if(runner.seconds<=0)finish(true)},1000)}function restoreRunner(){let r=safe(localStorage.getItem(runnerKey));const qs=r?.t?.questions;if(!Array.isArray(qs)||!qs.length||!r?.t?.id||!r?.t?.seriesId||!Number.isFinite(Number(r.seconds))||Number(r.seconds)<=0){clearRunner();return false}if(!qs.every(q=>q&&q.id&&(q.question||q.text)&&Array.isArray(q.options))){clearRunner();return false}runner={...r,seconds:Number(r.seconds),review:new Set(Array.isArray(r.review)?r.review:[])};finishLock=false;section("testRunner");$("runnerTitle").textContent=runner.t.title||"Full Mock Test";$("runnerSeries").textContent=series.find(x=>x.id===runner.t.seriesId)?.title||"Abhyas Test";renderRunner();startTimer();return true}function toast(t){let e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.x);toast.x=setTimeout(()=>e.classList.remove("show"),2200)}
function stats(){const q=$("qCount"),t=$("testCount"),a=$("accuracy"),s=$("streak");if(q)q.textContent=state.questions;if(t)t.textContent=state.tests;if(a)a.textContent=state.attempted?Math.round(state.correct/state.attempted*100)+"%":"0%";if(s)s.textContent=state.streak+" day"+(state.streak===1?"":"s")}
function section(id){if(runner&&id!=="testRunner"){toast("Test is in progress. Submit or finish it before leaving.");return}document.querySelectorAll(".section").forEach(x=>x.classList.toggle("active",x.id===id));document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.section===id));scrollTo({top:0,behavior:"smooth"})}
document.addEventListener("click",e=>{let b=e.target.closest("[data-section]");if(b){e.preventDefault();section(b.dataset.section)}});

function renderExams(){const cards=[{icon:"🏅",name:"SSC",desc:"CGL, CHSL, MTS",exam:"SSC CGL"},{icon:"🏦",name:"Banking",desc:"IBPS, SBI, RBI",exam:"IBPS PO"},{icon:"🚆",name:"Railway",desc:"RRB NTPC, Group D",exam:"RRB NTPC"},{icon:"🏛️",name:"UPSC",desc:"IAS, CDS, CAPF",exam:"SSC CGL"},{icon:"🗺️",name:"State Exams",desc:"State PSC, Police",exam:"SSC GD"},{icon:"▦",name:"View All",desc:"All Government Exams",exam:""}];$("examGrid").innerHTML=cards.map(e=>`<article class="exam-card"><div class="icon">${e.icon}</div><h3>${e.name}</h3><p>${e.desc}</p><button class="card-link" data-exam="${e.exam}">View test series →</button></article>`).join("")}
function categories(active="All"){let cats=["All","SSC","Banking & Insurance","Teaching","Civil Services","Railways","Engineering","Defence","State Exams","Police","Insurance","Nursing","Other Govt.","Judiciary","Regulatory Body","UG Entrance"];$("categoryTabs").innerHTML=cats.map(x=>`<button class="${x===active?"active":""}" data-cat="${x}">${x}</button>`).join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{categories(b.dataset.cat);renderCatalog(b.dataset.cat);renderSeries(b.dataset.cat)})}
function renderCatalog(cat="All"){let list=cat==="All"?exams:exams.filter(x=>x.category===cat);$("examCount").textContent=list.length+" Exams";$("examCatalog").innerHTML=list.map((e,i)=>`<article class="catalog-card" data-exam-name="${e.name}"><div class="catalog-icon">${e.icon}</div><div><h4>${e.name}</h4><p>${e.desc}</p></div><span class="catalog-arrow">›</span></article>`).join("");document.querySelectorAll("[data-exam-name]").forEach(card=>card.onclick=()=>{let e=exams.find(x=>x.name===card.dataset.examName);if(e){$("practiceSeriesSearch").value=e.name;renderSeries("All");document.getElementById("seriesGrid").scrollIntoView({behavior:"smooth",block:"start"})}})}
function renderSeries(cat="All"){let term=($("practiceSeriesSearch")?.value||"").trim().toLowerCase();let r=series.filter(x=>(cat==="All"||x.category===cat)&&(!term||[x.title,x.exam,x.category,x.types].join(" ").toLowerCase().includes(term)));$("seriesGrid").innerHTML=r.map(s=>`<article class="series-card"><div class="series-top"><span class="tag">${s.category}</span><small class="muted">Popular</small></div><h3>${s.title}</h3><p>${s.types||"Full Mock • Sectional • PYQ"}</p><div class="series-stats"><div><b>${s.total||"—"}</b><span>TESTS</span></div><div><b>${s.free||0}</b><span>FREE</span></div><div><b>${s.lang||"Hindi / English"}</b><span>LANGUAGE</span></div></div><button class="primary small" data-series="${s.id}">View Test Series</button></article>`).join("")}
function recent(){$("recentList").innerHTML=state.recent?.length?state.recent.slice(0,5).map(x=>`<div class="recent-item"><div><b>${x.title}</b><br><small>${x.score}% · ${x.date}</small></div></div>`).join(""):'<div class="recent-item"><span class="muted">Your completed tests will appear here.</span></div>'}
function subjects(exam){let e=exams.find(x=>x.name===exam)||exams[0];$("subjectGrid").innerHTML=e.subjects.map(s=>`<article class="subject-card"><h3>${s}</h3><p>Chapter-wise timed practice.</p><button class="primary small" data-practice="${s}">Start Practice</button></article>`).join("")}
function shuffleQuestions(list){
  const a=[...list];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function normalizeQuestionKey(q){
  return String(q?.question??q?.text??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/[\\u0000-\\u001F]/g," ").replace(/\\s+/g," ").trim().toLowerCase();
}
function uniqueQuestionPool(pool){
  const seen=new Set(),out=[];
  for(const q of (pool||[])){
    const key=normalizeQuestionKey(q);
    if(!key||seen.has(key))continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
function buildExamTests(s,pool){
  const source=shuffleQuestions(uniqueQuestionPool(pool||[])).slice(0,100);
  if(!source.length)return [];
  return [{
    id:(s?.id||"series")+"-generated-full",
    title:"Full Mock Test",
    questionCount:source.length,
    duration:source.length>=100?60:Math.max(20,Math.ceil(source.length*0.6)),
    marks:source.reduce((sum,q)=>sum+Number(q.marks??1),0),
    questions:source,
    seriesId:s.id,
    free:true,
    generatedFromExam:s.exam
  }];
}

async function openSeries(id){
  section("seriesDetail");
  let s=series.find(x=>x.id===id);
  $("seriesDetailContent").innerHTML='<div class="detail-hero"><span class="tag">Loading</span><h2>Loading test series…</h2></div>';
  let tests=[];
  let uploadedPool=[];

  if(online&&s?.exam){
    try{
      const q=await getDocs(query(collection(db,"questions"),where("exam","==",s.exam),limit(1000)));
      q.forEach(d=>uploadedPool.push({id:d.id,...d.data()}));
    }catch(e){console.warn("Exam question pool unavailable",e)}
  }

  if(uploadedPool.length){
    tests=buildExamTests(s,uploadedPool);
  }



  // Live Firebase question bank is the only source of truth.
  // Do not silently replace missing/failed data with demo 20-question tests.
  currentTests=tests;

  const rawPoolSize=uploadedPool.length;
  const uniquePoolSize=uniqueQuestionPool(uploadedPool).length;
  const note=rawPoolSize ? '<div class="pool-note">Uploaded question bank: <b>'+uniquePoolSize+'</b> unique questions.</div>' : '<div class="pool-note">No uploaded questions found for this exam.</div>';

  $("seriesDetailContent").innerHTML=`<div class="detail-hero"><span class="tag">${s?.category||"Test Series"}</span><h2>${s?.title||"Test Series"}</h2><p>${s?.types||"Full Mock • Sectional • PYQ"} · ${s?.lang||"Hindi / English"}</p></div>${note}<div class="test-list">${tests.map(t=>`<div class="test-row"><div><h3>${t.title}</h3><p>Timed objective test with detailed result.</p><div class="test-meta"><span>${t.questionCount||t.questions?.length||20} Questions</span><span>${t.duration||20} Minutes</span><span>${t.marks||20} Marks</span><span>${t.free?"Free":"Test"}</span></div></div><button class="primary small" data-test="${t.id}">Start Test</button></div>`).join("")}</div>`;
  document.querySelectorAll("[data-test]").forEach(b=>b.onclick=()=>startTest(b.dataset.test));
}

async function startTest(id){
  if(runner){toast("A test is already in progress.");return}
  let t=currentTests.find(x=>x.id===id);
  if(!t)return;
  finishLock=false;

  if(!Array.isArray(t.questions)||!t.questions.length){
    toast("No uploaded questions are available for this test.");
    return;
  }
  let qs=[...t.questions];
  runner={t:{...t,questions:qs},i:0,a:{},review:new Set(),seconds:(t.duration||20)*60};
  section("testRunner");
  $("runnerTitle").textContent=t.title;
  $("runnerSeries").textContent=series.find(x=>x.id===t.seriesId)?.title||"Abhyas Test";
  renderRunner();
  persistRunner();
  startTimer();

  if(online)try{
    let remoteQs=[];

    if(!id.includes("-generated-")){
      let d=await getDoc(doc(db,"tests",id));
      if(d.exists()&&d.data().questions?.length){
        remoteQs=d.data().questions.map((q,i)=>({...q,id:q.id||("remote-"+i)}));
      }
      if(!remoteQs.length){
        let q=await getDocs(query(collection(db,"questions"),where("testId","==",id),limit(100)));
        q.forEach(d=>remoteQs.push({id:d.id,...d.data()}));
      }
    }

    if(!remoteQs.length){
      const examName=series.find(x=>x.id===t.seriesId)?.exam;
      if(examName){
        const examSnap=await getDocs(query(collection(db,"questions"),where("exam","==",examName),limit(1000)));
        const pool=[];examSnap.forEach(d=>pool.push({id:d.id,...d.data()}));
        const uniquePool=shuffleQuestions(uniqueQuestionPool(pool));

        if(id.includes("-generated-")){
          const generatedIndex=Number(id.split("-generated-")[1]);
          const sizes=[100,20,20,20,20,20];
          const offset=sizes.slice(0,generatedIndex).reduce((a,b)=>a+b,0);
          remoteQs=uniquePool.slice(offset,offset+sizes[generatedIndex]);
        }else{
          remoteQs=pool.slice(0,100);
        }
      }
    }

    if(remoteQs.length&&runner?.t?.id===id){
      runner.t.questions=remoteQs;
      runner.t.questionCount=remoteQs.length;
      runner.t.marks=remoteQs.reduce((sum,x)=>sum+Number(x.marks??1),0);
      runner.i=0;
      renderRunner();
      persistRunner();
    }
  }catch(e){console.warn("Question sync unavailable",e)}
}
function renderTimer(){let s=Math.max(0,runner?.seconds||0);$("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function renderRunner(){let q=runner.t.questions[runner.i],n=runner.t.questions.length;$("questionNo").textContent="Question "+(runner.i+1)+" of "+n;$("marksInfo").textContent=(q.marks||1)+" mark";$("questionText").textContent=q.text||q.question;$("options").innerHTML=(q.options||[]).map((o,i)=>`<label class="option ${runner.a[q.id]===i?"selected":""}"><input type="radio" ${runner.a[q.id]===i?"checked":""}> <span>${String.fromCharCode(65+i)}. ${o}</span></label>`).join("");document.querySelectorAll("#options .option").forEach((e,i)=>e.onclick=()=>{if(!runner)return;runner.a[q.id]=i;persistRunner();renderRunner()});$("progressBar").style.width=((runner.i+1)/n*100)+"%";$("prevBtn").disabled=runner.i===0;$("nextBtn").textContent=runner.i===n-1?"Finish":"Next";$("markBtn").textContent=runner.review.has(q.id)?"★ Marked":"☆ Mark for review";$("paletteGrid").innerHTML=runner.t.questions.map((x,i)=>`<button class="q-btn ${runner.a[x.id]!==undefined?"answered":""} ${runner.review.has(x.id)?"review":""} ${i===runner.i?"current":""}" data-q="${i}">${i+1}</button>`).join("");document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{runner.i=+b.dataset.q;renderRunner()})}
$("prevBtn").onclick=()=>{if(runner?.i>0){runner.i--;persistRunner();renderRunner()}};$("nextBtn").onclick=()=>{if(!runner)return;runner.i<runner.t.questions.length-1?(runner.i++,persistRunner(),renderRunner()):finish(false)};$("markBtn").onclick=()=>{if(!runner)return;let id=runner.t.questions[runner.i].id;runner.review.has(id)?runner.review.delete(id):runner.review.add(id);persistRunner();renderRunner()};$("submitBtn").onclick=()=>finish(false);
async function finish(auto){if(!runner||finishLock)return;finishLock=true;clearInterval(timer);let qs=runner.t.questions,attempted=0,correct=0;qs.forEach(q=>{if(runner.a[q.id]!==undefined){attempted++;if(+runner.a[q.id]===+(q.answerIndex??q.correctIndex??-1))correct++}});let score=qs.length?Math.round(correct/qs.length*100):0;state.questions+=attempted;state.tests++;state.attempted+=attempted;state.correct+=correct;state.streak=Math.max(1,state.streak);state.recent=[{title:runner.t.title,score,date:new Date().toLocaleDateString("en-IN")},...(state.recent||[])].slice(0,10);save();if(online&&user)try{await addDoc(collection(db,"attempts"),{userId:user.uid,testId:runner.t.id,title:runner.t.title,score,correct,wrong:attempted-correct,skipped:qs.length-attempted,total:qs.length,createdAt:serverTimestamp()})}catch(e){console.warn(e)}clearRunner();runner=null;section("result");$("resultContent").innerHTML=`<div class="result-hero"><p class="eyebrow">${auto?"TIME UP":"TEST SUBMITTED"}</p><h2>Test completed</h2><div class="score">${score}%</div><div class="result-actions"><button class="primary" data-section="tests">Take another test</button><button class="secondary" data-section="home">Go Home</button></div></div><div class="result-grid"><div class="result-box"><span>Correct</span><b>${correct}</b></div><div class="result-box"><span>Wrong</span><b>${attempted-correct}</b></div><div class="result-box"><span>Skipped</span><b>${qs.length-attempted}</b></div><div class="result-box"><span>Attempted</span><b>${attempted}/${qs.length}</b></div></div>`}
$("examGrid").onclick=e=>{let b=e.target.closest("[data-exam]");if(b){let s=series.find(x=>x.exam===b.dataset.exam);s?openSeries(s.id):section("tests")}};$("seriesGrid").onclick=e=>{let b=e.target.closest("[data-series]");if(b)openSeries(b.dataset.series)};$("practiceExam").onchange=e=>subjects(e.target.value);
$("practice").onclick=e=>{let b=e.target.closest("[data-practice]");if(b)toast("Practice question bank is ready for Firebase data.")};
async function connect(){try{if(!firebaseConfig)try{firebaseConfig=(await import("./firebase-config.js")).firebaseConfig}catch{return}if(!firebaseConfig?.apiKey||firebaseConfig.apiKey.startsWith("PASTE_"))return;const [{initializeApp},{getAuth,onAuthStateChanged,signInAnonymously},{getFirestore,collection,getDocs,getDoc,doc,query,where,limit,addDoc,serverTimestamp}]=await Promise.all([import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")]);let app=initializeApp(firebaseConfig);let auth=getAuth(app);db=getFirestore(app);online=true;onAuthStateChanged(auth,u=>user=u);try{await signInAnonymously(auth)}catch{}let q=await getDocs(query(collection(db,"testSeries"),limit(100)));let remote=[];q.forEach(d=>remote.push({id:d.id,...d.data()}));if(remote.length){series=[...seedSeries,...remote.filter(r=>!seedSeries.some(s=>s.exam===r.exam))];renderSeries()}toast("Firebase data synced")}catch(e){console.warn("Firebase sync unavailable",e)}}
renderExams();categories();renderCatalog();renderSeries();subjects("SSC GD");stats();recent();$("practiceSeriesSearch")?.addEventListener("input",()=>{let active=document.querySelector("#categoryTabs .active")?.textContent||"All";renderSeries(active)});if(state.exam&&$("practiceExam")){$("practiceExam").value=state.exam;subjects(state.exam)}connect();setTimeout(()=>restoreRunner(),0);
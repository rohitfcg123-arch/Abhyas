const exams=[
 {name:"SSC GD",icon:"🛡️",desc:"General Duty Constable",subjects:["General Intelligence & Reasoning","General Knowledge","Elementary Mathematics","English / Hindi"]},
 {name:"SSC CGL",icon:"📊",desc:"Graduate Level",subjects:["Quantitative Aptitude","Reasoning","General Awareness","English"]},
 {name:"SSC CHSL",icon:"📝",desc:"10+2 Level",subjects:["Quantitative Aptitude","Reasoning","General Awareness","English"]},
 {name:"RRB Group D",icon:"🚆",desc:"Railway Group D",subjects:["Mathematics","General Intelligence","General Science","General Awareness"]},
 {name:"RRB NTPC",icon:"🚉",desc:"Non-Technical Popular Categories",subjects:["Mathematics","Reasoning","General Awareness","General Science"]},
 {name:"IBPS PO",icon:"🏦",desc:"Probationary Officer",subjects:["Quantitative Aptitude","Reasoning","English","General Awareness"]},
 {name:"IBPS Clerk",icon:"💳",desc:"Clerical Cadre",subjects:["Numerical Ability","Reasoning","English","General Awareness"]},
 {name:"SBI PO",icon:"🏛️",desc:"Probationary Officer",subjects:["Quantitative Aptitude","Reasoning","English","Banking Awareness"]}
];
const subjects=["Quantitative Aptitude","Reasoning","General Awareness","English","General Science","Computer","Current Affairs"];
const mocks=["SSC GD Full Mock","SSC CGL Tier 1 Mock","RRB Group D Mock","RRB NTPC Mock","IBPS PO Prelims Mock","Banking Mixed Mock"];
const state=JSON.parse(localStorage.getItem("abhyasState")||'{"questions":0,"tests":0,"correct":0,"attempted":0,"streak":0,"exam":""}');
const save=()=>localStorage.setItem("abhyasState",JSON.stringify(state));
function renderStats(){qCount.textContent=state.questions;testCount.textContent=state.tests;accuracy.textContent=state.attempted?Math.round(state.correct/state.attempted*100)+"%":"0%";streak.textContent=state.streak+" day"+(state.streak===1?"":"s")}
function showSection(id){document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));window.scrollTo({top:0,behavior:"smooth"})}
document.addEventListener("click",e=>{const b=e.target.closest("[data-section]");if(b){e.preventDefault();showSection(b.dataset.section)}});
function renderExams(){examGrid.innerHTML=exams.map((e,i)=>`<article class="exam-card"><div class="icon">${e.icon}</div><h3>${e.name}</h3><p>${e.desc}</p><button class="card-link" onclick="selectExam(${i})">Start preparation →</button></article>`).join("")}
function selectExam(i){const e=exams[i];state.exam=e.name;save();examSelect.value=e.name;countdownTitle.textContent=e.name+" target";countdown.textContent="Your target exam";showSection("practice");practiceExam.value=e.name;renderSubjects(e.name)}
function renderSubjects(exam){const e=exams.find(x=>x.name===exam)||exams[0];subjectGrid.innerHTML=e.subjects.map(s=>`<article class="subject-card"><h3>${s}</h3><span class="count">Practice chapter-wise questions</span><br><button class="card-link" onclick="startQuiz('${s}')">Start →</button></article>`).join("")}
function renderMocks(){mockGrid.innerHTML=mocks.map((m,i)=>`<article class="mock-card"><span class="tag">Mock ${i+1}</span><h3>${m}</h3><p>20 questions · 20 minutes · Instant result</p><div class="mock-meta"><span class="pill">Timed</span><span class="pill">Mixed</span></div><button class="primary small" onclick="startQuiz('${m}')">Start Mock</button></article>`).join("")}
function startQuiz(title){modal.classList.remove("hidden");modalContent.innerHTML=`<p class="eyebrow">PRACTICE SESSION</p><h2>${title}</h2><p>This module is ready for the question bank. The first version records your practice activity locally so your dashboard can start tracking progress.</p><div style="display:flex;gap:10px;margin-top:20px"><button class="primary" onclick="recordPractice()">Complete Practice</button><button class="secondary" onclick="closeModal()">Cancel</button></div>`}
function recordPractice(){state.questions+=20;state.attempted+=20;state.correct+=Math.round(20*.7);state.streak=Math.max(1,state.streak);save();renderStats();closeModal();alert("Practice recorded. Your dashboard has been updated.");}
function closeModal(){modal.classList.add("hidden")}
closeModal.addEventListener?.("click",()=>{});
document.getElementById("closeModal").onclick=closeModal;
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
examSelect.addEventListener("change",()=>{if(examSelect.value){state.exam=examSelect.value;save();countdownTitle.textContent=examSelect.value+" target";countdown.textContent="Preparation mode active";}});
practiceExam.addEventListener("change",()=>renderSubjects(practiceExam.value));
profileBtn.onclick=()=>alert("Student profile and login will be connected in the next module.");
renderExams();renderMocks();renderSubjects("SSC GD");renderStats();if(state.exam){examSelect.value=state.exam;countdownTitle.textContent=state.exam+" target";countdown.textContent="Preparation mode active";}

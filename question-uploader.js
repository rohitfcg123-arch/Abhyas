import {firebaseConfig} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut,setPersistence,browserLocalPersistence} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,collection,getDocs,query,where,limit,doc,writeBatch,serverTimestamp,deleteDoc} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const exams=["SSC CGL","SSC CHSL","SSC GD Constable","SSC MTS","SSC CPO","SSC Selection Post","SSC Stenographer","SSC JE","IBPS PO","IBPS Clerk","IBPS RRB PO","IBPS RRB Clerk","SBI PO","SBI Clerk","RRB NTPC","RRB Group D","RRB ALP","RRB Technician","RPF Constable","UPSC Civil Services","CDS","AFCAT","CAPF AC","CTET","KVS","DSSSB","UGC NET","State PSC","UPSSSC PET","UP Police","State Police","Insurance Exams","Nursing Exams","Judiciary Exams","CUET"];
const ALLOWED="rohit.fcg123@gmail.com";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
let selected="",allQuestions=[];
function msg(t,error=false){$("message").textContent=t;$("message").hidden=false;$("message").className="message"+(error?" error":"");if(!error)setTimeout(()=>$("message").hidden=true,5000)}
function firebaseUploadError(e){
  const code=e?.code||"unknown";
  if(code==="permission-denied"||code==="PERMISSION_DENIED")
    return "Upload blocked by Firestore rules. Firebase Authentication is working, but the current account is not being allowed to write to /questions. Publish the latest firestore.rules in Firebase Console → Firestore Database → Rules, then retry.";
  if(code==="unauthenticated")
    return "Upload blocked: Firebase says you are not authenticated. Logout and sign in again with rohit.fcg123@gmail.com.";
  return "Upload failed ["+code+"]: "+(e?.message||"Unknown Firebase error");
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function examName(q){return String(q.exam||q.examName||"").trim()}
function renderExams(counts={}){$("examList").innerHTML=exams.map(e=>`<button class="exam-item ${selected===e?"active":""}" data-exam="${esc(e)}"><span>${esc(e)}</span><small>${counts[e]||0}</small></button>`).join("");document.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>selectExam(b.dataset.exam))}
function currentCounts(){const c={};document.querySelectorAll(".exam-item").forEach(b=>c[b.dataset.exam]=b.querySelector("small")?.textContent||0);return c}
async function loadCounts(){const snap=await getDocs(query(collection(db,"questions"),limit(1000)));const c={};snap.forEach(d=>{const e=examName(d.data());if(e)c[e]=(c[e]||0)+1});renderExams(c)}
async function selectExam(exam){selected=exam;$("selectedExam").textContent=exam;$("questionSearch").value="";renderExams(currentCounts());$("questionList").innerHTML='<div class="empty">Loading questions…</div>';try{const snap=await getDocs(query(collection(db,"questions"),where("exam","==",exam),limit(1000)));allQuestions=snap.docs.map(d=>({id:d.id,...d.data()}));renderQuestions();$("summary").textContent=allQuestions.length+" question"+(allQuestions.length===1?"":"s")+" in "+exam}catch(e){msg("Failed to load questions: "+e.message,true)}}
function renderQuestions(){const term=$("questionSearch").value.trim().toLowerCase();const list=allQuestions.filter(q=>!term||[q.question,q.chapter,q.subject,q.source,q.year].join(" ").toLowerCase().includes(term));$("questionList").innerHTML=list.length?list.map((q,i)=>`<article class="question-card"><div class="meta"><span class="tag">#${i+1}</span><span class="tag">${esc(q.subject||"No subject")}</span><span class="tag">${esc(q.chapter||"No chapter")}</span><span class="tag">${esc(q.source||"Uploaded")}</span><span class="tag">${esc(q.year||"")}</span></div><h3>${esc(q.question||"")}</h3><div class="options">${(q.options||[]).map((o,j)=>`<div class="${j===Number(q.answerIndex)?"correct":""}">${String.fromCharCode(65+j)}. ${esc(o)} ${j===Number(q.answerIndex)?"✓":""}</div>`).join("")}</div></article>`).join(""):'<div class="empty">No questions found for this exam.</div>'}
function validate(q,i){if(!q||typeof q!=="object")return "Question "+(i+1)+" is not an object";if(!examName(q))return "Question "+(i+1)+": exam is required";if(!q.question)return "Question "+(i+1)+": question is required";if(!Array.isArray(q.options)||q.options.length<2)return "Question "+(i+1)+": options must be an array";if(!Number.isInteger(Number(q.answerIndex))||Number(q.answerIndex)<0||Number(q.answerIndex)>=q.options.length)return "Question "+(i+1)+": invalid answerIndex";return null}
async function upload(file){
  const user=auth.currentUser;
  if(!user)return msg("Upload blocked: no Firebase user is active. Please login again.",true);
  if(String(user.email||"").toLowerCase()!==ALLOWED||!user.emailVerified)
    return msg("Upload blocked: use the verified admin account "+ALLOWED+".",true);
  let raw;try{raw=JSON.parse(await file.text())}catch{return msg("Invalid JSON file.",true)}let questions=Array.isArray(raw)?raw:(Array.isArray(raw.questions)?raw.questions:[]);if(!questions.length)return msg("JSON must be an array or contain a questions array.",true);const errors=[];questions.forEach((q,i)=>{const e=validate(q,i);if(e&&errors.length<10)errors.push(e)});if(errors.length)return msg(errors.join(" | "),true);try{
  // Replacement upload: the JSON becomes the complete question bank for
  // every exam represented in this file. Existing records for those exams
  // are deleted first, so old/duplicate uploads cannot leak into the test.
  const examSet=[...new Set(questions.map(examName).filter(Boolean))];
  for(const ex of examSet){
    const snap=await getDocs(query(collection(db,"questions"),where("exam","==",ex),limit(5000)));
    for(let i=0;i<snap.docs.length;i+=450){
      const batch=writeBatch(db);
      snap.docs.slice(i,i+450).forEach(d=>batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Remove duplicate question text inside the uploaded JSON itself.
  const seen=new Set(),clean=[];
  for(const q of questions){
    const key=String(q.question).replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/\s+/g," ").trim().toLowerCase();
    if(!key||seen.has(key))continue;
    seen.add(key);clean.push(q);
  }

  for(let i=0;i<clean.length;i+=450){
    const batch=writeBatch(db);
    clean.slice(i,i+450).forEach(q=>batch.set(doc(collection(db,"questions")),{exam:examName(q),subject:String(q.subject||""),chapter:String(q.chapter||""),question:String(q.question),options:q.options.map(String),answerIndex:Number(q.answerIndex),explanation:String(q.explanation||""),marks:Number(q.marks??1),negativeMarks:Number(q.negativeMarks??0),difficulty:String(q.difficulty||"Medium"),source:String(q.source||"Uploaded"),year:q.year??"",questionNo:q.questionNo??"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await batch.commit();
  }

  msg(clean.length+" questions uploaded. Existing questions for "+examSet.join(", ")+" were replaced.");
  await loadCounts();
  if(selected)await selectExam(selected);
}catch(e){console.error("Question replacement error:",e);msg(firebaseUploadError(e),true)}}
$("logoutBtn").onclick=async()=>{await signOut(auth);window.location.replace("admin.html?v=18")};
$("jsonFile").onchange=e=>{if(e.target.files[0])upload(e.target.files[0]);e.target.value=""};
$("questionSearch").oninput=renderQuestions;
$("downloadTemplate").onclick=()=>{const sample=[{exam:"SSC CGL",subject:"Quantitative Aptitude",chapter:"Percentage",question:"20% of 250 is?",options:["40","50","60","70"],answerIndex:1,explanation:"250 × 20 / 100 = 50",marks:1,negativeMarks:0.25,difficulty:"Easy",source:"PYQ",year:2026,questionNo:1}];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({questions:sample},null,2)],{type:"application/json"}));a.download="abhyas-question-template.json";a.click();URL.revokeObjectURL(a.href)};
setPersistence(auth,browserLocalPersistence).catch(()=>{});
onAuthStateChanged(auth,async user=>{if(!user){window.location.replace("admin.html?v=18");return}const email=String(user.email||"").toLowerCase();if(email!==ALLOWED||!user.emailVerified){await signOut(auth);window.location.replace("admin.html?v=18");return}$("loading").remove();$("appView").hidden=false;renderExams();try{await loadCounts()}catch(e){msg("Could not load questions: "+e.message,true)}});

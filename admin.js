import {firebaseConfig} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,GoogleAuthProvider,signInWithPopup,setPersistence,browserLocalPersistence} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,getDocs,query,where,limit,doc,writeBatch,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const exams=["SSC CGL","SSC CHSL","SSC GD Constable","SSC MTS","SSC CPO","SSC Selection Post","SSC Stenographer","SSC JE","IBPS PO","IBPS Clerk","IBPS RRB PO","IBPS RRB Clerk","SBI PO","SBI Clerk","RRB NTPC","RRB Group D","RRB ALP","RRB Technician","RPF Constable","UPSC Civil Services","CDS","AFCAT","CAPF AC","CTET","KVS","DSSSB","UGC NET","State PSC","UPSSSC PET","UP Police","State Police","Insurance Exams","Nursing Exams","Judiciary Exams","CUET"];
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),googleProvider=new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt:"select_account"});
const ALLOWED_UPLOADER_EMAIL="rohit.fcg123@gmail.com";
async function initializeAuthFlow(){
  await setPersistence(auth,browserLocalPersistence);
}
const $=id=>document.getElementById(id); let selected="",allQuestions=[];
function msg(t,error=false){$("message").textContent=t;$("message").hidden=false;$("message").className="message"+(error?" error":"");setTimeout(()=>{$("message").hidden=true},4500)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function examName(q){return String(q.exam||q.examName||"").trim()}
function renderExams(counts={}){$("examList").innerHTML=exams.map(e=>`<button class="exam-item ${selected===e?"active":""}" data-exam="${esc(e)}"><span>${esc(e)}</span><small>${counts[e]||0}</small></button>`).join("");document.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>selectExam(b.dataset.exam))}
async function loadCounts(){try{const snap=await getDocs(query(collection(db,"questions"),limit(1000)));const c={};snap.forEach(d=>{const e=examName(d.data());if(e)c[e]=(c[e]||0)+1});renderExams(c)}catch(e){msg("Could not load question counts: "+e.message,true)}}
async function selectExam(exam){selected=exam;$("selectedExam").textContent=exam;$("questionSearch").value="";renderExams(currentCounts());$("questionList").innerHTML='<div class="empty">Loading questions…</div>';try{const snap=await getDocs(query(collection(db,"questions"),where("exam","==",exam),limit(1000)));allQuestions=snap.docs.map(d=>({id:d.id,...d.data()}));renderQuestions();$("summary").textContent=allQuestions.length+" question"+(allQuestions.length===1?"":"s")+" in "+exam}catch(e){$("questionList").innerHTML='<div class="empty">Failed to load questions.</div>';msg(e.message,true)}}
function currentCounts(){const c={};document.querySelectorAll(".exam-item").forEach(b=>c[b.dataset.exam]=b.querySelector("small")?.textContent||0);return c}
function renderQuestions(){const term=$("questionSearch").value.trim().toLowerCase();const list=allQuestions.filter(q=>!term||[q.question,q.chapter,q.subject,q.source,q.year].join(" ").toLowerCase().includes(term));$("questionList").innerHTML=list.length?list.map((q,i)=>`<article class="question-card"><div class="meta"><span class="tag">#${i+1}</span><span class="tag">${esc(q.subject||"No subject")}</span><span class="tag">${esc(q.chapter||"No chapter")}</span><span class="tag">${esc(q.source||"Uploaded")}</span><span class="tag">${esc(q.year||"")}</span></div><h3>${esc(q.question||"")}</h3><div class="options">${(q.options||[]).map((o,j)=>`<div class="${j===Number(q.answerIndex)?"correct":""}">${String.fromCharCode(65+j)}. ${esc(o)} ${j===Number(q.answerIndex)?"✓":""}</div>`).join("")}</div></article>`).join(""):'<div class="empty">No questions found for this exam.</div>'}
function validate(q,i){if(!q||typeof q!=="object")return "Question "+(i+1)+" is not an object";if(!examName(q))return "Question "+(i+1)+": exam is required";if(!q.question)return "Question "+(i+1)+": question is required";if(!Array.isArray(q.options)||q.options.length<2)return "Question "+(i+1)+": options must be an array";if(!Number.isInteger(Number(q.answerIndex))||Number(q.answerIndex)<0||Number(q.answerIndex)>=q.options.length)return "Question "+(i+1)+": invalid answerIndex";return null}
async function upload(file){let raw;try{raw=JSON.parse(await file.text())}catch{return msg("Invalid JSON file.",true)}let questions=Array.isArray(raw)?raw:(Array.isArray(raw.questions)?raw.questions:[]);if(!questions.length)return msg("JSON must be an array or contain a questions array.",true);const errors=[];questions.forEach((q,i)=>{const e=validate(q,i);if(e&&errors.length<10)errors.push(e)});if(errors.length)return msg(errors.join(" | "),true);try{for(let i=0;i<questions.length;i+=450){const batch=writeBatch(db);questions.slice(i,i+450).forEach(q=>{const data={exam:examName(q),subject:String(q.subject||""),chapter:String(q.chapter||""),question:String(q.question),options:q.options.map(String),answerIndex:Number(q.answerIndex),explanation:String(q.explanation||""),marks:Number(q.marks??1),negativeMarks:Number(q.negativeMarks??0),difficulty:String(q.difficulty||"Medium"),source:String(q.source||"Uploaded"),year:q.year??"",questionNo:q.questionNo??"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()};batch.set(doc(collection(db,"questions")),data)});await batch.commit()}msg(questions.length+" questions uploaded successfully.");await loadCounts();if(selected)await selectExam(selected)}catch(e){msg("Upload failed: "+e.message,true)}}
$("loginForm").onsubmit=async e=>{e.preventDefault();$("loginMsg").textContent="Signing in…";try{await signInWithEmailAndPassword(auth,$("email").value,$("password").value)}catch(err){$("loginMsg").textContent=err.message}};
$("logoutBtn").onclick=()=>signOut(auth);
$("googleLoginBtn").addEventListener("click",async()=>{
  $("googleLoginBtn").disabled=true;
  $("loginMsg").textContent="Opening Google sign-in…";
  try{
    await setPersistence(auth,browserLocalPersistence);
    const result=await signInWithPopup(auth,googleProvider);
    if(!result?.user)throw new Error("Google sign-in did not return a Firebase user.");
    if(typeof auth.authStateReady==="function")await auth.authStateReady();
    if(!auth.currentUser)throw new Error("Firebase sign-in completed, but the session was not restored.");
  }catch(err){
    console.error("Google popup sign-in error:",err);
    $("loginMsg").textContent=firebaseMessage(err);
    $("googleLoginBtn").disabled=false;
  }
});
$("jsonFile").onchange=e=>{if(e.target.files[0])upload(e.target.files[0]);e.target.value=""};
$("questionSearch").oninput=renderQuestions;
$("downloadTemplate").onclick=()=>{const sample=[{exam:"SSC CGL",subject:"Quantitative Aptitude",chapter:"Percentage",question:"20% of 250 is?",options:["40","50","60","70"],answerIndex:1,explanation:"250 × 20 / 100 = 50",marks:1,negativeMarks:0.25,difficulty:"Easy",source:"PYQ",year:2026,questionNo:1}];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({questions:sample},null,2)],{type:"application/json"}));a.download="abhyas-question-template.json";a.click();URL.revokeObjectURL(a.href)};
onAuthStateChanged(auth,async user=>{if(!user){$("loginView").hidden=false;$("appView").hidden=true;$("googleLoginBtn").disabled=false;return}try{const email=String(user.email||"").toLowerCase();if(email!==ALLOWED_UPLOADER_EMAIL){await signOut(auth);$("loginMsg").textContent="This email is not authorized as a question uploader.";$("googleLoginBtn").disabled=false;return}if(!user.emailVerified){await signOut(auth);$("loginMsg").textContent="Please use the verified Google account: "+ALLOWED_UPLOADER_EMAIL;$("googleLoginBtn").disabled=false;return}$("loginView").hidden=true;$("appView").hidden=false;renderExams();await loadCounts()}catch(e){await signOut(auth);$("loginMsg").textContent="Admin verification failed: "+e.message}});
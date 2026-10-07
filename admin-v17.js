import {firebaseConfig} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,GoogleAuthProvider,signInWithPopup,setPersistence,browserLocalPersistence} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,collection,getDocs,query,where,limit,doc,writeBatch,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const exams=["SSC CGL","SSC CHSL","SSC GD Constable","SSC MTS","SSC CPO","SSC Selection Post","SSC Stenographer","SSC JE","IBPS PO","IBPS Clerk","IBPS RRB PO","IBPS RRB Clerk","SBI PO","SBI Clerk","RRB NTPC","RRB Group D","RRB ALP","RRB Technician","RPF Constable","UPSC Civil Services","CDS","AFCAT","CAPF AC","CTET","KVS","DSSSB","UGC NET","State PSC","UPSSSC PET","UP Police","State Police","Insurance Exams","Nursing Exams","Judiciary Exams","CUET"];
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const ALLOWED_UPLOADER_EMAIL="rohit.fcg123@gmail.com";
const GOOGLE_CLIENT_ID="195021507273-v5svc41iino6bp97ft9nbp563l3u5fa9.apps.googleusercontent.com";
const $=id=>document.getElementById(id); let selected="",allQuestions=[]; let googleLoginInProgress=false;
const persistenceReady=setPersistence(auth,browserLocalPersistence).catch(error=>console.error("Auth persistence error:",error));
function firebaseMessage(error){
  const map={
    "auth/unauthorized-domain":"This website domain is not authorized in Firebase Authentication. Add rohitfcg123-arch.github.io in Firebase Authentication → Settings → Authorized domains.",
    "auth/operation-not-allowed":"Google sign-in is not enabled in Firebase Authentication. Enable Google under Authentication → Sign-in method.",
    "auth/network-request-failed":"Network request failed. Check your internet connection.",
    "auth/popup-blocked":"Google sign-in popup was blocked. Allow popups for this site and try again.",
    "auth/popup-closed-by-user":"Google sign-in was cancelled. Please try again.",
    "auth/internal-error":"Firebase could not complete Google sign-in. Please try again.",
    "auth/account-exists-with-different-credential":"An account already exists with this email using another sign-in method."
  };
  return map[error?.code]||("Firebase error: "+(error?.code||"unknown")+" — "+(error?.message||"Please try again."));
}
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
  const btn=$("googleLoginBtn");
  googleLoginInProgress=true;
  btn.disabled=true;
  $("loginMsg").textContent="Opening Google sign-in…";
  try{
    await persistenceReady;
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const result=await signInWithPopup(auth,provider);
    if(!result?.user)throw new Error("Google sign-in did not return a Firebase user.");
    $("loginMsg").textContent="Google account verified. Opening Question Uploader…";
    // Do not wait for auth.authStateReady() here. On some Android Chrome/Firebase
    // combinations it can remain pending even though signInWithPopup succeeded.
    // The popup result already contains the authenticated Firebase user.
    const user=result.user;
    const email=String(user.email||"").toLowerCase();
    if(email!==ALLOWED_UPLOADER_EMAIL){
      await signOut(auth);
      throw new Error("This email is not authorized as a question uploader.");
    }
    if(!user.emailVerified){
      await signOut(auth);
      throw new Error("Please use the verified Google account: "+ALLOWED_UPLOADER_EMAIL);
    }
    $("loginView").hidden=true;
    $("appView").hidden=false;
    renderExams();
    await loadCounts();
  }catch(err){
    console.error("Google sign-in error:",err);
    $("loginMsg").textContent=firebaseMessage(err);
  }finally{
    btn.disabled=false;
  }
});
$("jsonFile").onchange=e=>{if(e.target.files[0])upload(e.target.files[0]);e.target.value=""};
$("questionSearch").oninput=renderQuestions;
$("downloadTemplate").onclick=()=>{const sample=[{exam:"SSC CGL",subject:"Quantitative Aptitude",chapter:"Percentage",question:"20% of 250 is?",options:["40","50","60","70"],answerIndex:1,explanation:"250 × 20 / 100 = 50",marks:1,negativeMarks:0.25,difficulty:"Easy",source:"PYQ",year:2026,questionNo:1}];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({questions:sample},null,2)],{type:"application/json"}));a.download="abhyas-question-template.json";a.click();URL.revokeObjectURL(a.href)};
onAuthStateChanged(auth,async user=>{
  // Firebase can briefly emit null while a popup login is completing.
  // Never reset the admin UI during that transient state.
  if(!user){
    if(googleLoginInProgress)return;
    $("loginView").hidden=false;
    $("appView").hidden=true;
    $("googleLoginBtn").disabled=false;
    return;
  }
  const email=String(user.email||"").toLowerCase();
  if(email!==ALLOWED_UPLOADER_EMAIL){
    googleLoginInProgress=false;
    await signOut(auth);
    $("loginView").hidden=false;
    $("appView").hidden=true;
    $("loginMsg").textContent="This email is not authorized as a question uploader.";
    $("googleLoginBtn").disabled=false;
    return;
  }
  if(!user.emailVerified){
    googleLoginInProgress=false;
    await signOut(auth);
    $("loginView").hidden=false;
    $("appView").hidden=true;
    $("loginMsg").textContent="Please use the verified Google account: "+ALLOWED_UPLOADER_EMAIL;
    $("googleLoginBtn").disabled=false;
    return;
  }
  googleLoginInProgress=false;
  $("loginView").hidden=true;
  $("appView").hidden=false;
  renderExams();
  try{
    await loadCounts();
  }catch(e){
    console.error("Question loading failed after authentication:",e);
    msg("Logged in successfully, but questions could not be loaded: "+e.message,true);
  }
});
/* Abhyas UI fixes: preserve the current page and provide true live, partial-text search. */
(()=>{
  const sectionKey="abhyas_active_section_v1";
  const qs=s=>document.querySelector(s);
  const activate=id=>{
    const target=document.getElementById(id); if(!target)return;
    document.querySelectorAll(".section").forEach(x=>x.classList.toggle("active",x.id===id));
    document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.section===id));
    try{sessionStorage.setItem(sectionKey,id)}catch{}
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const saveCurrent=()=>{const a=document.querySelector(".section.active");if(a)try{sessionStorage.setItem(sectionKey,a.id)}catch{}};

  /* Search is intentionally substring-based and starts filtering from the first character.
     Example: S -> SSC/UPSC/SBI..., SS -> SSC..., SSC -> SSC CGL/CHSL/etc. */
  const normalize=s=>String(s||"").toLowerCase().replace(/\\s+/g," ").trim();
  const applySearch=term=>{
    const q=normalize(term);
    const cards=[...document.querySelectorAll("#examCatalog .catalog-card")];
    cards.forEach(card=>{
      const hay=normalize(card.textContent);
      card.hidden=!!q && !hay.includes(q);
    });
    const visible=cards.filter(x=>!x.hidden).length;
    const count=qs("#examCount");
    if(count)count.textContent=visible+" Exam"+(visible===1?"":"s");

    /* Also filter visible test-series cards using the same contains rule. */
    const seriesCards=[...document.querySelectorAll("#seriesGrid .series-card")];
    seriesCards.forEach(card=>{
      const hay=normalize(card.textContent);
      card.hidden=!!q && !hay.includes(q);
    });
  };
  const focusTests=()=>{if(document.getElementById("tests"))activate("tests")};

  /* Capture phase prevents the old bubble listener from replacing the live filter. */
  document.addEventListener("input",e=>{
    if(!e.target.matches("#globalSearch,#practiceSeriesSearch"))return;
    e.stopPropagation();
    const value=e.target.value;
    const other=e.target.id==="globalSearch"?qs("#practiceSeriesSearch"):qs("#globalSearch");
    if(other && other.value!==value)other.value=value;
    if(value.trim())focusTests();
    applySearch(value);
    saveCurrent();
  },true);

  document.addEventListener("keydown",e=>{
    if(!e.target.matches("#globalSearch,#practiceSeriesSearch"))return;
    if(e.key==="Enter"){e.preventDefault();focusTests();applySearch(e.target.value);}
  },true);

  /* Category buttons can rebuild the cards; re-apply the current search automatically. */
  const observer=new MutationObserver(()=>{
    const value=qs("#practiceSeriesSearch")?.value || qs("#globalSearch")?.value || "";
    if(value)applySearch(value);
  });
  const watch=()=>{
    const a=qs("#examCatalog"),b=qs("#seriesGrid");
    if(a)observer.observe(a,{childList:true,subtree:true});
    if(b)observer.observe(b,{childList:true,subtree:true});
  };
  const restore=()=>{
    try{
      const active=localStorage.getItem("abhyas_active_test_v1");
      if(active){const r=JSON.parse(active);if(r?.t?.questions?.length){activate("testRunner");return;}}
      const id=sessionStorage.getItem(sectionKey);
      if(id&&document.getElementById(id))activate(id);
    }catch{}
  };
  setTimeout(watch,250);
  setTimeout(restore,150);
  setTimeout(restore,700);
})();

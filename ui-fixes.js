/* Abhyas UI fixes: preserve the current page across refresh and make both search boxes functional. */
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
  const filterCatalog=term=>{
    const q=term.trim().toLowerCase();
    document.querySelectorAll("#examCatalog .catalog-card").forEach(card=>{
      card.hidden=!!q&&!card.textContent.toLowerCase().includes(q);
    });
    const visible=[...document.querySelectorAll("#examCatalog .catalog-card")].filter(x=>!x.hidden).length;
    const count=qs("#examCount"); if(count)count.textContent=visible+" Exams";
  };
  const runSearch=value=>{
    const q=value.trim();
    if(q)activate("tests");
    const series=qs("#practiceSeriesSearch");
    if(series){series.value=q;series.dispatchEvent(new Event("input",{bubbles:true}));}
    filterCatalog(q);
  };
  document.addEventListener("input",e=>{
    if(e.target.matches("#globalSearch"))runSearch(e.target.value);
    if(e.target.matches("#practiceSeriesSearch")){filterCatalog(e.target.value);saveCurrent();}
  });
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-section]"); if(b)setTimeout(saveCurrent,0);
  });
  const restore=()=>{
    try{
      const active=localStorage.getItem("abhyas_active_test_v1");
      if(active){
        const r=JSON.parse(active); if(r?.t?.questions?.length){activate("testRunner");return;}
      }
      const id=sessionStorage.getItem(sectionKey);
      if(id&&document.getElementById(id))activate(id);
    }catch{}
  };
  setTimeout(restore,150);
  setTimeout(restore,700);
})();

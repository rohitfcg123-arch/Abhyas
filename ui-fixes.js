/* Abhyas UI fixes: preserve the current page and provide instant relevance-ranked partial search. */
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

  const normalize=s=>String(s||"").toLowerCase().replace(/\s+/g," ").trim();
  const compact=s=>normalize(s).replace(/[^a-z0-9]+/g,"");
  const fuzzySubsequence=(q,text)=>{
    if(!q)return true;
    let i=0;
    for(const ch of text){if(ch===q[i])i++;if(i===q.length)return true}
    return false;
  };

  /* Higher score = better match. Exact/prefix/word-prefix matches always beat
     a generic contains/fuzzy match. This makes the best result jump to the top
     immediately while the user types character-by-character. */
  const relevance=(query,card)=>{
    const q=normalize(query), text=normalize(card.textContent);
    if(!q)return 0;
    const nameEl=card.querySelector("h4,h3");
    const name=normalize(nameEl?.textContent||text);
    const nq=compact(q), nn=compact(name);
    if(name===q)return 10000;
    if(nn===nq)return 9900;
    if(name.startsWith(q))return 9000-q.length;
    if(nn.startsWith(nq))return 8900-q.length;
    const words=name.split(/[^a-z0-9]+/).filter(Boolean);
    if(words.some(w=>w.startsWith(q)))return 8000-q.length;
    if(words.some(w=>w.startsWith(nq)))return 7900-q.length;
    const namePos=name.indexOf(q);
    if(namePos>=0)return 7000-namePos;
    const compactPos=nn.indexOf(nq);
    if(compactPos>=0)return 6900-compactPos;
    const fullPos=text.indexOf(q);
    if(fullPos>=0)return 5000-fullPos;
    if(fuzzySubsequence(nq,nn))return 2000-q.length;
    return 0;
  };

  const rankAndFilter=(container,term)=>{
    if(!container)return [];
    const q=normalize(term);
    const cards=[...container.children].filter(x=>x.classList.contains("catalog-card")||x.classList.contains("series-card"));
    const ranked=cards.map((card,index)=>({card,index,score:relevance(q,card)}));
    ranked.forEach(x=>{x.card.hidden=!!q && x.score<=0});
    ranked.sort((a,b)=>b.score-a.score || a.index-b.index);
    const frag=document.createDocumentFragment();
    ranked.forEach(x=>frag.appendChild(x.card));
    container.appendChild(frag);
    return ranked.filter(x=>!x.card.hidden).length;
  };

  const applySearch=term=>{
    const q=normalize(term);
    const visible=rankAndFilter(qs("#examCatalog"),q);
    const count=qs("#examCount");
    if(count)count.textContent=visible+" Exam"+(visible===1?"":"s");
    rankAndFilter(qs("#seriesGrid"),q);
  };

  const focusTests=()=>{if(document.getElementById("tests"))activate("tests")};

  /* Capture phase keeps search responsive and prevents older handlers from
     interfering with the live, ranked filtering. */
  document.addEventListener("input",e=>{
    if(!e.target.matches("#practiceSeriesSearch"))return;
    e.stopPropagation();
    const value=e.target.value;
    if(value.trim())focusTests();
    applySearch(value);
    saveCurrent();
  },true);

  document.addEventListener("keydown",e=>{
    if(!e.target.matches("#practiceSeriesSearch"))return;
    if(e.key==="Enter"){e.preventDefault();focusTests();applySearch(e.target.value);}
  },true);

  /* Category buttons can rebuild the cards; immediately re-apply the current search. */
  const observer=new MutationObserver(()=>{
    const value=qs("#practiceSeriesSearch")?.value||"";
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
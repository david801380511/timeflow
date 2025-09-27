(function(){
  // Detect current page
  const path = location.pathname;

  function fmt2(n){ return String(n).padStart(2,'0'); }
  function toDateStrLocal(d){
    const y = d.getFullYear();
    const m = fmt2(d.getMonth()+1);
    const da = fmt2(d.getDate());
    return `${y}-${m}-${da}`;
  }

  async function getLimit(){
    const res = await fetch('/api/limits/setting');
    return res.json();
  }
  async function saveLimit(minutes){
    const res = await fetch('/api/limits/setting', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ daily_limit_minutes: minutes })
    });
    if(!res.ok){
      const e = await res.json().catch(()=>({}));
      throw new Error(e.detail || 'Failed to save limit');
    }
    return res.json();
  }
  async function getProgress(yyyy_mm_dd){
    const res = await fetch(`/api/limits/progress?date=${encodeURIComponent(yyyy_mm_dd)}`);
    return res.json();
  }

  // SETTINGS PAGE
  const limitInput = document.getElementById('daily-limit-minutes');
  const limitSave = document.getElementById('save-daily-limit');
  const limitStatus = document.getElementById('limit-status');

  if (limitInput && limitSave){
    getLimit().then(d => {
      limitInput.value = d.daily_limit_minutes;
      if (limitStatus) limitStatus.textContent = `Current: ${d.daily_limit_minutes} min`;
    }).catch(()=>{});

    limitSave.addEventListener('click', async ()=>{
      const val = parseInt(limitInput.value,10);
      if (!Number.isInteger(val) || val<=0 || val>1440){
        alert('Enter a valid number of minutes (1..1440).');
        return;
      }
      try{
        const d = await saveLimit(val);
        if (limitStatus) limitStatus.textContent = `Current: ${d.daily_limit_minutes} min`;
        alert('Saved daily limit.');
      }catch(e){
        alert(e.message);
      }
    });
  }

  // TIMER PAGE: auto-pause on limit
  if (path === '/timer'){
    let warnedForDate = null;
    async function check(){
      try{
        const today = toDateStrLocal(new Date());
        const [{ daily_limit_minutes }, { minutes }] = await Promise.all([getLimit(), getProgress(today)]);
        if (minutes >= daily_limit_minutes){
          if (warnedForDate !== today){
            alert('Daily study limit reached.');
            const pauseBtn = document.getElementById('pause-btn');
            if (pauseBtn) pauseBtn.click();
            warnedForDate = today;
          }
        } else {
          if (warnedForDate !== null && warnedForDate !== today) warnedForDate = null;
        }
      }catch{}
    }
    setInterval(check, 10000);
    check();
  }
})();

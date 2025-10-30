(function () {
  // --- Config ---
  const START_HOUR = 6;
  const END_HOUR = 22;
  const SLOT_MIN = 30; // minutes
  const DAYS = 7;      // Mon..Sun

  // --- Elements ---
  const grid = document.getElementById('calendarGrid');
  const weekLabel = document.getElementById('weekLabel');
  const prevWeekBtn = document.getElementById('prevWeek');
  const nextWeekBtn = document.getElementById('nextWeek');
  const todayBtn   = document.getElementById('todayBtn');
  const autoScheduleBtn = document.getElementById('autoScheduleBtn');

  const modal = document.getElementById('blockModal');
  const blkTitle = document.getElementById('blkTitle');
  const blkType = document.getElementById('blkType');
  const assignWrap = document.getElementById('assignWrap');
  const blkAssignment = document.getElementById('blkAssignment');
  const blkCancel = document.getElementById('blkCancel');
  const blkSave = document.getElementById('blkSave');

  // --- State ---
  let weekStart = mondayOf(new Date());
  let slots = [];
  let isSelecting = false;
  let selStart = null;
  let selEnd = null;
  let assignments = [];
  let blocks = [];
  let settings = null;

  // --- Utilities ---
  function fmt2(n){ return String(n).padStart(2,'0'); }
  function mondayOf(d){
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    x.setHours(0,0,0,0);
    return x;
  }
  function addDays(d, days){ const x = new Date(d); x.setDate(x.getDate()+days); return x; }
  function localDateStr(d){ return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`; }
  function localDateTimeStr(d){ return `${localDateStr(d)}T${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:00`; }
  function minutesToHM(mins){
    const h = Math.floor(mins/60), m = mins%60;
    return `${fmt2(h)}:${fmt2(m)}`;
  }
  function rowToMinutes(row){ return START_HOUR*60 + row*SLOT_MIN; }
  function minutesToRow(mins){ return Math.round((mins - START_HOUR*60) / SLOT_MIN); }

  function clearSelection(){
    if (!selStart || !selEnd) return;
    const [a,b] = normRange(selStart, selEnd);
    for(let day=a.day; day<=b.day; day++){
      for (let r=(day===a.day?a.row:0); r<=(day===b.day?b.row:rowsPerDay()-1); r++){
        slots[day][r].classList.remove('selected');
      }
    }
    selStart = selEnd = null;
  }

  function rowsPerDay(){ return ((END_HOUR*60 - START_HOUR*60)/SLOT_MIN)|0; }
  function normRange(s,e){
    const cmp = (s.day - e.day) || (s.row - e.row);
    return (cmp<=0) ? [s,e] : [e,s];
  }

  function updateWeekLabel(){
    const end = addDays(weekStart, 6);
    weekLabel.textContent = `${localDateStr(weekStart)} – ${localDateStr(end)}`;
    for (let i=0;i<DAYS;i++){
      const d = addDays(weekStart, i);
      const el = document.getElementById(`dayHead${i}`);
      const weekday = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i];
      el.textContent = `${weekday} ${d.getMonth()+1}/${d.getDate()}`;
    }
  }

  // --- Build grid ---
  function buildGrid(){
    const totalRows = rowsPerDay();
    while (grid.children.length > 8) grid.removeChild(grid.lastChild);
    slots = Array.from({length:DAYS}, ()=> Array(totalRows).fill(null));

    for (let r=0; r<totalRows; r++){
      const mins = rowToMinutes(r);
      const timeCell = document.createElement('div');
      timeCell.className = "p-2 border-b border-r border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400";
      timeCell.textContent = minutesToHM(mins);
      grid.appendChild(timeCell);

      for (let day=0; day<DAYS; day++){
        const cell = document.createElement('div');
        cell.className = "slot border-b border-r border-gray-200 dark:border-gray-700";
        cell.dataset.day = String(day);
        cell.dataset.row = String(r);
        cell.addEventListener('mousedown', startSelect);
        cell.addEventListener('mouseenter', growSelect);
        cell.addEventListener('mouseup', endSelect);
        slots[day][r] = cell;
        grid.appendChild(cell);
      }
    }

    document.addEventListener('mouseup', () => {
      if (isSelecting) {
        isSelecting = false;
        finishSelection();
      }
    }, { capture: true });
  }

  function startSelect(e){
    isSelecting = true;
    const day = parseInt(e.currentTarget.dataset.day,10);
    const row = parseInt(e.currentTarget.dataset.row,10);
    selStart = {day,row};
    selEnd = {day,row};
    e.currentTarget.classList.add('selected');
  }

  function growSelect(e){
    if (!isSelecting) return;
    const day = parseInt(e.currentTarget.dataset.day,10);
    const row = parseInt(e.currentTarget.dataset.row,10);
    selEnd = {day,row};
    const [a,b] = normRange(selStart, selEnd);
    Array.from(grid.querySelectorAll('.slot.selected')).forEach(el=>el.classList.remove('selected'));
    for(let d=a.day; d<=b.day; d++){
      for (let r=(d===a.day?a.row:0); r<=(d===b.day?b.row:rowsPerDay()-1); r++){
        slots[d][r].classList.add('selected');
      }
    }
  }

  function endSelect(e){
    if (!isSelecting) return;
    isSelecting = false;
    const day = parseInt(e.currentTarget.dataset.day,10);
    const row = parseInt(e.currentTarget.dataset.row,10);
    selEnd = {day,row};
    finishSelection();
  }

  async function finishSelection(){
    if (!selStart || !selEnd) return;
    const [a,b] = normRange(selStart, selEnd);
    const startDay = addDays(weekStart, a.day);
    const endDay   = addDays(weekStart, b.day);
    const startMins = rowToMinutes(a.row);
    const endMins   = rowToMinutes(b.row + 1);

    const start = new Date(startDay);
    start.setHours(Math.floor(startMins/60), startMins%60, 0, 0);
    const end = new Date(endDay);
    end.setHours(Math.floor(endMins/60), endMins%60, 0, 0);

    blkTitle.value = "";
    blkType.value = "busy";
    assignWrap.classList.add('hidden');
    blkAssignment.innerHTML = "";
    await loadAssignments();
    openModal(async (confirmed) => {
      if (!confirmed) { clearSelection(); return; }
      const payload = {
        title: blkTitle.value.trim() || (blkType.value === 'busy' ? 'Busy' : 'Study'),
        start: localDateTimeStr(start),
        end: localDateTimeStr(end),
        block_type: blkType.value
      };
      if (blkType.value === 'study' && blkAssignment.value){
        payload.assignment_id = parseInt(blkAssignment.value,10);
      }
      try{
        const res = await fetch('/api/calendar/blocks', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        if(!res.ok){
          const e = await res.json().catch(()=>({}));
          alert(e.detail || 'Failed to create block');
        }else{
          await loadBlocks();
          renderBlocks();
        }
      }catch(_){}
      clearSelection();
    });
  }

  function openModal(onDone){
    function onTypeChange(){
      if (blkType.value === 'study'){
        assignWrap.classList.remove('hidden');
      }else{
        assignWrap.classList.add('hidden');
      }
    }
    blkType.removeEventListener('change', onTypeChange);
    blkType.addEventListener('change', onTypeChange);

    modal.classList.remove('hidden');
    const cancel = () => { modal.classList.add('hidden'); onDone(false); };
    const save   = () => { modal.classList.add('hidden'); onDone(true); };

    const onCancel = () => { blkCancel.removeEventListener('click', onCancel); blkSave.removeEventListener('click', onSave); cancel(); };
    const onSave   = () => { blkCancel.removeEventListener('click', onCancel); blkSave.removeEventListener('click', onSave); save(); };

    blkCancel.addEventListener('click', onCancel, { once: true });
    blkSave.addEventListener('click', onSave, { once: true });
  }

  async function loadSettings(){
    try{
      const res = await fetch('/api/settings/');
      settings = await res.json();
    }catch{
      settings = { work_interval: 25, short_break: 5, long_break: 15 };
    }
  }

  async function loadAssignments(){
    try{
      const res = await fetch('/api/assignments');
      const data = await res.json();
      assignments = data.filter(a => !a.completed);
      blkAssignment.innerHTML = '<option value="">Select assignment...</option>' +
        assignments.map(a=>`<option value="${a.id}">${a.name} (${a.estimated_time}min)</option>`).join('');
    }catch{
      assignments = [];
      blkAssignment.innerHTML = '<option value="">No assignments</option>';
    }
  }

  function getWeekRange(){
    const start = new Date(weekStart);
    start.setHours(0,0,0,0);
    const end = addDays(weekStart, 7);
    end.setHours(0,0,0,0);
    return { start: localDateTimeStr(start), end: localDateTimeStr(end) };
  }

  async function loadBlocks(){
    const {start,end} = getWeekRange();
    const url = `/api/calendar/blocks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const res = await fetch(url);
    blocks = await res.json();
  }

  function clearScheduled(){
    grid.querySelectorAll('.slot.scheduled-busy, .slot.scheduled-study, .slot.scheduled-break').forEach(el=>{
      el.classList.remove('scheduled-busy','scheduled-study','scheduled-break');
      el.innerHTML = '';
    });
  }

  function renderBlocks(){
    clearScheduled();
    const totalRows = rowsPerDay();

    // Group blocks by assignment
    const assignmentBlocks = {};
    for (const b of blocks){
      if(b.assignment_id){
        if(!assignmentBlocks[b.assignment_id]) assignmentBlocks[b.assignment_id] = [];
        assignmentBlocks[b.assignment_id].push(b);
      }
    }

    for (const b of blocks){
      const s = new Date(b.start);
      const e = new Date(b.end);
      const dayIndex = Math.floor((s - weekStart) / (24*3600*1000));
      if (dayIndex < 0 || dayIndex >= DAYS) continue;

      const startMins = s.getHours()*60 + s.getMinutes();
      const endMins = e.getHours()*60 + e.getMinutes();
      const startRow = Math.max(0, minutesToRow(startMins));
      const endRow = Math.min(totalRows, minutesToRow(endMins));

      // Determine if this is a break block (check title)
      const isBreak = b.title && (b.title.toLowerCase().includes('break') || b.title.toLowerCase().includes('rest'));
      const cssClass = isBreak ? 'scheduled-break' : (b.block_type === 'busy' ? 'scheduled-busy' : 'scheduled-study');

      for (let r=startRow; r<endRow; r++){
        const cell = slots[dayIndex][r];
        cell.classList.add(cssClass);
        if (r === startRow){
          const pill = document.createElement('span');
          pill.className = 'block-pill ' + (b.block_type === 'busy' ? 'busy' : isBreak ? 'break' : 'study');
          const t1 = minutesToHM(startMins);
          const t2 = minutesToHM(endMins);
          pill.textContent = `${b.title} (${t1}–${t2})`;
          const del = document.createElement('button');
          del.className = 'ml-2 text-xs hover:text-red-600';
          del.textContent = '✕';
          del.title = 'Delete';
          del.addEventListener('click', async (ev)=>{
            ev.stopPropagation();
            if (!confirm('Delete this block?')) return;
            const resp = await fetch(`/api/calendar/blocks/${b.id}`, { method: 'DELETE' });
            if (resp.ok){
              await loadBlocks();
              renderBlocks();
            }else{
              const ejson = await resp.json().catch(()=>({}));
              alert(ejson.detail || 'Failed to delete block');
            }
          });
          pill.appendChild(del);
          cell.appendChild(pill);
        }
      }
    }
  }

  // Auto-schedule assignments
  async function autoScheduleAssignments(){
    if(!settings) await loadSettings();
    if(!assignments.length) await loadAssignments();

    const unscheduledAssignments = assignments.filter(a => {
      // Check if assignment already has calendar blocks
      return !blocks.some(b => b.assignment_id === a.id);
    });

    if(unscheduledAssignments.length === 0){
      alert('All assignments are already scheduled!');
      return;
    }

    // Schedule each assignment
    for(const assignment of unscheduledAssignments){
      await scheduleAssignment(assignment);
    }

    await loadBlocks();
    renderBlocks();
    alert('Assignments auto-scheduled successfully!');
  }

  async function scheduleAssignment(assignment){
    const workInterval = settings.work_interval || 25;
    const shortBreak = settings.short_break || 5;
    const totalMinutes = assignment.estimated_time;

    // Find next available slot starting from now
    const now = new Date();
    let currentTime = new Date(Math.max(now, weekStart));
    currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30); // Round to next 30min

    let remainingMinutes = totalMinutes;
    let sessionCount = 0;

    while(remainingMinutes > 0){
      // Skip if outside working hours
      if(currentTime.getHours() < START_HOUR){
        currentTime.setHours(START_HOUR, 0, 0, 0);
      }
      if(currentTime.getHours() >= END_HOUR){
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(START_HOUR, 0, 0, 0);
        continue;
      }

      // Check if slot is available
      if(await isSlotAvailable(currentTime, workInterval)){
        // Create work block
        const endTime = new Date(currentTime);
        endTime.setMinutes(endTime.getMinutes() + Math.min(workInterval, remainingMinutes));

        await createBlock({
          title: assignment.name,
          start: localDateTimeStr(currentTime),
          end: localDateTimeStr(endTime),
          block_type: 'study',
          assignment_id: assignment.id
        });

        remainingMinutes -= workInterval;
        sessionCount++;
        currentTime = endTime;

        // Add break if more work remaining
        if(remainingMinutes > 0){
          const breakTime = new Date(currentTime);
          const breakEnd = new Date(breakTime);
          breakEnd.setMinutes(breakEnd.getMinutes() + shortBreak);

          await createBlock({
            title: `Break (${assignment.name})`,
            start: localDateTimeStr(breakTime),
            end: localDateTimeStr(breakEnd),
            block_type: 'busy'
          });

          currentTime = breakEnd;
        }
      }else{
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }
  }

  async function isSlotAvailable(startTime, durationMinutes){
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    for(const block of blocks){
      const blockStart = new Date(block.start);
      const blockEnd = new Date(block.end);

      if(startTime < blockEnd && endTime > blockStart){
        return false; // Overlaps
      }
    }
    return true;
  }

  async function createBlock(payload){
    try{
      const res = await fetch('/api/calendar/blocks', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if(res.ok){
        const newBlock = await res.json();
        blocks.push({...payload, id: newBlock.id});
      }
    }catch(e){
      console.error('Error creating block:', e);
    }
  }

  // --- Week nav ---
  prevWeekBtn.addEventListener('click', async ()=>{
    weekStart = addDays(weekStart, -7);
    updateWeekLabel();
    buildGrid();
    await loadBlocks();
    renderBlocks();
  });
  nextWeekBtn.addEventListener('click', async ()=>{
    weekStart = addDays(weekStart, 7);
    updateWeekLabel();
    buildGrid();
    await loadBlocks();
    renderBlocks();
  });
  todayBtn.addEventListener('click', async ()=>{
    weekStart = mondayOf(new Date());
    updateWeekLabel();
    buildGrid();
    await loadBlocks();
    renderBlocks();
  });

  if(autoScheduleBtn){
    autoScheduleBtn.addEventListener('click', autoScheduleAssignments);
  }

  // --- Init ---
  (async function init(){
    await loadSettings();
    updateWeekLabel();
    buildGrid();
    await loadBlocks();
    await loadAssignments();
    renderBlocks();
  })();
})();

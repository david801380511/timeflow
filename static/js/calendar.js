(function () {
  // --- Config ---
  const START_HOUR = 6;
  const END_HOUR = 22;
  const SLOT_MIN = 30; // minutes

  // --- State ---
  let currentView = 'month'; // 'month' or 'day'
  let currentMonth = new Date();
  let currentDay = new Date();
  let blocks = [];
  let assignments = [];
  let settings = null;

  // Day view state
  let slots = [];
  let isSelecting = false;
  let selStart = null;
  let selEnd = null;

  // --- Elements ---
  // Month view
  const monthView = document.getElementById('monthView');
  const dayView = document.getElementById('dayView');
  const monthGrid = document.getElementById('monthGrid');
  const monthLabel = document.getElementById('monthLabel');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const todayMonthBtn = document.getElementById('todayMonthBtn');
  const autoScheduleBtn = document.getElementById('autoScheduleBtn');
  const clearCalendarBtn = document.getElementById('clearCalendarBtn');

  // Day view
  const grid = document.getElementById('calendarGrid');
  const dayLabel = document.getElementById('dayLabel');
  const backToMonthBtn = document.getElementById('backToMonth');
  const prevDayBtn = document.getElementById('prevDay');
  const nextDayBtn = document.getElementById('nextDay');

  // Modal
  const modal = document.getElementById('blockModal');
  const blkTitle = document.getElementById('blkTitle');
  const blkType = document.getElementById('blkType');
  const assignWrap = document.getElementById('assignWrap');
  const blkAssignment = document.getElementById('blkAssignment');
  const blkCancel = document.getElementById('blkCancel');
  const blkSave = document.getElementById('blkSave');

  // --- Utilities ---
  function fmt2(n){ return String(n).padStart(2,'0'); }

  function localDateStr(d){
    return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
  }

  function localDateTimeStr(d){
    return `${localDateStr(d)}T${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:00`;
  }

  function minutesToHM(mins){
    const h = Math.floor(mins/60), m = mins%60;
    return `${fmt2(h)}:${fmt2(m)}`;
  }

  function rowToMinutes(row){ return START_HOUR*60 + row*SLOT_MIN; }
  function minutesToRow(mins){ return Math.round((mins - START_HOUR*60) / SLOT_MIN); }
  function rowsPerDay(){ return ((END_HOUR*60 - START_HOUR*60)/SLOT_MIN)|0; }

  function addDays(d, days){
    const x = new Date(d);
    x.setDate(x.getDate()+days);
    return x;
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function getMonthStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function getMonthEnd(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function getCalendarStart(monthStart) {
    // Go back to Sunday
    const day = monthStart.getDay();
    return addDays(monthStart, -day);
  }

  // --- Month View Functions ---
  function renderMonthView() {
    const monthStart = getMonthStart(currentMonth);
    const monthEnd = getMonthEnd(currentMonth);
    const calendarStart = getCalendarStart(monthStart);

    // Update label
    monthLabel.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Clear existing days (keep headers)
    while (monthGrid.children.length > 7) {
      monthGrid.removeChild(monthGrid.lastChild);
    }

    // Render 6 weeks (42 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = addDays(calendarStart, i);
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isToday = isSameDay(date, today);

      const dayCell = document.createElement('div');
      dayCell.className = `month-day p-2 border border-gray-200 dark:border-gray-700 ${
        !isCurrentMonth ? 'other-month' : ''
      } ${isToday ? 'today' : ''} dark:text-white`;

      // Day number
      const dayNum = document.createElement('div');
      dayNum.className = 'font-semibold mb-1';
      dayNum.textContent = date.getDate();
      dayCell.appendChild(dayNum);

      // Event dots
      const dayBlocks = getBlocksForDay(date);
      if (dayBlocks.length > 0) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'flex flex-wrap gap-1';

        const maxDots = 5;
        for (let j = 0; j < Math.min(dayBlocks.length, maxDots); j++) {
          const block = dayBlocks[j];
          const isBreak = block.title && (block.title.toLowerCase().includes('break') || block.title.toLowerCase().includes('rest'));
          const dotClass = isBreak ? 'break' : (block.block_type === 'busy' ? 'busy' : 'study');
          const dot = document.createElement('span');
          dot.className = `event-dot ${dotClass}`;
          dot.title = block.title;
          dotsContainer.appendChild(dot);
        }

        if (dayBlocks.length > maxDots) {
          const more = document.createElement('span');
          more.className = 'text-xs text-gray-500 dark:text-gray-400';
          more.textContent = `+${dayBlocks.length - maxDots}`;
          dotsContainer.appendChild(more);
        }

        dayCell.appendChild(dotsContainer);
      }

      // Click handler
      dayCell.addEventListener('click', () => {
        currentDay = new Date(date);
        switchToDayView();
      });

      monthGrid.appendChild(dayCell);
    }
  }

  function getBlocksForDay(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return blocks.filter(b => {
      const blockStart = new Date(b.start);
      const blockEnd = new Date(b.end);
      return (blockStart >= startOfDay && blockStart <= endOfDay) ||
             (blockEnd >= startOfDay && blockEnd <= endOfDay) ||
             (blockStart <= startOfDay && blockEnd >= endOfDay);
    });
  }

  // --- Day View Functions ---
  function buildDayGrid() {
    const totalRows = rowsPerDay();
    while (grid.children.length > 2) grid.removeChild(grid.lastChild);
    slots = Array(totalRows).fill(null);

    for (let r = 0; r < totalRows; r++) {
      const mins = rowToMinutes(r);
      const timeCell = document.createElement('div');
      timeCell.className = "p-2 border-b border-r border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400";
      timeCell.textContent = minutesToHM(mins);
      grid.appendChild(timeCell);

      const cell = document.createElement('div');
      cell.className = "slot border-b border-r border-gray-200 dark:border-gray-700";
      cell.dataset.row = String(r);
      cell.addEventListener('mousedown', startSelect);
      cell.addEventListener('mouseenter', growSelect);
      cell.addEventListener('mouseup', endSelect);
      slots[r] = cell;
      grid.appendChild(cell);
    }

    document.addEventListener('mouseup', () => {
      if (isSelecting) {
        isSelecting = false;
        finishSelection();
      }
    }, { capture: true });
  }

  function renderDayView() {
    // Update label
    dayLabel.textContent = currentDay.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Update header
    const dayHead = document.getElementById('dayHead0');
    if (dayHead) {
      dayHead.textContent = currentDay.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }

    // Clear and render blocks
    clearScheduled();
    renderBlocksForDay();
  }

  function clearScheduled(){
    if (!slots) return;
    grid.querySelectorAll('.slot.scheduled-busy, .slot.scheduled-study, .slot.scheduled-break').forEach(el=>{
      el.classList.remove('scheduled-busy','scheduled-study','scheduled-break');
      el.innerHTML = '';
    });
  }

  function renderBlocksForDay() {
    const dayBlocks = getBlocksForDay(currentDay);
    const totalRows = rowsPerDay();

    for (const b of dayBlocks) {
      const s = new Date(b.start);
      const e = new Date(b.end);

      const startMins = s.getHours()*60 + s.getMinutes();
      const endMins = e.getHours()*60 + e.getMinutes();
      const startRow = Math.max(0, minutesToRow(startMins));
      const endRow = Math.min(totalRows, minutesToRow(endMins));

      const isBreak = b.title && (b.title.toLowerCase().includes('break') || b.title.toLowerCase().includes('rest'));
      const cssClass = isBreak ? 'scheduled-break' : (b.block_type === 'busy' ? 'scheduled-busy' : 'scheduled-study');

      for (let r=startRow; r<endRow; r++){
        const cell = slots[r];
        if (!cell) continue;
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
            ev.preventDefault();
            if (!confirm('Delete this block?')) return;
            const resp = await fetch(`/api/calendar/blocks/${b.id}`, { method: 'DELETE' });
            if (resp.ok){
              await loadBlocks();
              if (currentView === 'day') {
                renderDayView();
              } else {
                renderMonthView();
              }
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

  // --- Selection Functions (Day View) ---
  function startSelect(e){
    isSelecting = true;
    const row = parseInt(e.currentTarget.dataset.row,10);
    selStart = {row};
    selEnd = {row};
    e.currentTarget.classList.add('selected');
  }

  function growSelect(e){
    if (!isSelecting) return;
    const row = parseInt(e.currentTarget.dataset.row,10);
    selEnd = {row};
    const [a,b] = normRange(selStart, selEnd);
    Array.from(grid.querySelectorAll('.slot.selected')).forEach(el=>el.classList.remove('selected'));
    for (let r=a.row; r<=b.row; r++){
      if (slots[r]) slots[r].classList.add('selected');
    }
  }

  function endSelect(e){
    if (!isSelecting) return;
    isSelecting = false;
    const row = parseInt(e.currentTarget.dataset.row,10);
    selEnd = {row};
    finishSelection();
  }

  function normRange(s,e){
    const cmp = s.row - e.row;
    return (cmp<=0) ? [s,e] : [e,s];
  }

  function clearSelection(){
    if (!selStart || !selEnd) return;
    const [a,b] = normRange(selStart, selEnd);
    for (let r=a.row; r<=b.row; r++){
      if (slots[r]) slots[r].classList.remove('selected');
    }
    selStart = selEnd = null;
  }

  async function finishSelection(){
    if (!selStart || !selEnd) return;
    const [a,b] = normRange(selStart, selEnd);

    const startMins = rowToMinutes(a.row);
    const endMins = rowToMinutes(b.row + 1);

    const start = new Date(currentDay);
    start.setHours(Math.floor(startMins/60), startMins%60, 0, 0);
    const end = new Date(currentDay);
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
          renderDayView();
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

  // --- View Switching ---
  function switchToMonthView() {
    currentView = 'month';
    monthView.classList.remove('hidden');
    dayView.classList.add('hidden');
    renderMonthView();
  }

  function switchToDayView() {
    currentView = 'day';
    monthView.classList.add('hidden');
    dayView.classList.remove('hidden');
    buildDayGrid();
    renderDayView();
  }

  // --- Data Loading ---
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

  async function loadBlocks(){
    try {
      // Load blocks for entire month
      const monthStart = getMonthStart(currentMonth);
      const calendarStart = getCalendarStart(monthStart);
      const calendarEnd = addDays(calendarStart, 42);

      const start = localDateTimeStr(calendarStart);
      const end = localDateTimeStr(calendarEnd);
      const url = `/api/calendar/blocks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
      const res = await fetch(url);
      blocks = await res.json();
    } catch (e) {
      console.error('Error loading blocks:', e);
      blocks = [];
    }
  }

  // --- Auto-schedule ---
  async function autoScheduleAssignments(){
    if(!settings) await loadSettings();
    if(!assignments.length) await loadAssignments();

    const unscheduledAssignments = assignments.filter(a => {
      return !blocks.some(b => b.assignment_id === a.id);
    });

    if(unscheduledAssignments.length === 0){
      alert('All assignments are already scheduled!');
      return;
    }

    for(const assignment of unscheduledAssignments){
      await scheduleAssignment(assignment);
    }

    await loadBlocks();
    if (currentView === 'month') {
      renderMonthView();
    } else {
      renderDayView();
    }
    alert('Assignments auto-scheduled successfully!');
  }

  async function scheduleAssignment(assignment){
    const workInterval = settings.work_interval || 25;
    const shortBreak = settings.short_break || 5;
    const totalMinutes = assignment.estimated_time;

    const now = new Date();
    let currentTime = new Date(Math.max(now, getMonthStart(currentMonth)));
    currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30);

    let remainingMinutes = totalMinutes;
    let sessionCount = 0;

    while(remainingMinutes > 0){
      if(currentTime.getHours() < START_HOUR){
        currentTime.setHours(START_HOUR, 0, 0, 0);
      }
      if(currentTime.getHours() >= END_HOUR){
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(START_HOUR, 0, 0, 0);
        continue;
      }

      if(await isSlotAvailable(currentTime, workInterval)){
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
        return false;
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

  // --- Clear Calendar ---
  async function clearCalendar() {
    if (!confirm('Are you sure you want to clear ALL calendar blocks? This cannot be undone.')) {
      return;
    }

    try {
      const deletePromises = blocks.map(block =>
        fetch(`/api/calendar/blocks/${block.id}`, { method: 'DELETE' })
      );
      await Promise.all(deletePromises);
      await loadBlocks();
      if (currentView === 'month') {
        renderMonthView();
      } else {
        renderDayView();
      }
      alert('Calendar cleared successfully!');
    } catch (e) {
      console.error('Error clearing calendar:', e);
      alert('Failed to clear calendar');
    }
  }

  // --- Event Listeners ---
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', async () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      await loadBlocks();
      renderMonthView();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', async () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      await loadBlocks();
      renderMonthView();
    });
  }

  if (todayMonthBtn) {
    todayMonthBtn.addEventListener('click', async () => {
      currentMonth = new Date();
      await loadBlocks();
      renderMonthView();
    });
  }

  if (backToMonthBtn) {
    backToMonthBtn.addEventListener('click', () => {
      switchToMonthView();
    });
  }

  if (prevDayBtn) {
    prevDayBtn.addEventListener('click', async () => {
      currentDay = addDays(currentDay, -1);
      await loadBlocks();
      renderDayView();
    });
  }

  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', async () => {
      currentDay = addDays(currentDay, 1);
      await loadBlocks();
      renderDayView();
    });
  }

  if (autoScheduleBtn) {
    autoScheduleBtn.addEventListener('click', autoScheduleAssignments);
  }

  if (clearCalendarBtn) {
    clearCalendarBtn.addEventListener('click', clearCalendar);
  }

  // --- Init ---
  (async function init(){
    await loadSettings();
    await loadBlocks();
    await loadAssignments();
    renderMonthView();
  })();
})();

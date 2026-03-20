let divisionsArray = [];
let subjectsArray = [];
let masterData = null;
let editingDivIndex = -1;
let editingSubIndex = -1;
let customTimings = [];
let customSlotNames = [];
const defaultTimings = ['07:30-08:25', '08:25-09:20', '09:20-09:50', '09:50-10:45', '10:45-11:40', '11:40-12:10', '12:10-01:05', '01:05-02:00'];

document.addEventListener('DOMContentLoaded', () => { renderSlotSettings(); updateTargetDivsUI(); });

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let icon = type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500"></i>' : '<i class="fas fa-check-circle text-emerald-500"></i>';
    let borderColor = type === 'error' ? 'border-red-200 dark:border-red-800' : 'border-emerald-200 dark:border-emerald-800';
    let bgColor = 'bg-white dark:bg-slate-800';
    
    toast.className = `toast-enter ${bgColor} border ${borderColor} shadow-xl rounded-lg p-4 flex items-center space-x-3 w-80 text-sm font-bold text-slate-700 dark:text-slate-200`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- UI HELPERS ---
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
}

function switchTab(tabId) {
    ['config', 'division'].forEach(id => document.getElementById(`tab-${id}`).classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    let btnConfig = document.getElementById('tabBtn-config');
    let btnDivision = document.getElementById('tabBtn-division');

    if(tabId === 'config') {
        btnConfig.className = "px-6 py-4 text-left font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600 transition shadow-sm w-full";
        btnDivision.className = "px-6 py-4 text-left font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition border-l-4 border-transparent w-full";
    } else {
        btnDivision.className = "px-6 py-4 text-left font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600 transition shadow-sm w-full";
        btnConfig.className = "px-6 py-4 text-left font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition border-l-4 border-transparent w-full";
        
        if (!masterData || masterData.error) {
            document.getElementById('emptyState').classList.remove('hidden');
        } else {
            document.getElementById('emptyState').classList.add('hidden');
        }
    }
}

// --- TIMINGS ---
function parseTime(timeStr) {
    let [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}
function formatTime(mins) {
    let h = Math.floor(mins / 60) % 24;
    let m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function updateSuggestions(currentIndex) {
    let currentVal = document.getElementById(`timing_${currentIndex}`).value.trim();
    if(!currentVal.includes('-')) return;
    let parts = currentVal.split('-');
    let startMins = parseTime(parts[0]);
    let endMins = parseTime(parts[1]);
    let duration = endMins - startMins;
    if(duration <= 0) return;
    let num = parseInt(document.getElementById('numSlots').value);
    let nextStart = endMins;

    for(let i = currentIndex + 1; i <= num; i++) {
        let isBreak = document.getElementById(`break_cb_${i}`).checked;
        let slotDuration = isBreak ? 30 : duration; 
        let nextEnd = nextStart + slotDuration;
        let suggText = `${formatTime(nextStart)}-${formatTime(nextEnd)}`;
        let suggContainer = document.getElementById(`sugg_${i}`);
        let inputField = document.getElementById(`timing_${i}`);
        
        if (inputField.value === "") {
            suggContainer.innerHTML = `<span onclick="applySuggestion(${i}, '${suggText}')" class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm cursor-pointer hover:bg-indigo-200 transition animate-pulse">Suggest: ${suggText}</span>`;
        } else {
            suggContainer.innerHTML = "";
        }
        nextStart = nextEnd;
    }
}

function applySuggestion(index, text) {
    document.getElementById(`timing_${index}`).value = text;
    document.getElementById(`sugg_${index}`).innerHTML = "";
    updateSuggestions(index);
}

function updateSlotName(i) {
    let cb = document.getElementById(`break_cb_${i}`);
    let nameInput = document.getElementById(`name_${i}`);
    if(cb.checked) {
        nameInput.value = "Break";
        nameInput.classList.add('text-orange-600', 'dark:text-orange-400');
    } else {
        nameInput.value = `Period`; 
        nameInput.classList.remove('text-orange-600', 'dark:text-orange-400');
    }
    for(let j=1; j<=parseInt(document.getElementById('numSlots').value); j++){
        if(document.getElementById(`timing_${j}`).value !== "") { updateSuggestions(j); break; }
    }
}

function autoFillTimings() {
    let slot1 = document.getElementById('timing_1').value.trim();
    if (!slot1.includes('-')) return showToast("Enter a valid time in Period 1 first (e.g., 07:30-08:25)", "error");
    let parts = slot1.split('-');
    let startMins = parseTime(parts[0]);
    let endMins = parseTime(parts[1]);
    let duration = endMins - startMins;
    if (duration <= 0) return;
    const num = parseInt(document.getElementById('numSlots').value);
    let currentStart = startMins;
    for(let i=1; i<=num; i++) {
        let isBreak = document.getElementById(`break_cb_${i}`).checked;
        let slotDuration = isBreak ? 30 : duration; 
        let currentEnd = currentStart + slotDuration;
        document.getElementById(`timing_${i}`).value = `${formatTime(currentStart)}-${formatTime(currentEnd)}`;
        currentStart = currentEnd; 
    }
    showToast("Smart Timings Auto-filled!");
}

function renderSlotSettings() {
    const num = parseInt(document.getElementById('numSlots').value);
    let html = `<div class="flex justify-between items-center mb-2"><label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Periods & Timings</label> <button onclick="autoFillTimings()" class="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[9px] font-bold hover:bg-indigo-200 shadow-sm transition"><i class="fas fa-magic mr-1"></i>Auto-Fill</button></div>`;
    
    let periodCounter = 1;
    for(let i=1; i<=num; i++) {
        let isBreak = (num === 8 && (i === 3 || i === 6)); 
        let defaultName = isBreak ? "Break" : `Period ${periodCounter}`;
        if (!isBreak) periodCounter++;
        
        html += `
        <div class="mb-2">
            <div class="flex space-x-2 items-center bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm relative transition-all hover:border-indigo-300">
                <label class="flex items-center cursor-pointer pl-1" title="Mark as Break">
                    <input type="checkbox" id="break_cb_${i}" class="break-cb form-checkbox text-orange-500 w-4 h-4" value="${i}" ${isBreak ? 'checked' : ''} onchange="updateSlotName(${i})">
                </label>
                <input type="text" id="name_${i}" value="${customSlotNames[i-1] || defaultName}" class="name-input w-1/2 border-none bg-slate-50 dark:bg-slate-700 rounded px-2 py-1.5 text-xs font-bold ${isBreak ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'} outline-none focus:ring-1 focus:ring-indigo-300">
                <input type="text" id="timing_${i}" value="${customTimings[i-1] || defaultTimings[i-1] || ''}" oninput="updateSuggestions(${i})" class="timing-input w-1/2 border-none bg-slate-50 dark:bg-slate-700 rounded px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-300" placeholder="e.g. 07:30-08:25">
            </div>
            <div id="sugg_${i}" class="mt-1 flex justify-end min-h-[14px]"></div>
        </div>`;
    }
    document.getElementById('slotSettingsContainer').innerHTML = html;
}

// --- DEMOS ---
function loadDemo(type) {
    document.querySelectorAll('.day-cb').forEach(cb => cb.checked = true); 
    document.getElementById('numSlots').value = '8'; 
    customSlotNames = []; customTimings = defaultTimings;
    renderSlotSettings();
    
    divisionsArray = [
        {name: 'BX', room: '101', batches: ['BX1', 'BX2']},
        {name: 'BY', room: '102', batches: ['BY1', 'BY2']}
    ];
    subjectsArray = [];

    if (type === 'dense') {
        subjectsArray = [
            {code: 'Maths', type: 'theory', lectures: 4, duration: 1, teachers: ['Prof A1', 'Prof A2', 'Prof A3', 'Prof A4'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'Physics', type: 'theory', lectures: 4, duration: 1, teachers: ['Prof B1', 'Prof B2', 'Prof B3', 'Prof B4'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'Prog', type: 'theory', lectures: 4, duration: 1, teachers: ['Prof C1', 'Prof C2', 'Prof C3', 'Prof C4'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'English', type: 'theory', lectures: 2, duration: 1, teachers: ['Prof D1', 'Prof D2', 'Prof D3', 'Prof D4'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'Chem', type: 'theory', lectures: 2, duration: 1, teachers: ['Prof E1', 'Prof E2', 'Prof E3', 'Prof E4'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'Biology', type: 'theory', lectures: 2, duration: 1, teachers: ['Prof F1', 'Prof F2', 'Prof F3', 'Prof F4'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'Phy_Lab', type: 'lab', lectures: 2, duration: 2, teachers: ['Prof G1', 'Prof G2', 'Prof G3', 'Prof G4'], rooms: ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4'], target_divs: ['BX', 'BY']},
            {code: 'Prog_Lab', type: 'lab', lectures: 2, duration: 2, teachers: ['Prof H1', 'Prof H2', 'Prof H3', 'Prof H4'], rooms: ['Comp A', 'Comp B', 'Comp C', 'Comp D'], target_divs: ['BX', 'BY']},
            {code: 'Chem_Lab', type: 'lab', lectures: 2, duration: 2, teachers: ['Prof I1', 'Prof I2', 'Prof I3', 'Prof I4'], rooms: ['Chem 1', 'Chem 2', 'Chem 3', 'Chem 4'], target_divs: ['BX', 'BY']},
            {code: 'Workshop', type: 'lab', lectures: 2, duration: 2, teachers: ['Prof J1', 'Prof J2', 'Prof J3', 'Prof J4'], rooms: ['Shop 1', 'Shop 2', 'Shop 3', 'Shop 4'], target_divs: ['BX', 'BY']},
            {code: 'Sports', type: 'lab', lectures: 1, duration: 2, teachers: ['Coach 1', 'Coach 2', 'Coach 3', 'Coach 4'], rooms: ['Ground A', 'Ground B', 'Ground C', 'Ground D'], target_divs: ['BX', 'BY']}
        ];
    } 
    else if (type === 'error') {
        loadDemo('dense'); 
        subjectsArray.push({code: 'IMPOSSIBLE', type: 'lab', lectures: 1, duration: 4, teachers: ['Prof X'], rooms: ['Room X'], target_divs: ['BX']});
    } 
    else if (type === 'sparse') {
        subjectsArray = [
            {code: 'FOME', type: 'theory', lectures: 4, duration: 1, teachers: ['Pratik Kikani', 'Kajal K'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'CHDE', type: 'theory', lectures: 4, duration: 1, teachers: ['Kajal Khetani', 'Pratik K'], rooms: [], target_divs: ['BX', 'BY']},
            {code: 'ICT_LAB', type: 'lab', lectures: 1, duration: 2, teachers: ['Himanshu Joshi', 'Ankit Lehru'], rooms: ['Comp 1', 'Comp 2'], target_divs: ['BX', 'BY']}
        ];
    }
    
    updateDivisionsUI(); updateTargetDivsUI(); updateSubjectTable();
    switchTab('config'); 
    
    setTimeout(() => {
        if(type === 'dense') showToast("Demo 1 Loaded: 2 Classes, 4 Sections. Perfect 100% Dense Matrix.");
        else if(type === 'error') showToast("Demo 2 Loaded: We added an impossible class to trigger a Bottleneck.", "error");
        else if(type === 'sparse') showToast("Demo 3 Loaded: Free lectures will cluster at the end.");
    }, 100);
}

// --- CRUD & DATABASE ---
async function saveToDatabase() {
    const days = Array.from(document.querySelectorAll('.day-cb:checked')).map(cb => cb.value);
    const breaks = Array.from(document.querySelectorAll('.break-cb:checked')).map(cb => parseInt(cb.value));
    const slots = parseInt(document.getElementById('numSlots').value);
    customTimings = []; customSlotNames = [];
    for(let i=1; i<=slots; i++) {
        customTimings.push(document.getElementById('timing_'+i).value);
        customSlotNames.push(document.getElementById('name_'+i).value);
    }
    const payload = { working_days: days, breaks: breaks, slots: slots, timings: customTimings, slot_names: customSlotNames, divisions: divisionsArray, subjects: subjectsArray };
    const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if(data.success) showToast("Database state saved successfully!");
}

async function loadFromDatabase() {
    const res = await fetch('/api/load');
    const data = await res.json();
    if(data.error) return showToast(data.error, "error");
    
    document.querySelectorAll('.day-cb').forEach(cb => { cb.checked = data.working_days ? data.working_days.includes(cb.value) : false; });
    document.getElementById('numSlots').value = data.slots || '8';
    customTimings = data.timings || []; customSlotNames = data.slot_names || [];
    renderSlotSettings();
    if(data.breaks) document.querySelectorAll('.break-cb').forEach(cb => { cb.checked = data.breaks.includes(parseInt(cb.value)); });
    
    divisionsArray = data.divisions || []; subjectsArray = data.subjects || [];
    updateDivisionsUI(); updateTargetDivsUI(); updateSubjectTable();
    switchTab('config');
    showToast("Data restored from SQLite database.");
}

function saveDivision() {
    const name = document.getElementById('divName').value.trim();
    const room = document.getElementById('divRoom').value.trim();
    const batches = document.getElementById('divBatches').value.split(',').map(b=>b.trim()).filter(b=>b);
    if(!name || !room || !batches.length) return showToast("Please fill all class fields", "error");
    
    if(editingDivIndex > -1) {
        divisionsArray[editingDivIndex] = {name, room, batches};
        editingDivIndex = -1; 
        document.getElementById('saveDivBtn').innerText = 'Add Class';
        document.getElementById('saveDivBtn').classList.replace('bg-emerald-600', 'bg-slate-800');
        showToast("Class updated!");
    } else {
        divisionsArray.push({name, room, batches});
        showToast("Class added!");
    }
    document.getElementById('divName').value = ''; document.getElementById('divRoom').value = ''; document.getElementById('divBatches').value = '';
    updateDivisionsUI(); updateTargetDivsUI();
}

function updateDivisionsUI() {
    document.getElementById('divisionList').innerHTML = divisionsArray.map((d, i) => `
        <div class="bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm flex justify-between items-center hover:border-indigo-400 transition">
            <div><span class="font-black text-indigo-900 dark:text-indigo-300 text-sm">${d.name} <span class="text-xs text-slate-500 dark:text-slate-400 ml-2 border-l border-slate-300 pl-2">Theory Rm: ${d.room}</span></span><div class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">Sections: ${d.batches.join(', ')}</div></div>
            <div class="space-x-3 text-lg"><button onclick="editDivision(${i})" class="text-blue-500 hover:text-blue-700 transition" title="Edit"><i class="fas fa-edit"></i></button><button onclick="divisionsArray.splice(${i},1); updateDivisionsUI(); updateTargetDivsUI();" class="text-red-400 hover:text-red-600 transition" title="Delete"><i class="fas fa-trash"></i></button></div>
        </div>`).join('');
}

function editDivision(index) {
    const d = divisionsArray[index];
    document.getElementById('divName').value = d.name; document.getElementById('divRoom').value = d.room; document.getElementById('divBatches').value = d.batches.join(', ');
    editingDivIndex = index; 
    const btn = document.getElementById('saveDivBtn');
    btn.innerText = 'Update Class Configuration';
    btn.classList.replace('bg-slate-800', 'bg-emerald-600');
    document.getElementById('divName').focus();
}

function updateTargetDivsUI() {
    const container = document.getElementById('targetDivContainer');
    if(divisionsArray.length === 0) { container.innerHTML = '<span class="text-xs text-slate-400 italic">Add a Class in Step 3 first</span>'; return; }
    container.innerHTML = divisionsArray.map(d => `<label class="inline-flex items-center mr-3 mt-1 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition"><input type="checkbox" class="target-div-cb form-checkbox h-4 w-4 text-indigo-600" value="${d.name}" checked><span class="ml-2 font-bold text-slate-700 dark:text-slate-200">${d.name}</span></label>`).join('');
}

function saveSubject() {
    const code = document.getElementById('subName').value.trim();
    const type = document.getElementById('subType').value;
    const lectures = parseInt(document.getElementById('subLectures').value);
    const duration = parseInt(document.getElementById('subDuration').value);
    const teachers = document.getElementById('subTeachers').value.split(',').map(t=>t.trim()).filter(t=>t);
    const rooms = document.getElementById('subRooms').value.split(',').map(r=>r.trim()).filter(r=>r);
    const target_divs = Array.from(document.querySelectorAll('.target-div-cb:checked')).map(cb => cb.value);
    
    if(!code || !lectures || !duration || !teachers.length) return showToast("Fill all required fields to add a subject.", "error");
    if(editingSubIndex > -1) {
        subjectsArray[editingSubIndex] = {code, type, lectures, duration, teachers, rooms, target_divs};
        editingSubIndex = -1; 
        document.getElementById('saveSubBtn').innerText = 'Add Subject';
        document.getElementById('saveSubBtn').classList.replace('bg-emerald-600', 'bg-indigo-900');
        showToast("Subject Updated!");
    } else {
        subjectsArray.push({code, type, lectures, duration, teachers, rooms, target_divs});
        showToast("Subject Added!");
    }
    document.getElementById('subName').value = ''; 
    updateSubjectTable();
}

function cloneSubject(index) {
    const s = subjectsArray[index];
    document.getElementById('subName').value = s.code + " (Copy)"; document.getElementById('subType').value = s.type;
    document.getElementById('subLectures').value = s.lectures; document.getElementById('subDuration').value = s.duration;
    document.getElementById('subTeachers').value = (s.teachers || []).join(', '); document.getElementById('subRooms').value = (s.rooms || []).join(', ');
    document.querySelectorAll('.target-div-cb').forEach(cb => { cb.checked = (s.target_divs || []).includes(cb.value); });
    document.getElementById('subName').focus();
    showToast("Subject Cloned. Update details and click Save.");
}

function editSubject(index) {
    const s = subjectsArray[index];
    document.getElementById('subName').value = s.code; document.getElementById('subType').value = s.type;
    document.getElementById('subLectures').value = s.lectures; document.getElementById('subDuration').value = s.duration;
    document.getElementById('subTeachers').value = (s.teachers || []).join(', '); document.getElementById('subRooms').value = (s.rooms || []).join(', ');
    document.querySelectorAll('.target-div-cb').forEach(cb => { cb.checked = (s.target_divs || []).includes(cb.value); });
    editingSubIndex = index; 
    const btn = document.getElementById('saveSubBtn');
    btn.innerText = 'Update Subject';
    btn.classList.replace('bg-indigo-900', 'bg-emerald-600');
    document.getElementById('subName').focus();
}

function updateSubjectTable() {
    const tbody = document.getElementById('subjectTableBody');
    if(!subjectsArray.length) { tbody.innerHTML = '<tr><td colspan="3" class="p-8 text-center text-slate-400 italic">No resources added yet.</td></tr>'; return; }
    tbody.innerHTML = subjectsArray.map((s, i) => `
        <tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
            <td class="p-4 font-bold text-slate-800 dark:text-slate-200">${s.code} <span class="text-[10px] text-slate-500 dark:text-slate-400 uppercase ml-1 bg-slate-200 dark:bg-slate-800 px-1 rounded">${s.type}</span><div class="text-[11px] font-semibold text-slate-400 mt-1">${s.lectures}x/wk (${s.duration}hr)</div></td>
            <td class="p-4 text-xs"><div class="font-bold text-slate-700 dark:text-slate-300">Target: ${(s.target_divs || []).join(', ')}</div><div class="text-indigo-600 dark:text-indigo-400 font-bold mt-1"><i class="fas fa-user-tie mr-1"></i>${(s.teachers || []).join(', ')}</div></td>
            <td class="p-4 text-center space-x-3 text-lg">
                <button onclick="cloneSubject(${i})" class="text-emerald-500 hover:text-emerald-700 transition" title="Clone"><i class="fas fa-copy"></i></button>
                <button onclick="editSubject(${i})" class="text-blue-500 hover:text-blue-700 transition" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="subjectsArray.splice(${i},1); updateSubjectTable()" class="text-red-400 hover:text-red-600 transition" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

// --- GENERATION & RENDERING ---
async function generateTimetable() {
    if(divisionsArray.length === 0 || subjectsArray.length === 0) return showToast("Configuration incomplete. Add classes and subjects.", "error");
    const days = Array.from(document.querySelectorAll('.day-cb:checked')).map(cb => cb.value);
    const breaks = Array.from(document.querySelectorAll('.break-cb:checked')).map(cb => parseInt(cb.value));
    const slots = parseInt(document.getElementById('numSlots').value);

    customTimings = []; customSlotNames = [];
    for(let i=1; i<=slots; i++) {
        customTimings.push(document.getElementById('timing_'+i).value);
        customSlotNames.push(document.getElementById('name_'+i).value);
    }

    const payload = { divisions: divisionsArray, subjects: subjectsArray, slots: slots, working_days: days, breaks: breaks, blocked_slots: [], slot_names: customSlotNames };
    
    // Show Full-Screen Loader
    const loaderOverlay = document.getElementById('loader-overlay');
    const loadingTip = document.getElementById('loadingTip');
    loaderOverlay.classList.remove('hidden');
    loadingTip.innerText = "Initializing quantum constraint solver...";
    setTimeout(() => { loadingTip.innerText = "Resolving faculty bottlenecks horizontally..."; }, 800);
    setTimeout(() => { loadingTip.innerText = "Optimizing batch room allocations..."; }, 1600);

    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    masterData = await response.json();

    loaderOverlay.classList.add('hidden'); // Hide loader
    switchTab('division');

    if(masterData.error) { 
        showToast("Bottleneck Detected! Check matrix.", "error");
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('divTableBody').innerHTML = `<tr><td colspan="7" class="p-16 text-center text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-inner"><i class="fas fa-exclamation-triangle text-5xl mb-4"></i><br><span class="text-lg">${masterData.error}</span></td></tr>`; 
        return; 
    }
    
    showToast("Timetable generated successfully!");
    masterData.timings = customTimings;
    updateViewDropdowns();
    renderTimetable();
}

function updateViewDropdowns() {
    const viewType = document.getElementById('viewType').value;
    const targetSelect = document.getElementById('viewTarget');
    targetSelect.innerHTML = '';
    
    if(viewType === 'batch') {
        masterData.divisions.forEach(div => { div.batches.forEach(b => { targetSelect.innerHTML += `<option value="${div.name}|${b}">${div.name} - Section ${b}</option>`; }); });
    } else if(viewType === 'class') {
        masterData.divisions.forEach(div => { targetSelect.innerHTML += `<option value="${div.name}">${div.name} (Entire Class)</option>`; });
    } else if(viewType === 'teacher') {
        let allTeachers = new Set();
        subjectsArray.forEach(sub => (sub.teachers || []).forEach(t => allTeachers.add(t)));
        allTeachers.forEach(t => { targetSelect.innerHTML += `<option value="${t}">${t}</option>`; });
    }
}

function renderTimetable() {
    if(!masterData || masterData.error) return;
    document.getElementById('emptyState').classList.add('hidden'); 
    
    const viewType = document.getElementById('viewType').value;
    const targetValue = document.getElementById('viewTarget').value;
    
    let subtitle = "";
    if(viewType === 'batch') subtitle = `Section View: ${targetValue.replace('|', ' - ')}`;
    else if(viewType === 'class') subtitle = `Class Overview: ${targetValue}`;
    else if(viewType === 'teacher') subtitle = `Faculty View: ${targetValue}`;
    document.getElementById('pdfDivSubtitle').innerText = subtitle;
    
    let headHTML = `<tr><th class="p-4 border-r border-indigo-800 dark:border-slate-900 text-center w-36 font-black uppercase tracking-wider bg-indigo-900 dark:bg-indigo-950 text-white shadow-sm">Period / Day</th>`;
    masterData.days.forEach(day => headHTML += `<th class="p-4 border-r border-indigo-800 dark:border-slate-900 text-center bg-indigo-900 dark:bg-indigo-950 text-white font-bold uppercase tracking-wider shadow-sm">${day}</th>`);
    document.getElementById('divTableHead').innerHTML = headHTML + `</tr>`;

    const tbody = document.getElementById('divTableBody');
    tbody.innerHTML = '';

    for(let s=1; s<=masterData.slots; s++) {
        let slotName = masterData.slot_names[s-1];
        if(masterData.breaks && masterData.breaks.includes(s)) {
            tbody.innerHTML += `<tr><td colspan="7" class="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-center font-black text-xs uppercase tracking-widest border-b border-amber-200 dark:border-amber-800/50 shadow-inner"><i class="fas fa-mug-hot mr-2"></i>${slotName} <span class="ml-2 font-normal text-[10px]">(${masterData.timings[s-1]||''})</span></td></tr>`;
            continue;
        }
        let row = `<tr class="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="p-2 border-r border-slate-200 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-center flex flex-col justify-center min-h-[90px] shadow-inner">${slotName}<span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-sm inline-block mx-auto">${masterData.timings[s-1]||''}</span></td>`;
        
        masterData.days.forEach(day => {
            if(viewType === 'batch') {
                const [divName, batchName] = targetValue.split('|');
                const cell = masterData.schedule[day][s][divName][batchName];
                let bg = cell.type === "Blocked" ? "bg-slate-50 dark:bg-slate-800 text-slate-300 line-through" : cell.type.includes("lab") ? "bg-purple-50 dark:bg-purple-900/20" : cell.type === "theory" ? "bg-blue-50 dark:bg-blue-900/20" : "bg-slate-50 dark:bg-slate-900/50 opacity-60";
                row += `<td class="p-2 border-r border-slate-200 dark:border-slate-700 text-center ${bg} shadow-inner hover:bg-opacity-70 transition cursor-default">
                    <div class="h-full flex flex-col items-center justify-center">
                        <span class="font-black text-[15px] text-slate-900 dark:text-slate-100">${cell.code}</span>
                        <span class="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold mt-1">${cell.teacher !== '-' ? cell.teacher : ''}</span>
                        ${cell.room !== '-' ? `<span class="text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 shadow-sm inline-block mt-1.5">${cell.room}</span>` : ''}
                    </div>
                </td>`;
            } 
            else if(viewType === 'class') {
                const divName = targetValue;
                const batches = masterData.divisions.find(d => d.name === divName).batches;
                let firstCell = masterData.schedule[day][s][divName][batches[0]];
                
                let isCommon = batches.every(b => 
                    masterData.schedule[day][s][divName][b].code === firstCell.code &&
                    masterData.schedule[day][s][divName][b].teacher === firstCell.teacher
                );
                
                if(isCommon) {
                    let bg = firstCell.type.includes("lab") ? "bg-purple-50 dark:bg-purple-900/20" : firstCell.type === "theory" ? "bg-blue-50 dark:bg-blue-900/20" : "bg-slate-50 dark:bg-slate-900/50 opacity-60";
                    row += `<td class="p-2 border-r border-slate-200 dark:border-slate-700 text-center ${bg} shadow-inner hover:bg-opacity-70 transition cursor-default">
                        <div class="h-full flex flex-col items-center justify-center">
                            <span class="font-black text-[15px] text-slate-900 dark:text-slate-100">${firstCell.code}</span>
                            <span class="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold mt-1">${firstCell.teacher !== '-' ? firstCell.teacher : ''}</span>
                            ${firstCell.room !== '-' ? `<span class="text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border shadow-sm inline-block mt-1.5">${firstCell.room}</span>` : ''}
                        </div>
                    </td>`;
                } else {
                    let splitContent = batches.map(b => {
                        let c = masterData.schedule[day][s][divName][b];
                        return `<div class="text-[10px] mb-1.5 p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 shadow-sm hover:border-indigo-400 transition"><span class="font-black text-indigo-900 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 px-1 rounded mr-1">${b}</span> ${c.code} <span class="text-slate-500 dark:text-slate-400 font-semibold ml-1">(${c.room})</span></div>`;
                    }).join('');
                    row += `<td class="p-2 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-100 dark:bg-slate-900 align-top shadow-inner">${splitContent}</td>`;
                }
            }
            else if(viewType === 'teacher') {
                let classesFound = [];
                for(let div of masterData.divisions) {
                    for(let batch of div.batches) {
                        let cell = masterData.schedule[day][s][div.name][batch];
                        if(cell && cell.teacher === targetValue && cell.code !== 'BREAK' && cell.code !== 'Free') {
                            if(!classesFound.find(c => c.code === cell.code && c.div === div.name)) {
                                classesFound.push({code: cell.code, room: cell.room, div: div.name, batch: cell.type === 'theory' ? 'ALL' : batch});
                            }
                        }
                    }
                }
                if(classesFound.length > 0) {
                    let content = classesFound.map(c => `<div class="flex flex-col items-center"><span class="font-black text-[15px] text-slate-900 dark:text-slate-100">${c.code}</span><span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mt-1">${c.div} (${c.batch})</span><span class="text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700 shadow-sm inline-block mt-1">${c.room}</span></div>`).join('<hr class="my-2.5 border-blue-300 dark:border-blue-700 w-3/4 mx-auto">');
                    row += `<td class="p-2 border-r border-slate-200 dark:border-slate-700 text-center bg-blue-50 dark:bg-blue-900/20 shadow-inner hover:bg-opacity-70 transition cursor-default">${content}</td>`;
                } else {
                    row += `<td class="p-2 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-900/50 opacity-60 shadow-inner"><span class="font-bold text-sm text-slate-400">Free</span></td>`;
                }
            }
        });
        tbody.innerHTML += row + `</tr>`;
    }
}

// --- EXPORT PDF & EXCEL ---
function downloadCSV() {
    if(!masterData || masterData.error) return showToast("Generate a timetable first!", "error");
    let csv = [];
    let rows = document.querySelectorAll("#exportTable tr");
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) {
            let text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, " | ").trim();
            row.push('"' + text + '"');
        }
        csv.push(row.join(","));
    }
    let csvFile = new Blob([csv.join("\n")], {type: "text/csv"});
    let downloadLink = document.createElement("a");
    let title = document.getElementById('pdfDivSubtitle').innerText.replace(/[^a-zA-Z0-9]/g, '_') || 'Export';
    downloadLink.download = `SmartSched_${title}.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast("Excel (CSV) file downloaded!");
}

function downloadPDF() {
    if(!masterData || masterData.error) return showToast("Generate a timetable first!", "error");
    showToast("Preparing PDF Export...");
    const element = document.getElementById('div-pdf-container');
    document.getElementById('pdfHeaderDiv').classList.remove('hidden');
    let title = document.getElementById('pdfDivSubtitle').innerText.replace(/[^a-zA-Z0-9]/g, '_');
    
    html2pdf().set({ 
        margin: 0.5, 
        filename: `SmartSched_${title}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape' } 
    }).from(element).save().then(() => {
        document.getElementById('pdfHeaderDiv').classList.add('hidden');
        showToast("PDF Export successful!");
    });
}

// --- ANALYTICS MODAL ---
function showAnalytics() {
    if(!masterData || masterData.error) return showToast("Generate a timetable first to view analytics!", "error");
    let teacherCounts = {};
    masterData.days.forEach(day => {
        for(let s=1; s<=masterData.slots; s++) {
            if(masterData.breaks && masterData.breaks.includes(s)) continue;
            let uniqueSessions = new Set();
            masterData.divisions.forEach(div => {
                div.batches.forEach(b => {
                    let cell = masterData.schedule[day][s][div.name][b];
                    if(cell && cell.teacher !== '-' && cell.code !== 'Free' && cell.code !== 'BREAK' && cell.code !== 'OFF') {
                        let sessionKey = `${day}-${s}-${cell.teacher}-${cell.code}`;
                        uniqueSessions.add(sessionKey);
                    }
                });
            });
            uniqueSessions.forEach(session => {
                let t = session.split('-')[2];
                teacherCounts[t] = (teacherCounts[t] || 0) + 1;
            });
        }
    });
    
    let html = `<ul class="divide-y divide-slate-200 dark:divide-slate-700">`;
    Object.keys(teacherCounts).sort((a,b) => teacherCounts[b] - teacherCounts[a]).forEach(t => {
        html += `<li class="py-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition px-2 rounded-lg"><span class="font-bold text-slate-700 dark:text-slate-200"><i class="fas fa-user-tie text-indigo-500 mr-3"></i>${t}</span> <span class="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-black border border-indigo-200 dark:border-indigo-700 shadow-sm">${teacherCounts[t]} Periods / Wk</span></li>`;
    });
    html += `</ul>`;
    document.getElementById('analyticsContent').innerHTML = html;
    document.getElementById('analyticsModal').classList.remove('hidden');
}

function closeAnalytics() {
    document.getElementById('analyticsModal').classList.add('hidden');
}

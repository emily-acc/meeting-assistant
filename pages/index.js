import React, { useState, useEffect } from ‘react’;
import styles from ‘../styles/Home.module.css’;

// ✅ 改進版 enhancedTextParser
const enhancedTextParser = {
extractTitle: (text) => {
const patterns = [
/(?:主[題题]|标[题題])[：:]\s*([^\n]+)/,
/^【([^\】]+)】/m,
];
for (let p of patterns) {
const m = text.match(p);
if (m) {
const title = m[1].trim();
if (title) return title;
}
}
return ‘’;
},

extractDate: (text) => {
// ✅ 支援多種日期格式
const patterns = [
/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
/(\d{4})[/-.](\d{1,2})[/-.](\d{1,2})/,
/(\d{1,2})月\s*(\d{1,2})日/,
];

```
for (let p of patterns) {
  const m = text.match(p);
  if (m) {
    if (m.length === 4) {
      return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    } else if (m.length === 3) {
      const y = new Date().getFullYear();
      return `${y}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
    }
  }
}
return '';
```

},

extractTime: (text) => {
let m = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;

```
m = text.match(/上午\s*(\d{1,2}):(\d{2})/i);
if (m) {
  let h = parseInt(m[1]);
  if (h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${m[2]}`;
}

m = text.match(/下午\s*(\d{1,2}):(\d{2})/i);
if (m) {
  let h = parseInt(m[1]);
  if (h !== 12) h += 12;
  return `${String(h).padStart(2,'0')}:${m[2]}`;
}

m = text.match(/(\d{1,2}):(\d{2})(?!:)/);
if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
return '';
```

},

extractEndTime: (text) => {
// ✅ 加入波浪號 (~) 支援
const m = text.match(/[~–-至]\s*(\d{1,2}):(\d{2})/);
if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
return ‘’;
},

extractPassword: (text) => {
const m = text.match(/(?:密[碼码]|password)[：:\s]+([A-Za-z0-9]+)/i);
return m ? m[1].trim() : ‘’;
},

extractMeetingNumber: (text) => {
let m = text.match(/(?:号[码碼]|號[碼码]|[識識]別[碼码])[：:\s]+([0-9\s]+)/i);
if (m) return m[1].replace(/\s/g,’’).trim();
m = text.match(/(\d{3}\s\d{3}\s\d{3}\s\d{3}\s\d{2})/);
if (m) return m[1].replace(/\s/g,’’);
return ‘’;
},

extractLink: (text) => {
const m = text.match(/(https?://[^\s\n]+)/);
return m ? m[0].trim() : ‘’;
},

extractLocation: (text) => {
let m = text.match(/(?:引擎|类型|類型|會議類型)[：:]\s*([^\n]+)/i);
if (m) {
const loc = m[1].trim();
if (loc.includes(‘webex’)) return ‘Webex’;
if (loc.includes(‘teams’) || loc.includes(‘microsoft’)) return ‘Microsoft Teams’;
if (loc.includes(‘zoom’)) return ‘Zoom’;
return loc;
}
if (/webex/i.test(text)) return ‘Webex’;
if (/teams|microsoft/i.test(text)) return ‘Microsoft Teams’;
if (/zoom/i.test(text)) return ‘Zoom’;
return ‘’;
},

extractAttendees: (text) => {
const m = text.match(/[參参]加[對对象][：:]\s*([^\n]+)/);
return m ? m[1].trim() : ‘’;
}
};

// ✅ 改進版 AI 識別
const identifyWithAI = async (text, apiKey) => {
try {
const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
{
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
contents: [{
parts: [{
text: `分析這段會議邀請，只回復純 JSON（不要其他文字）：
{
“會議標題”: “”,
“開始日期”: “YYYY-MM-DD”,
“開始時間”: “HH:MM”,
“結束時間”: “HH:MM”,
“會議地點”: “”,
“主持人名稱”: “”,
“會議密碼”: “”,
“會議連結”: “”,
“會議識別碼”: “”,
“參加對象”: “”
}

內容：${text}`
}]
}]
})
}
);

```
const data = await response.json();
const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

// ✅ 改進：用 Regex 精確提取 { } 之間的 JSON
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (!jsonMatch) return null;

return JSON.parse(jsonMatch[0]);
```

} catch (e) {
console.error(‘AI 識別失敗:’, e);
return null;
}
};

// ✅ 改進版補強邏輯
const enhanceIdentification = (aiResult, localResult) => {
if (!aiResult) return localResult;

const result = { …aiResult };
const needsFallback = (value) => !value || value === ‘’ || value === ‘無’ || value === ‘未提供’ || value === ‘見下方’;

if (needsFallback(result[‘會議連結’])) result[‘會議連結’] = localResult.link;
if (needsFallback(result[‘會議密碼’])) result[‘會議密碼’] = localResult.password;
if (needsFallback(result[‘會議識別碼’])) result[‘會議識別碼’] = localResult.meetingNumber;
if (needsFallback(result[‘開始日期’])) result[‘開始日期’] = localResult.startDate;
if (needsFallback(result[‘開始時間’])) result[‘開始時間’] = localResult.startTime;
if (needsFallback(result[‘結束時間’])) result[‘結束時間’] = localResult.endTime;
if (needsFallback(result[‘會議地點’])) result[‘會議地點’] = localResult.location;

return result;
};

// ✅ WorkForm（移到外面，避免重建）
const WorkForm = ({ work, onSave, onClose }) => {
const [formData, setFormData] = useState(work || {
title: ‘’, dueDate: ‘’, dueTime: ‘’,
contact: ‘’, phone: ‘’, isRecurring: false,
frequency: ‘daily’, originalText: ‘’
});

return (
<div className={styles.form}>
<h3>{work?.id ? ‘編輯工作’ : ‘新增工作’}</h3>

```
  <label>標題 *</label>
  <input type="text" value={formData.title}
    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
    className={styles.input} />

  <label>截止日期</label>
  <input type="date" value={formData.dueDate}
    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
    className={styles.input} />

  <label>截止時間</label>
  <input type="text" placeholder="HH:MM" value={formData.dueTime}
    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
    className={styles.input} />

  <label>聯絡人</label>
  <input type="text" value={formData.contact}
    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
    className={styles.input} />

  <label>聯絡電話</label>
  <input type="text" value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
    className={styles.input} />

  <label>類型</label>
  <select value={formData.isRecurring ? 'recurring' : 'single'}
    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.value === 'recurring' })}
    className={styles.input}>
    <option value="single">一次性工作</option>
    <option value="recurring">例行工作</option>
  </select>

  {formData.isRecurring && (
    <>
      <label>循環頻率</label>
      <select value={formData.frequency || 'daily'}
        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
        className={styles.input}>
        <option value="daily">每日</option>
        <option value="weekly">每週</option>
        <option value="monthly">每月</option>
        <option value="yearly">每年</option>
      </select>
    </>
  )}

  <div className={styles.formButtons}>
    <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
    <button onClick={onClose} className={styles.secondaryBtn}>取消</button>
  </div>
</div>
```

);
};

// ✅ MeetingForm（移到外面，避免重建）
const MeetingForm = ({ meeting, onSave, onClose }) => {
const [formData, setFormData] = useState(meeting || {
title: ‘’, startDate: ‘’, startTime: ‘’, endTime: ‘’,
location: ‘’, chairman: ‘’, password: ‘’, link: ‘’,
meetingNumber: ‘’, attendees: ‘’, originalText: ‘’
});

return (
<div className={styles.form}>
<h3>{meeting?.id ? ‘編輯會議’ : ‘新增會議’}</h3>

```
  <label>標題 *</label>
  <input type="text" value={formData.title}
    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
    className={styles.input} />

  <label>開始日期</label>
  <input type="date" value={formData.startDate}
    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
    className={styles.input} />

  <label>開始時間</label>
  <input type="text" placeholder="HH:MM" value={formData.startTime}
    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
    className={styles.input} />

  <label>結束時間</label>
  <input type="text" placeholder="HH:MM" value={formData.endTime}
    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
    className={styles.input} />

  <label>地點</label>
  <input type="text" value={formData.location}
    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
    className={styles.input} />

  <label>主持人</label>
  <input type="text" value={formData.chairman}
    onChange={(e) => setFormData({ ...formData, chairman: e.target.value })}
    className={styles.input} />

  <label>密碼</label>
  <input type="text" value={formData.password}
    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
    className={styles.input} />

  <label>會議連結</label>
  <input type="text" placeholder="https://..." value={formData.link}
    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
    className={styles.input} />

  <label>會議識別碼</label>
  <input type="text" value={formData.meetingNumber}
    onChange={(e) => setFormData({ ...formData, meetingNumber: e.target.value })}
    className={styles.input} />

  <label>參加對象</label>
  <textarea value={formData.attendees} rows="3"
    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
    className={styles.input} placeholder="請各單位務必指派..." />

  <div className={styles.formButtons}>
    <button onClick={() => onSave(formData)} className={styles.primaryBtn}>保存</button>
    <button onClick={onClose} className={styles.secondaryBtn}>取消</button>
  </div>
</div>
```

);
};

// ✅ 主應用
export default function Home() {
const [activeTab, setActiveTab] = useState(‘all’);
const [meetings, setMeetings] = useState([]);
const [todoWorks, setTodoWorks] = useState([]);
const [recurringWorks, setRecurringWorks] = useState([]);
const [meetingInput, setMeetingInput] = useState(’’);
const [todoInput, setTodoInput] = useState(’’);
const [recurringInput, setRecurringInput] = useState(’’);
const [pastedText, setPastedText] = useState(’’);
const [showModal, setShowModal] = useState(false);
const [modalType, setModalType] = useState(null);
const [modalData, setModalData] = useState(null);
const [selectedDate, setSelectedDate] = useState(new Date());
const [isIdentifying, setIsIdentifying] = useState(false);

const GEMINI_API_KEY = ‘AIzaSyBzgBpDj-8zY-TAzhnNjcZFarf18XoP0mw’;
const frequencyText = { daily:‘每日’, weekly:‘每週’, monthly:‘每月’, yearly:‘每年’ };

useEffect(() => {
const saved = localStorage.getItem(‘appData’);
if (saved) {
const data = JSON.parse(saved);
setMeetings(data.meetings || []);
setTodoWorks(data.todoWorks || []);
setRecurringWorks(data.recurringWorks || []);
}
}, []);

useEffect(() => {
localStorage.setItem(‘appData’, JSON.stringify({ meetings, todoWorks, recurringWorks }));
}, [meetings, todoWorks, recurringWorks]);

const closeModal = () => {
setShowModal(false);
setModalType(null);
setModalData(null);
setPastedText(’’);
};

const saveWork = (workData) => {
if (workData.id) {
if (workData.isRecurring) setRecurringWorks(recurringWorks.map(w => w.id === workData.id ? workData : w));
else setTodoWorks(todoWorks.map(w => w.id === workData.id ? workData : w));
} else {
const newWork = { …workData, id: `work-${Date.now()}`, createdAt: new Date().toISOString() };
if (workData.isRecurring) setRecurringWorks([…recurringWorks, newWork]);
else setTodoWorks([…todoWorks, newWork]);
}
closeModal();
};

const saveMeeting = (meetingData) => {
if (meetingData.id) {
setMeetings(meetings.map(m => m.id === meetingData.id ? meetingData : m));
} else {
const newMeeting = { …meetingData, id: `meeting-${Date.now()}`, createdAt: new Date().toISOString() };
setMeetings([…meetings, newMeeting]);
}
closeModal();
};

const handleQuickAddMeeting = () => {
if (!meetingInput.trim()) return;
setMeetings([…meetings, {
id: `meeting-${Date.now()}`,
title: meetingInput.trim(),
startDate: ‘’, startTime: ‘’, endTime: ‘’,
location: ‘’, chairman: ‘’, password: ‘’,
link: ‘’, meetingNumber: ‘’, attendees: ‘’,
originalText: meetingInput,
createdAt: new Date().toISOString()
}]);
setMeetingInput(’’);
};

const handleQuickAddTodo = () => {
if (!todoInput.trim()) return;
setTodoWorks([…todoWorks, {
id: `work-${Date.now()}`,
title: todoInput.trim(),
dueDate: ‘’, dueTime: ‘’, contact: ‘’, phone: ‘’,
isRecurring: false, originalText: todoInput,
createdAt: new Date().toISOString()
}]);
setTodoInput(’’);
};

const handleQuickAddRecurring = () => {
if (!recurringInput.trim()) return;
setRecurringWorks([…recurringWorks, {
id: `work-${Date.now()}`,
title: recurringInput.trim(),
dueDate: ‘’, dueTime: ‘’, contact: ‘’, phone: ‘’,
isRecurring: true, frequency: ‘daily’,
originalText: recurringInput,
createdAt: new Date().toISOString()
}]);
setRecurringInput(’’);
};

// ✅ 改進版貼郵件識別
const handlePasteMeeting = async (text) => {
if (!text.trim()) {
alert(‘請貼入會議郵件’);
return;
}

```
setIsIdentifying(true);

try {
  // Step 1: 本地快速識別
  const localResult = {
    title: enhancedTextParser.extractTitle(text),
    startDate: enhancedTextParser.extractDate(text),
    startTime: enhancedTextParser.extractTime(text),
    endTime: enhancedTextParser.extractEndTime(text),
    location: enhancedTextParser.extractLocation(text),
    password: enhancedTextParser.extractPassword(text),
    link: enhancedTextParser.extractLink(text),
    meetingNumber: enhancedTextParser.extractMeetingNumber(text),
    attendees: enhancedTextParser.extractAttendees(text),
    chairman: ''
  };

  // Step 2: 優先用 AI 識別
  let aiResult = await identifyWithAI(text, GEMINI_API_KEY);
  
  // Step 3: 用本地結果補強 AI 的漏洞
  const finalResult = aiResult 
    ? enhanceIdentification(aiResult, localResult)
    : localResult;

  // Step 4: 只有當完全識別失敗時才提醒
  if (!finalResult.title && !finalResult.link) {
    alert('無法識別，請手動填入');
    setIsIdentifying(false);
    return;
  }

  setModalData({ ...finalResult, originalText: text });
  setModalType('meeting');
  setShowModal(true);
  setPastedText('');
} catch (e) {
  console.error('識別異常:', e);
  alert('識別出錯，請手動填入');
} finally {
  setIsIdentifying(false);
}
```

};

const handlePasteTodo = (text) => {
if (!text.trim()) return;
setModalData({
title: enhancedTextParser.extractTitle(text),
dueDate: enhancedTextParser.extractDate(text),
dueTime: enhancedTextParser.extractTime(text),
contact: ‘’, phone: ‘’, isRecurring: false, originalText: text
});
setModalType(‘work’);
setShowModal(true);
setPastedText(’’);
};

const handlePasteRecurring = (text) => {
if (!text.trim()) return;
setModalData({
title: enhancedTextParser.extractTitle(text),
dueDate: enhancedTextParser.extractDate(text),
dueTime: enhancedTextParser.extractTime(text),
contact: ‘’, phone: ‘’, isRecurring: true, frequency: ‘daily’, originalText: text
});
setModalType(‘work’);
setShowModal(true);
setPastedText(’’);
};

const deleteWork = (id, isRecurring) => {
if (isRecurring) setRecurringWorks(recurringWorks.filter(w => w.id !== id));
else setTodoWorks(todoWorks.filter(w => w.id !== id));
};

const deleteMeeting = (id) => setMeetings(meetings.filter(m => m.id !== id));

const completeWork = (id, isRecurring) => {
if (isRecurring) {
setRecurringWorks(recurringWorks.map(w => w.id === id ? { …w, lastCompleted: new Date().toISOString() } : w));
} else {
setTodoWorks(todoWorks.map(w => w.id === id ? { …w, completed: true } : w));
}
};

const renderCalendar = () => {
const year = selectedDate.getFullYear();
const month = selectedDate.getMonth();
const daysInMonth = new Date(year, month + 1, 0).getDate();
const startingDay = new Date(year, month, 1).getDay();
const days = [];
for (let i = 0; i < startingDay; i++) days.push(null);
for (let i = 1; i <= daysInMonth; i++) days.push(i);

```
const hasEvent = (day) => {
  if (!day) return false;
  const d = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return meetings.some(m => m.startDate === d) ||
         todoWorks.some(w => w.dueDate === d && !w.completed) ||
         recurringWorks.some(w => w.dueDate === d);
};

return (
  <div className={styles.calendar}>
    <div className={styles.calendarHeader}>
      <button onClick={() => setSelectedDate(new Date(year, month-1, 1))}>←</button>
      <span>{year}年 {month+1}月</span>
      <button onClick={() => setSelectedDate(new Date(year, month+1, 1))}>→</button>
    </div>
    <div className={styles.calendarGrid}>
      {['日','一','二','三','四','五','六'].map(d => <div key={d} className={styles.weekday}>{d}</div>)}
      {days.map((day, idx) => (
        <div key={idx}
          className={`${styles.calendarDay} ${day ? styles.hasDay : ''} ${hasEvent(day) ? styles.hasEvent : ''}`}
          onClick={() => day && setSelectedDate(new Date(year, month, day))}>
          {day}
        </div>
      ))}
    </div>
  </div>
);
```

};

const renderAllSchedule = () => {
const all = [];
meetings.forEach(m => { if (m.startDate) all.push({ type:‘meeting’, data:m, date:m.startDate, time:m.startTime }); });
todoWorks.forEach(w => { if (w.dueDate && !w.completed) all.push({ type:‘todo’, data:w, date:w.dueDate, time:w.dueTime }); });
recurringWorks.forEach(w => { if (w.dueDate) all.push({ type:‘recurring’, data:w, date:w.dueDate, time:w.dueTime }); });
all.sort((a, b) => new Date(a.date) - new Date(b.date));

```
return (
  <div className={styles.scheduleContainer}>
    <div className={styles.calendarSection}>{renderCalendar()}</div>
    <div className={styles.listSection}>
      <h3>行程和工作</h3>
      {all.length === 0 ? <p className={styles.empty}>無行程</p> : all.map((item, idx) => (
        <div key={idx} className={styles.smallItemCard}>
          {item.time && <div className={styles.smallTime}>{item.time}</div>}
          <div className={styles.smallTitle}>
            {item.type === 'meeting' ? '📞' : item.type === 'todo' ? '📝' : '♻️'} {item.data.title}
          </div>
          <div className={styles.smallMeta}>{item.date}</div>
          {item.type === 'meeting' && item.data.link &&
            <a href={item.data.link} target="_blank" rel="noopener noreferrer" className={styles.smallLink}>🔗</a>}
        </div>
      ))}
    </div>
  </div>
);
```

};

const renderMeetings = () => {
const sorted = […meetings].sort((a, b) => {
if (!a.startDate) return 1;
if (!b.startDate) return -1;
return new Date(a.startDate) - new Date(b.startDate) || (a.startTime||’’).localeCompare(b.startTime||’’);
});

```
return (
  <div className={styles.listContainer}>
    <h2>📞 會議時程 ({sorted.length})</h2>
    <div className={styles.quickAddForm}>
      <input type="text" placeholder="快速輸入會議..." value={meetingInput}
        onChange={e => setMeetingInput(e.target.value)}
        onKeyPress={e => { if (e.key === 'Enter') handleQuickAddMeeting(); }}
        className={styles.input} />
      <button onClick={handleQuickAddMeeting} className={styles.addBtn}>➕</button>
      <button onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteModal'); }}
        className={styles.pasteBtn} disabled={isIdentifying}>
        {isIdentifying ? '...' : '📋'}
      </button>
    </div>

    {sorted.length === 0 ? <p className={styles.empty}>無會議</p> : sorted.map(m => (
      <div key={m.id} className={styles.meetingCard}>
        <div className={styles.timeBlock}>
          {m.startTime && <div className={styles.time}>{m.startTime}</div>}
          {m.startDate && <div className={styles.date}>{m.startDate}</div>}
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.title}>{m.title}</div>
          <div className={styles.infoGrid}>
            {m.location && <div className={styles.info}>📍 {m.location}</div>}
            {m.meetingNumber && <div className={styles.info}>🆔 {m.meetingNumber}</div>}
            {m.password && <div className={styles.info}>🔐 {m.password}</div>}
            {m.chairman && <div className={styles.info}>👤 {m.chairman}</div>}
            {m.endTime && <div className={styles.info}>⏱️ {m.endTime}</div>}
          </div>
          {m.link && (
            <div className={styles.linkBlock}>
              <a href={m.link} target="_blank" rel="noopener noreferrer" className={styles.meetLink}>
                🔗 {m.link.length > 60 ? m.link.substring(0, 60) + '...' : m.link}
              </a>
            </div>
          )}
          {m.attendees && <div className={styles.info}>{m.attendees}</div>}
          <div className={styles.actionButtons}>
            {m.link && <button onClick={() => window.open(m.link, '_blank')} className={styles.joinBtn}>加入</button>}
            <button onClick={() => { setModalData(m); setModalType('meeting'); setShowModal(true); }} className={styles.editBtn}>編輯</button>
            <button onClick={() => deleteMeeting(m.id)} className={styles.deleteBtn}>刪除</button>
          </div>
        </div>
      </div>
    ))}
  </div>
);
```

};

const renderTodos = () => {
const sorted = […todoWorks].filter(w => !w.completed).sort((a, b) => {
if (!a.dueDate) return 1;
if (!b.dueDate) return -1;
return new Date(a.dueDate) - new Date(b.dueDate);
});

```
return (
  <div className={styles.listContainer}>
    <h2>📝 待辦清單 ({sorted.length})</h2>
    <div className={styles.quickAddForm}>
      <input type="text" placeholder="快速輸入工作..." value={todoInput}
        onChange={e => setTodoInput(e.target.value)}
        onKeyPress={e => { if (e.key === 'Enter') handleQuickAddTodo(); }}
        className={styles.input} />
      <button onClick={handleQuickAddTodo} className={styles.addBtn}>➕</button>
      <button onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteTodoModal'); }}
        className={styles.pasteBtn}>📋</button>
    </div>
    {sorted.length === 0 ? <p className={styles.empty}>無待做工作</p> : sorted.map(w => (
      <div key={w.id} className={styles.workCard}>
        <div className={styles.workHeader}>
          <div className={styles.title}>{w.title}</div>
          <div className={styles.workActions}>
            <button onClick={() => completeWork(w.id, false)} className={styles.completeBtn}>✓</button>
            <button onClick={() => { setModalData(w); setModalType('work'); setShowModal(true); }} className={styles.editBtn}>✎</button>
            <button onClick={() => deleteWork(w.id, false)} className={styles.deleteBtn}>✕</button>
          </div>
        </div>
        {w.dueDate && <div className={styles.info}>📅 {w.dueDate} {w.dueTime}</div>}
        {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
        {w.phone && <div className={styles.info}>📞 {w.phone}</div>}
      </div>
    ))}
  </div>
);
```

};

const renderRecurring = () => {
const sorted = […recurringWorks].sort((a, b) => {
if (!a.dueDate) return 1;
if (!b.dueDate) return -1;
return new Date(a.dueDate) - new Date(b.dueDate);
});

```
return (
  <div className={styles.listContainer}>
    <h2>♻️ 例行工作 ({sorted.length})</h2>
    <div className={styles.quickAddForm}>
      <input type="text" placeholder="快速輸入例行工作..." value={recurringInput}
        onChange={e => setRecurringInput(e.target.value)}
        onKeyPress={e => { if (e.key === 'Enter') handleQuickAddRecurring(); }}
        className={styles.input} />
      <button onClick={handleQuickAddRecurring} className={styles.addBtn}>➕</button>
      <button onClick={() => { setPastedText(''); setShowModal(true); setModalType('pasteRecurringModal'); }}
        className={styles.pasteBtn}>📋</button>
    </div>
    {sorted.length === 0 ? <p className={styles.empty}>無例行工作</p> : sorted.map(w => (
      <div key={w.id} className={styles.recurringCard}>
        <div className={styles.workHeader}>
          <div className={styles.title}>{w.title}</div>
          <div className={styles.workActions}>
            <button onClick={() => completeWork(w.id, true)} className={styles.completeBtn}>✓</button>
            <button onClick={() => { setModalData(w); setModalType('work'); setShowModal(true); }} className={styles.editBtn}>✎</button>
            <button onClick={() => deleteWork(w.id, true)} className={styles.deleteBtn}>✕</button>
          </div>
        </div>
        <div className={styles.info}>♻️ {frequencyText[w.frequency] || '每日'}</div>
        {w.dueDate && <div className={styles.info}>📅 {w.dueDate}</div>}
        {w.contact && <div className={styles.info}>👤 {w.contact}</div>}
      </div>
    ))}
  </div>
);
```

};

return (
<div className={styles.container}>
<header className={styles.header}>
<h1>💼 財務工作平台</h1>
</header>
<nav className={styles.tabs}>
{[[‘all’,‘📅 全部行程’],[‘meetings’,‘📞 會議’],[‘todos’,‘📝 待辦’],[‘recurring’,‘♻️ 例行’]].map(([key, label]) => (
<button key={key} className={`${styles.tab} ${activeTab === key ? styles.active : ''}`}
onClick={() => setActiveTab(key)}>{label}</button>
))}
</nav>
<main className={styles.main}>
{activeTab === ‘all’ && renderAllSchedule()}
{activeTab === ‘meetings’ && renderMeetings()}
{activeTab === ‘todos’ && renderTodos()}
{activeTab === ‘recurring’ && renderRecurring()}
</main>

```
  {showModal && ['pasteModal','pasteTodoModal','pasteRecurringModal'].includes(modalType) && (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>📋 {modalType === 'pasteModal' ? '貼會議郵件' : modalType === 'pasteTodoModal' ? '貼工作郵件' : '貼例行工作郵件'}</h2>
        <textarea className={styles.textarea} rows="10"
          placeholder="貼入郵件內容..." value={pastedText}
          onChange={e => setPastedText(e.target.value)} />
        <div className={styles.modalButtons}>
          <button className={styles.primaryBtn} disabled={isIdentifying}
            onClick={() => {
              if (modalType === 'pasteModal') handlePasteMeeting(pastedText);
              else if (modalType === 'pasteTodoModal') handlePasteTodo(pastedText);
              else handlePasteRecurring(pastedText);
            }}>
            {isIdentifying ? '識別中...' : '✓ 識別'}
          </button>
          <button className={styles.secondaryBtn} onClick={closeModal}>✕ 取消</button>
        </div>
      </div>
    </div>
  )}

  {showModal && modalType === 'work' && (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <WorkForm work={modalData} onSave={saveWork} onClose={closeModal} />
      </div>
    </div>
  )}

  {showModal && modalType === 'meeting' && (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <MeetingForm meeting={modalData} onSave={saveMeeting} onClose={closeModal} />
      </div>
    </div>
  )}
</div>
```

);
}

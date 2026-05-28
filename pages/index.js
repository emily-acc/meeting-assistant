import React, { useState, useEffect } from ‘react’;
import styles from ‘../styles/Home.module.css’;

// 日期時間識別和驗證
class DateTimeParser {
constructor() {
this.currentYear = new Date().getFullYear();
}

isValidDate(year, month, day) {
if (month < 1 || month > 12) return false;
if (day < 1) return false;
const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
if (isLeapYear && month === 2) daysInMonth[1] = 29;
return day <= daysInMonth[month - 1];
}

parseDate(dateStr) {
if (!dateStr) return { date: null, valid: false, error: ‘日期為空’ };
let year, month, day;
const result = { valid: false, error: ‘’ };

```
let match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
if (match) {
  year = parseInt(match[1]);
  month = parseInt(match[2]);
  day = parseInt(match[3]);
} else if ((match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})(?!\d)/))) {
  month = parseInt(match[1]);
  day = parseInt(match[2]);
  year = this.currentYear;
} else {
  result.error = `無法識別日期格式: ${dateStr}`;
  return result;
}

if (!this.isValidDate(year, month, day)) {
  result.error = `無效的日期: ${year}年${month}月${day}日`;
  return result;
}

const paddedMonth = String(month).padStart(2, '0');
const paddedDay = String(day).padStart(2, '0');
result.date = `${year}-${paddedMonth}-${paddedDay}`;
result.valid = true;
return result;
```

}

parseChineseTime(timeStr) {
if (!timeStr) return { time: null, valid: false, error: ‘時間為空’ };
let hour, minute = 0;
const result = { valid: false, error: ‘’, isAmbiguous: false };

```
const match = timeStr.match(/(\d{1,2})\s*[:：]?\s*(\d{2})?/);
if (!match) {
  result.error = `無法提取時間數字: ${timeStr}`;
  return result;
}

hour = parseInt(match[1]);
minute = match[2] ? parseInt(match[2]) : 0;

if (timeStr.includes('上午')) {
  if (hour === 12) hour = 0;
} else if (timeStr.includes('下午') || timeStr.includes('午後')) {
  if (hour !== 12) hour += 12;
} else if (timeStr.includes('晚上')) {
  if (hour < 12) hour += 12;
} else if (timeStr.includes('凌晨')) {
  if (hour > 12) hour -= 12;
} else {
  result.isAmbiguous = true;
}

if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
  result.error = `轉換後的時間無效: ${hour}:${String(minute).padStart(2, '0')}`;
  return result;
}

result.time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
result.valid = true;
return result;
```

}

extractDateTimeFromText(text) {
const results = { dates: [], times: [], warnings: [] };
if (!text) return results;

```
const usedRanges = [];

// 尋找日期模式
const datePatterns = [
  /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
  /(\d{1,2})[\/\-](\d{1,2})(?!\d)/g
];

datePatterns.forEach(pattern => {
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[0];
    const parsed = this.parseDate(dateStr);
    if (parsed.valid) {
      results.dates.push({
        original: dateStr,
        parsed: parsed.date,
        context: text.substring(Math.max(0, match.index - 20), match.index + 40)
      });
      usedRanges.push({ start: match.index, end: match.index + match[0].length });
    } else {
      results.warnings.push(parsed.error);
    }
  }
});

// 尋找時間模式
const timePatterns = [
  /(上午|下午|晚上|凌晨)\s+(\d{1,2})\s*[:：]\s*(\d{2})/g,
  /(\d{1,2})\s*[:：]\s*(\d{2})(?!\d)/g
];

timePatterns.forEach(pattern => {
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const isUsed = usedRanges.some(range =>
      (match.index >= range.start && match.index < range.end) ||
      (match.index + match[0].length > range.start && match.index + match[0].length <= range.end)
    );
    if (isUsed) continue;

    const timeStr = match[0];
    const parsed = this.parseChineseTime(timeStr);
    if (parsed.valid) {
      results.times.push({
        original: timeStr,
        parsed: parsed.time,
        isAmbiguous: parsed.isAmbiguous
      });
    }
  }
});

return results;
```

}

formatDate(date) {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, ‘0’);
const day = String(date.getDate()).padStart(2, ‘0’);
return `${year}-${month}-${day}`;
}
}

// 工作項目類
class WorkItem {
constructor({
id = null,
title = ‘’,
description = ‘’,
dueDate = null,
dueTime = null,
type = ‘single’,
status = ‘pending’,
contact = null,
originalText = ‘’,
source = ‘manual’,
createdAt = new Date().toISOString(),
updatedAt = new Date().toISOString()
} = {}) {
this.id = id || `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
this.title = title;
this.description = description;
this.dueDate = dueDate;
this.dueTime = dueTime;
this.type = type;
this.status = status;
this.contact = contact;
this.originalText = originalText;
this.source = source;
this.createdAt = createdAt;
this.updatedAt = updatedAt;
}

getDisplayDueDate() {
if (!this.dueDate) return ‘無期限’;
const date = new Date(this.dueDate + ‘T00:00:00’);
return date.toLocaleDateString(‘zh-TW’, {
year: ‘numeric’,
month: ‘2-digit’,
day: ‘2-digit’
});
}

complete() {
this.status = ‘completed’;
this.updatedAt = new Date().toISOString();
}

toJSON() {
return {
id: this.id,
title: this.title,
description: this.description,
dueDate: this.dueDate,
dueTime: this.dueTime,
type: this.type,
status: this.status,
contact: this.contact,
originalText: this.originalText,
source: this.source,
createdAt: this.createdAt,
updatedAt: this.updatedAt
};
}
}

// 會議項目類
class MeetingItem {
constructor({
id = null,
title = ‘’,
startDate = null,
startTime = null,
endDate = null,
endTime = null,
location = ‘’,
chairman = ‘’,
password = ‘’,
attendees = [],
originalText = ‘’,
source = ‘manual’,
createdAt = new Date().toISOString(),
updatedAt = new Date().toISOString()
} = {}) {
this.id = id || `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
this.title = title;
this.startDate = startDate;
this.startTime = startTime;
this.endDate = endDate;
this.endTime = endTime;
this.location = location;
this.chairman = chairman;
this.password = password;
this.attendees = attendees;
this.originalText = originalText;
this.source = source;
this.createdAt = createdAt;
this.updatedAt = updatedAt;
}

getDisplayDate() {
if (!this.startDate) return ‘未設定’;
const date = new Date(this.startDate + ‘T00:00:00’);
return date.toLocaleDateString(‘zh-TW’, {
year: ‘numeric’,
month: ‘2-digit’,
day: ‘2-digit’
});
}

toJSON() {
return {
id: this.id,
title: this.title,
startDate: this.startDate,
startTime: this.startTime,
endDate: this.endDate,
endTime: this.endTime,
location: this.location,
chairman: this.chairman,
password: this.password,
attendees: this.attendees,
originalText: this.originalText,
source: this.source,
createdAt: this.createdAt,
updatedAt: this.updatedAt
};
}
}

// 主應用組件
export default function Home() {
const [activeTab, setActiveTab] = useState(‘all’); // all, meetings, works
const [meetings, setMeetings] = useState([]);
const [works, setWorks] = useState([]);
const [pastedText, setPastedText] = useState(’’);
const [showModal, setShowModal] = useState(false);
const [modalData, setModalData] = useState(null);
const [selectedDate, setSelectedDate] = useState(new Date());
const [parser] = useState(new DateTimeParser());

// 初始化：從 localStorage 加載數據
useEffect(() => {
const savedMeetings = localStorage.getItem(‘meetings’);
const savedWorks = localStorage.getItem(‘works’);
if (savedMeetings) setMeetings(JSON.parse(savedMeetings));
if (savedWorks) setWorks(JSON.parse(savedWorks));
}, []);

// 保存到 localStorage
useEffect(() => {
localStorage.setItem(‘meetings’, JSON.stringify(meetings));
}, [meetings]);

useEffect(() => {
localStorage.setItem(‘works’, JSON.stringify(works));
}, [works]);

// 識別並添加會議
const handleAddMeeting = (text) => {
const dateTime = parser.extractDateTimeFromText(text);

```
let title = text.split('\n')[0];
const titleMatch = text.match(/標題[：:]\s*([^\n]+)/);
if (titleMatch) title = titleMatch[1];

const chairmanMatch = text.match(/主席[：:]\s*([^\n]+)/);
const locationMatch = text.match(/地點[：:]\s*([^\n]+)/);
const passwordMatch = text.match(/密碼[：:]\s*([^\n]+)/);

const meeting = new MeetingItem({
  title: title.substring(0, 100),
  startDate: dateTime.dates[0]?.parsed || null,
  startTime: dateTime.times[0]?.parsed || null,
  location: locationMatch ? locationMatch[1].trim() : '',
  chairman: chairmanMatch ? chairmanMatch[1].trim() : '',
  password: passwordMatch ? passwordMatch[1].trim() : '',
  originalText: text,
  source: 'email'
});

setMeetings([...meetings, meeting]);
setPastedText('');
setShowModal(false);
```

};

// 識別並添加工作
const handleAddWork = (text) => {
const dateTime = parser.extractDateTimeFromText(text);

```
// 智能提取標題
let title = text.split('\n')[0].replace(/^.*?(：|:)/, '').trim();
if (title.length > 100) title = title.substring(0, 50) + '...';
if (title.length < 3) title = '新工作';

const work = new WorkItem({
  title: title,
  description: text.substring(0, 200),
  dueDate: dateTime.dates[0]?.parsed || null,
  dueTime: dateTime.times[0]?.parsed || null,
  originalText: text,
  source: 'email'
});

setWorks([...works, work]);
setPastedText('');
setShowModal(false);
```

};

// 快速添加工作
const handleQuickAddWork = (title) => {
if (!title.trim()) return;

```
const work = new WorkItem({
  title: title,
  originalText: title,
  source: 'manual'
});

setWorks([...works, work]);
```

};

// 完成工作
const handleCompleteWork = (id) => {
setWorks(works.map(w =>
w.id === id ? { …w, status: ‘completed’, updatedAt: new Date().toISOString() } : w
));
};

// 刪除工作
const handleDeleteWork = (id) => {
setWorks(works.filter(w => w.id !== id));
};

// 刪除會議
const handleDeleteMeeting = (id) => {
setMeetings(meetings.filter(m => m.id !== id));
};

// 獲取排序後的數據
const getSortedWorks = () => {
return works
.filter(w => w.status === ‘pending’)
.sort((a, b) => {
if (!a.dueDate) return 1;
if (!b.dueDate) return -1;
return new Date(a.dueDate) - new Date(b.dueDate);
});
};

const getSortedMeetings = () => {
return meetings.sort((a, b) => {
if (!a.startDate) return 1;
if (!b.startDate) return -1;
return new Date(a.startDate) - new Date(b.startDate);
});
};

// 生成日曆
const renderCalendar = () => {
const year = selectedDate.getFullYear();
const month = selectedDate.getMonth();
const firstDay = new Date(year, month, 1);
const lastDay = new Date(year, month + 1, 0);
const daysInMonth = lastDay.getDate();
const startingDayOfWeek = firstDay.getDay();

```
const days = [];
for (let i = 0; i < startingDayOfWeek; i++) {
  days.push(null);
}
for (let i = 1; i <= daysInMonth; i++) {
  days.push(i);
}

const hasEvent = (day) => {
  if (!day) return false;
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const hasMeeting = meetings.some(m => m.startDate === dateStr);
  const hasWork = works.some(w => w.dueDate === dateStr && w.status === 'pending');
  return hasMeeting || hasWork;
};

return (
  <div className={styles.calendar}>
    <div className={styles.calendarHeader}>
      <button onClick={() => setSelectedDate(new Date(year, month - 1, 1))}>←</button>
      <span>{year}年 {month + 1}月</span>
      <button onClick={() => setSelectedDate(new Date(year, month + 1, 1))}>→</button>
    </div>
    <div className={styles.calendarGrid}>
      {['日', '一', '二', '三', '四', '五', '六'].map(d => (
        <div key={d} className={styles.weekday}>{d}</div>
      ))}
      {days.map((day, idx) => (
        <div
          key={idx}
          className={`${styles.calendarDay} ${day ? styles.hasDay : ''} ${hasEvent(day) ? styles.hasEvent : ''}`}
          onClick={() => day && setSelectedDate(new Date(year, month, day))}
        >
          {day}
        </div>
      ))}
    </div>
  </div>
);
```

};

// 菜單 1：全部行程（月曆 + 列表）
const renderAllSchedule = () => {
const allItems = [];
meetings.forEach(m => {
if (m.startDate) {
allItems.push({ type: ‘meeting’, data: m, date: m.startDate });
}
});
works.forEach(w => {
if (w.dueDate && w.status === ‘pending’) {
allItems.push({ type: ‘work’, data: w, date: w.dueDate });
}
});
allItems.sort((a, b) => new Date(a.date) - new Date(b.date));

```
return (
  <div className={styles.scheduleContainer}>
    <div className={styles.calendarSection}>
      {renderCalendar()}
    </div>
    <div className={styles.listSection}>
      <h3>行程和工作</h3>
      {allItems.length === 0 ? (
        <p className={styles.empty}>無行程</p>
      ) : (
        allItems.map((item, idx) => (
          <div key={idx} className={styles.itemCard}>
            {item.type === 'meeting' ? (
              <>
                <div className={styles.itemTitle}>📞 {item.data.title}</div>
                <div className={styles.itemMeta}>
                  📅 {item.data.getDisplayDate()} {item.data.startTime || ''}
                </div>
                {item.data.location && <div className={styles.itemMeta}>📍 {item.data.location}</div>}
                <button className={styles.deleteBtn} onClick={() => handleDeleteMeeting(item.data.id)}>刪除</button>
              </>
            ) : (
              <>
                <div className={styles.itemTitle}>📝 {item.data.title}</div>
                <div className={styles.itemMeta}>
                  📅 {item.data.getDisplayDueDate()}
                </div>
                <div className={styles.buttonGroup}>
                  <button className={styles.completeBtn} onClick={() => handleCompleteWork(item.data.id)}>完成</button>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteWork(item.data.id)}>刪除</button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);
```

};

// 菜單 2：會議時程（純列表）
const renderMeetings = () => {
const sortedMeetings = getSortedMeetings();
return (
<div className={styles.listContainer}>
<h2>📞 會議時程</h2>
{sortedMeetings.length === 0 ? (
<p className={styles.empty}>無會議</p>
) : (
sortedMeetings.map((meeting) => (
<div key={meeting.id} className={styles.itemCard}>
<div className={styles.itemTitle}>{meeting.title}</div>
<div className={styles.itemMeta}>
📅 {meeting.getDisplayDate()} {meeting.startTime || ‘’}
</div>
{meeting.location && <div className={styles.itemMeta}>📍 {meeting.location}</div>}
{meeting.chairman && <div className={styles.itemMeta}>主持：{meeting.chairman}</div>}
{meeting.password && <div className={styles.itemMeta}>密碼：{meeting.password}</div>}
<button className={styles.viewBtn} onClick={() => setModalData(meeting)}>查看詳情</button>
<button className={styles.deleteBtn} onClick={() => handleDeleteMeeting(meeting.id)}>刪除</button>
</div>
))
)}
</div>
);
};

// 菜單 3：工作列表（純列表）
const renderWorks = () => {
const sortedWorks = getSortedWorks();
return (
<div className={styles.listContainer}>
<h2>📝 工作列表</h2>
<div className={styles.quickAddForm}>
<input
type=“text”
placeholder=“快速輸入工作…”
onKeyPress={(e) => {
if (e.key === ‘Enter’) {
handleQuickAddWork(e.target.value);
e.target.value = ‘’;
}
}}
className={styles.input}
/>
</div>

```
    {sortedWorks.length === 0 ? (
      <p className={styles.empty}>無待做工作</p>
    ) : (
      sortedWorks.map((work) => (
        <div key={work.id} className={styles.itemCard}>
          <div className={styles.itemTitle}>{work.title}</div>
          <div className={styles.itemMeta}>
            📅 {work.getDisplayDueDate()} {work.dueTime ? `🕐 ${work.dueTime}` : ''}
          </div>
          {work.contact && <div className={styles.itemMeta}>👤 {work.contact.name}</div>}
          <div className={styles.buttonGroup}>
            <button className={styles.completeBtn} onClick={() => handleCompleteWork(work.id)}>✓ 完成</button>
            <button className={styles.deleteBtn} onClick={() => handleDeleteWork(work.id)}>刪除</button>
          </div>
          {work.originalText && work.originalText.length > 50 && (
            <button className={styles.viewBtn} onClick={() => setModalData(work)}>查看原文</button>
          )}
        </div>
      ))
    )}
  </div>
);
```

};

return (
<div className={styles.container}>
<header className={styles.header}>
<h1>💼 財務工作平台</h1>
<button
className={styles.addBtn}
onClick={() => setShowModal(true)}
>
➕ 貼郵件/添加
</button>
</header>

```
  {/* 菜單標籤 */}
  <nav className={styles.tabs}>
    <button
      className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
      onClick={() => setActiveTab('all')}
    >
      📅 全部行程
    </button>
    <button
      className={`${styles.tab} ${activeTab === 'meetings' ? styles.active : ''}`}
      onClick={() => setActiveTab('meetings')}
    >
      📞 會議
    </button>
    <button
      className={`${styles.tab} ${activeTab === 'works' ? styles.active : ''}`}
      onClick={() => setActiveTab('works')}
    >
      📝 工作
    </button>
  </nav>

  {/* 內容區域 */}
  <main className={styles.main}>
    {activeTab === 'all' && renderAllSchedule()}
    {activeTab === 'meetings' && renderMeetings()}
    {activeTab === 'works' && renderWorks()}
  </main>

  {/* 模態框 - 貼郵件/添加 */}
  {showModal && (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>📋 貼郵件內容</h2>
        <textarea
          className={styles.textarea}
          placeholder="貼入郵件或會議邀請內容..."
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows="10"
        />
        <div className={styles.modalButtons}>
          <button
            className={styles.primaryBtn}
            onClick={() => {
              if (pastedText.includes('會議') || pastedText.includes('開始') || pastedText.includes('標題')) {
                handleAddMeeting(pastedText);
              } else {
                handleAddWork(pastedText);
              }
            }}
          >
            ✓ 確認
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => {
              setShowModal(false);
              setPastedText('');
            }}
          >
            ✕ 取消
          </button>
        </div>
      </div>
    </div>
  )}

  {/* 模態框 - 查看詳情 */}
  {modalData && (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>📋 詳細信息</h2>
        <div className={styles.detailText}>
          {modalData.originalText || '無內容'}
        </div>
        <button
          className={styles.primaryBtn}
          onClick={() => setModalData(null)}
        >
          ✓ 關閉
        </button>
      </div>
    </div>
  )}
</div>
```

);
}

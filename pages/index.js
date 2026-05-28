import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

// 增強的本地識別模塊
const enhancedTextParser = {
  extractTitle: (text) => {
    const patterns = [
      /[主題标题][:：]\s*([^\n]+)/,
      /^【([^\】]+)】/,
    ];
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    // 修正：先去除前後空白再切割，避免抓到空行
    return text.trim().split('\n')[0].trim();
  },

  extractDate: (text) => {
    // 修正：增加 - / . 的支援
    const patterns = [
      /(\d{4})[年\-\/.]\s*(\d{1,2})[月\-\/.]\s*(\d{1,2})[日]?/,
      /(\d{1,2})[月\-\/.]\s*(\d{1,2})[日]?(?=\s*[（\(]|[週周]|上|下|午)/,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // match[1] 若為四位數，代表抓到了年份
        if (match[1] && match[1].length === 4) {
          const year = match[1];
          const month = String(match[2]).padStart(2, '0');
          const day = String(match[3]).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } else if (match.length >= 3) {
          const year = new Date().getFullYear();
          const month = String(match[1]).padStart(2, '0');
          const day = String(match[2]).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }
    return '';
  },

  extractTime: (text) => {
    const patterns = [
      { regex: /上午\s*(\d{1,2}):(\d{2})/, isAM: true },
      { regex: /下午\s*(\d{1,2}):(\d{2})/, isAM: false },
      { regex: /(\d{1,2}):(\d{2}):(\d{2})/, isTime: true },
      { regex: /(\d{1,2}):(\d{2})(?!:)/, isTime: true },
    ];

    for (let item of patterns) {
      const match = text.match(item.regex);
      if (match) {
        if (item.isAM !== undefined) {
          let hour = parseInt(match[1]);
          if (!item.isAM && hour !== 12) hour += 12;
          if (item.isAM && hour === 12) hour = 0;
          return `${String(hour).padStart(2, '0')}:${match[2]}`;
        } else if (item.isTime) {
          return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
        }
      }
    }
    return '';
  },

  extractEndTime: (text) => {
    // 修正：加入 ~ (波浪號) 的支援
    const patterns = [
      /[–\-~至]\s*(\d{1,2}):(\d{2})/,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
      }
    }
    return '';
  },

  extractPassword: (text) => {
    const patterns = [
      /[密碼password]+[：:]\s*([A-Za-z0-9]+)/i,
      /密码\s*[:：]\s*([A-Za-z0-9]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  },

  extractMeetingNumber: (text) => {
    const patterns = [
      /[號号码][:：]\s*([0-9]+)/,
      /[識別碼meeting\s]+[id]*[：:]\s*([0-9\s]+)/i,
      /会议号\s*[:：]\s*([0-9]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\s/g, '').trim();
      }
    }
    return '';
  },

  extractLink: (text) => {
    const match = text.match(/(https:\/\/[^\s]+)/);
    return match ? match[0].trim() : '';
  },

  extractLocation: (text) => {
    const patterns = [
      /[引擎类型][:：]\s*([^\n]+)/i,
      /会议类型\s*[:：]\s*([^\n]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    if (text.match(/webex/i)) return 'Webex';
    if (text.match(/teams|microsoft/i)) return 'Microsoft Teams';
    if (text.match(/zoom/i)) return 'Zoom';
    return '';
  },

  extractAttendees: (text) => {
    const patterns = [
      /[參参]加[對对]象[:：]\s*([^\n]+)/,
      /參加者\s*[:：]\s*([^\n]+)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }
};

// Gemini AI 識別
const identifyWithAI = async (text, apiKey) => {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `請精確分析這段會議邀請或工作郵件，按照以下格式提取信息（如果沒有則為空字符串）。只回復JSON，不要其他文字。

郵件內容：
${text}`
          }]
        }],
        // 增強 Prompt，利用 system instructions 強制格式
        systemInstruction: {
          parts: [{
            text: `請輸出為純 JSON 格式：
{
  "會議標題": "",
  "開始日期": "(YYYY-MM-DD格式)",
  "開始時間": "(HH:MM格式)",
  "結束時間": "(HH:MM格式)",
  "會議地點": "",
  "主持人名稱": "",
  "會議密碼": "",
  "會議連結": "(完整URL)",
  "會議識別碼": "",
  "參加對象": ""
}`
          }]
        }
      })
    });

    const data = await response.json();
    const content = data.contents[0].parts[0].text;
    
    // 修正：使用更穩健的正則提取 JSON，避免 AI 多話
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return null;
    } catch (e) {
      console.error('JSON 解析失敗:', e);
      return null;
    }
  } catch (error) {
    console.error('AI API 呼叫失敗:', error);
    return null;
  }
};

// 主應用
export default function Home() {
  const [activeTab, setActiveTab] = useState('all');
  const [meetings, setMeetings] = useState([]);
  const [todoWorks, setTodoWorks] = useState([]);
  const [recurringWorks, setRecurringWorks] = useState([]);
  
  const [meetingInput, setMeetingInput] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [recurringInput, setRecurringInput] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isIdentifying, setIsIdentifying] = useState(false);

  // ⚠️ 強烈建議：請將此 Key 移至環境變數 (例如 NEXT_PUBLIC_GEMINI_API_KEY)
  const GEMINI_API_KEY = 'AIzaSyBzgBpDj-8zY-TAzhnNjcZFarf18XoP0mw';

  const frequencyText = {
    daily: '每日',
    weekly: '每週',
    monthly: '每月',
    yearly: '每年'
  };

  useEffect(() => {
    const saved = localStorage.getItem('appData');
    if (saved) {
      const data = JSON.parse(saved);
      setMeetings(data.meetings || []);
      setTodoWorks(data.todoWorks || []);
      setRecurringWorks(data.recurringWorks ||

'use strict';

/* ==========================================================
 * DỮ LIỆU: đọc từ data/site-data.js (window.SITE_DATA).
 * Nếu trình duyệt có bản nháp (do trang Quản trị lưu) thì dùng bản nháp.
 * ========================================================== */
const DRAFT_KEY = 'ktx-site-draft-v1';
const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function readDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

const BASE_DATA = window.SITE_DATA || { info: {}, schedule: [], workshops: [] };
let DATA = readDraft() || JSON.parse(JSON.stringify(BASE_DATA));

/* ==========================================================
 * Tiện ích
 * ========================================================== */
function parseDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(iso) {
    const d = parseDate(iso);
    if (isNaN(d)) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${WEEKDAYS[d.getDay()]}, ${dd}/${mm}/${d.getFullYear()}`;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function safeUrl(url) {
    return /^https?:\/\//i.test(url || '') ? url : '#';
}

function telHref(phone) {
    return 'tel:' + String(phone || '').replace(/[^\d+]/g, '');
}

/* ==========================================================
 * Hiển thị
 * ========================================================== */
function renderInfo() {
    const info = DATA.info || {};
    document.querySelectorAll('[data-bind]').forEach(n => { n.textContent = info[n.dataset.bind] || ''; });
    document.querySelectorAll('[data-bind-tel]').forEach(n => {
        const v = info[n.dataset.bindTel] || '';
        n.textContent = v;
        n.href = telHref(v);
    });
    document.querySelectorAll('[data-bind-mailto]').forEach(n => {
        const v = info[n.dataset.bindMailto] || '';
        n.textContent = v;
        n.href = 'mailto:' + v;
    });
    document.querySelectorAll('[data-bind-href]').forEach(n => {
        n.href = safeUrl(info[n.dataset.bindHref]);
    });
}

function renderSchedule() {
    const body = document.getElementById('scheduleBody');
    body.replaceChildren();
    const todayNum = new Date().getDay() || 7;
    [...(DATA.schedule || [])].sort((a, b) => a.day - b.day).forEach(r => {
        const tr = document.createElement('tr');
        if (Number(r.day) === todayNum) tr.className = 'today';
        const th = el('th', '', WEEKDAYS[Number(r.day) % 7]);
        th.scope = 'row';
        tr.append(th, el('td', '', r.morning), el('td', '', r.afternoon), el('td', '', r.note));
        body.append(tr);
    });
}

function renderWorkshops() {
    const upcomingBox = document.getElementById('upcomingWorkshops');
    const pastBox = document.getElementById('pastWorkshops');
    upcomingBox.replaceChildren();
    pastBox.replaceChildren();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = (DATA.workshops || []).filter(w => !isNaN(parseDate(w.date)));
    list.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const upcoming = list.filter(w => parseDate(w.date) >= today);
    const past = list.filter(w => parseDate(w.date) < today).reverse();

    upcoming.forEach(w => {
        const card = el('article', 'card');
        card.append(el('h3', '', w.title));
        card.append(el('p', '', `⏰ ${w.time}, ${formatDate(w.date)}`));
        card.append(el('p', '', `📍 ${w.place}`));
        card.append(el('p', '', w.desc));
        const btn = el('a', 'btn mt', '📝 Đăng ký ngay');
        btn.href = safeUrl(DATA.info && DATA.info.bookingUrl);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        card.append(btn);
        upcomingBox.append(card);
    });
    if (!upcoming.length) upcomingBox.append(el('p', 'empty', 'Hiện chưa có workshop mới. Vui lòng quay lại sau nhé!'));

    past.forEach(w => {
        const card = el('article', 'card');
        card.append(el('h3', '', w.title));
        card.append(el('p', '', `🗓️ Đã tổ chức: ${formatDate(w.date)}`));
        card.append(el('p', '', w.desc));
        pastBox.append(card);
    });
    if (!past.length) pastBox.append(el('p', 'empty', 'Chưa có workshop nào đã diễn ra.'));
}

function renderAll() {
    renderInfo();
    renderSchedule();
    renderWorkshops();
    document.getElementById('draftBanner').hidden = !readDraft();
    document.getElementById('year').textContent = new Date().getFullYear();
}

/* ==========================================================
 * API cho trang Quản trị (assets/js/admin.js)
 * ========================================================== */
window.KTX = {
    getData: () => JSON.parse(JSON.stringify(DATA)),
    getBase: () => JSON.parse(JSON.stringify(BASE_DATA)),
    setData(d) { DATA = d; renderAll(); },
    saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); renderAll(); },
    clearDraft() {
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
        DATA = JSON.parse(JSON.stringify(BASE_DATA));
        renderAll();
    },
    hasDraft: () => !!readDraft(),
    telHref, safeUrl, parseDate, WEEKDAYS
};

/* ==========================================================
 * Mở trang Quản trị (tải admin.js khi cần)
 * ========================================================== */
let adminLoading = null;
function openAdmin() {
    if (window.KTX.openAdmin) return window.KTX.openAdmin();
    if (!adminLoading) {
        adminLoading = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'assets/js/admin.js';
            s.onload = resolve;
            s.onerror = () => { adminLoading = null; reject(new Error('Không tải được admin.js')); };
            document.body.append(s);
        });
    }
    adminLoading.then(() => window.KTX.openAdmin()).catch(err => alert(err.message));
}

document.querySelectorAll('[data-open-admin]').forEach(b => b.addEventListener('click', openAdmin));
if (location.hash === '#admin') openAdmin();

/* ==========================================================
 * Chatbot
 * ========================================================== */
const chatBody = document.getElementById('chatBody');
const chatWindow = document.getElementById('chatWindow');
const chatToggle = document.getElementById('chatToggle');
const closeChat = document.getElementById('closeChat');

const info = () => DATA.info || {};

const TOPICS = {
    stress: {
        user: 'Tôi đang stress',
        bot: () => 'Stress là điều ai cũng gặp. Bạn hãy thử hít thở sâu: hít vào 4 giây, giữ 7 giây, thở ra 8 giây, lặp lại 3 lần nhé.\nNếu stress kéo dài, bạn nên gặp chuyên gia để được hỗ trợ tốt hơn. Chọn "Muốn đặt lịch gặp" bên dưới để được hướng dẫn.'
    },
    sleep: {
        user: 'Tôi bị mất ngủ',
        bot: () => 'Bạn có thể thử: tránh điện thoại 30 phút trước khi ngủ, giữ phòng tối và yên tĩnh, đi ngủ đúng giờ và hạn chế caffeine buổi chiều.\nNếu tình trạng kéo dài, hãy đặt lịch gặp chuyên gia để tìm hiểu nguyên nhân nhé.'
    },
    alone: {
        user: 'Tôi thấy cô đơn',
        bot: () => 'Cảm giác của bạn rất thật và rất đáng được lắng nghe. Ở KTX có nhiều hoạt động nhóm, CLB thể thao, tình nguyện… Bạn cũng có thể đặt lịch trò chuyện riêng với chuyên gia. Chúng mình luôn ở đây.'
    },
    booking: {
        user: 'Tôi muốn đặt lịch gặp chuyên gia',
        bot: () => `Bạn có thể đặt lịch qua:\n• Google Form bên dưới\n• Gọi hotline ${info().hotline} trong giờ hành chính\nXem lịch trực cụ thể ở mục "Lịch trực" nhé.`,
        link: () => ({ text: 'Mở Google Form đặt lịch', href: safeUrl(info().bookingUrl) })
    },
    emergency: {
        user: 'Tôi cần giúp đỡ khẩn cấp',
        bot: () => `Nếu bạn đang có ý định làm hại bản thân hoặc cảm thấy mất kiểm soát, xin hãy liên hệ NGAY:\n• Hotline ${info().hotline}\n• Cấp cứu 115\n• Hoặc đến thẳng ${info().room}\nHãy báo cho bạn cùng phòng hoặc người thân bên cạnh. Bạn không đơn độc.`,
        link: () => ({ text: `Gọi ${info().hotline}`, href: telHref(info().hotline) })
    }
};

function addMessage(text, sender, link) {
    const div = el('div', `bubble ${sender}`);
    div.append(document.createTextNode(text));
    if (link) {
        div.append(document.createElement('br'));
        const a = el('a', '', link.text);
        a.href = link.href;
        if (link.href.startsWith('http')) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
        div.append(a);
    }
    chatBody.append(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function sendQuick(type) {
    const topic = TOPICS[type];
    if (!topic) return;
    addMessage(topic.user, 'user');
    setTimeout(() => addMessage(topic.bot(), 'bot', topic.link ? topic.link() : null), 400);
}

function setChat(open) {
    chatWindow.hidden = !open;
    chatToggle.setAttribute('aria-expanded', String(open));
    if (open) closeChat.focus();
    else chatToggle.focus();
}

chatToggle.addEventListener('click', () => setChat(chatWindow.hidden));
closeChat.addEventListener('click', () => setChat(false));
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !chatWindow.hidden) setChat(false);
});
document.getElementById('chatFooter').addEventListener('click', e => {
    const btn = e.target.closest('[data-topic]');
    if (btn) sendQuick(btn.dataset.topic);
});

renderAll();

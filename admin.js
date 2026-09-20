'use strict';
/* Trình chỉnh sửa nội dung (Quản trị). Chỉ được tải khi bấm "Quản trị".
 * - Sửa: xem thay đổi ngay trên trang.
 * - Lưu nháp: lưu trong trình duyệt này.
 * - Đăng: ghi file data/site-data.js vào repo GitHub bằng token -> mọi người thấy.
 */
(function () {
    const K = window.KTX;
    const SESSION_KEY = 'ktx-admin-gh';
    const DATA_PATH = 'data/site-data.js';
    let work = null;
    let panel = null;

    /* ---------- helpers ---------- */
    function h(tag, attrs, ...children) {
        const n = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === 'class') n.className = v;
            else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
            else n.setAttribute(k, v);
        });
        children.flat().forEach(c => n.append(c instanceof Node ? c : document.createTextNode(c)));
        return n;
    }

    function field(label, value, onInput, opts = {}) {
        const input = opts.multiline
            ? h('textarea', { rows: '3' })
            : h('input', { type: opts.type || 'text' });
        input.value = value || '';
        if (opts.placeholder) input.placeholder = opts.placeholder;
        input.addEventListener('input', () => onInput(input.value));
        return h('label', { class: 'adm-field' }, h('span', {}, label), input);
    }

    function toFileText(data) {
        return 'window.SITE_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
    }

    function parseFileText(text) {
        const a = text.indexOf('{');
        const b = text.lastIndexOf('}');
        if (a < 0 || b < a) throw new Error('File không đúng định dạng.');
        return JSON.parse(text.slice(a, b + 1));
    }

    function validate(d) {
        const i = d.info;
        if (!i.hotline.trim()) return 'Hotline không được để trống.';
        if (!/^\S+@\S+\.\S+$/.test(i.email)) return 'Email chưa hợp lệ.';
        if (!/^https?:\/\//i.test(i.bookingUrl)) return 'Link đặt lịch phải bắt đầu bằng http:// hoặc https://';
        for (const w of d.workshops) {
            if (!w.title.trim()) return 'Có workshop chưa nhập tên.';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date) || isNaN(K.parseDate(w.date))) return `Workshop "${w.title}": ngày chưa hợp lệ.`;
        }
        return '';
    }

    function b64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function guessRepo() {
        const host = location.hostname;
        if (host.endsWith('.github.io')) {
            return { owner: host.split('.')[0], repo: location.pathname.split('/')[1] || host };
        }
        return { owner: '', repo: '' };
    }

    /* ---------- các mục ---------- */
    function infoSection() {
        const i = work.info;
        const sync = () => K.setData(work);
        return h('section', { class: 'adm-sec' },
            h('h3', {}, 'Thông tin chung'),
            field('Tên chuyên gia', i.expertName, v => { i.expertName = v; sync(); }),
            field('Địa điểm phòng tham vấn', i.room, v => { i.room = v; sync(); }),
            field('Hotline', i.hotline, v => { i.hotline = v; sync(); }),
            field('Email', i.email, v => { i.email = v; sync(); }, { type: 'email' }),
            field('Link đặt lịch (Google Form)', i.bookingUrl, v => { i.bookingUrl = v; sync(); }, { type: 'url' })
        );
    }

    function scheduleSection() {
        const box = h('div', {});
        function draw() {
            box.replaceChildren();
            work.schedule.forEach((r, idx) => {
                const sel = h('select', {});
                [1, 2, 3, 4, 5, 6, 7].forEach(n => {
                    const o = h('option', { value: String(n) }, K.WEEKDAYS[n % 7]);
                    if (Number(r.day) === n) o.selected = true;
                    sel.append(o);
                });
                sel.addEventListener('change', () => { r.day = Number(sel.value); K.setData(work); });
                box.append(h('div', { class: 'adm-row' },
                    h('label', { class: 'adm-field' }, h('span', {}, 'Ngày'), sel),
                    field('Sáng', r.morning, v => { r.morning = v; K.setData(work); }),
                    field('Chiều', r.afternoon, v => { r.afternoon = v; K.setData(work); }),
                    field('Ghi chú', r.note, v => { r.note = v; K.setData(work); }),
                    h('button', { type: 'button', class: 'adm-btn danger', onclick: () => { work.schedule.splice(idx, 1); K.setData(work); draw(); } }, 'Xóa')
                ));
            });
        }
        draw();
        return h('section', { class: 'adm-sec' },
            h('h3', {}, 'Lịch trực'),
            box,
            h('button', { type: 'button', class: 'adm-btn', onclick: () => {
                work.schedule.push({ day: 1, morning: '8:00 – 11:30', afternoon: '14:00 – 17:00', note: '' });
                K.setData(work); draw();
            } }, '+ Thêm dòng')
        );
    }

    function workshopSection() {
        const box = h('div', {});
        function draw() {
            box.replaceChildren();
            work.workshops.forEach((w, idx) => {
                box.append(h('div', { class: 'adm-card' },
                    field('Tên workshop', w.title, v => { w.title = v; K.setData(work); }),
                    h('div', { class: 'adm-row' },
                        field('Ngày', w.date, v => { w.date = v; K.setData(work); }, { type: 'date' }),
                        field('Giờ', w.time, v => { w.time = v; K.setData(work); }),
                        field('Địa điểm', w.place, v => { w.place = v; K.setData(work); })
                    ),
                    field('Mô tả', w.desc, v => { w.desc = v; K.setData(work); }, { multiline: true }),
                    h('button', { type: 'button', class: 'adm-btn danger', onclick: () => { work.workshops.splice(idx, 1); K.setData(work); draw(); } }, 'Xóa workshop')
                ));
            });
        }
        draw();
        return h('section', { class: 'adm-sec' },
            h('h3', {}, 'Workshop'),
            h('p', { class: 'adm-hint' }, 'Workshop có ngày đã qua sẽ tự nằm ở mục "đã diễn ra".'),
            box,
            h('button', { type: 'button', class: 'adm-btn', onclick: () => {
                const t = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
                work.workshops.push({ title: 'Workshop mới', date: t, time: '14:00 – 16:00', place: '', desc: '' });
                K.setData(work); draw();
            } }, '+ Thêm workshop')
        );
    }

    function saveSection() {
        const guess = guessRepo();
        let saved = {};
        try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); } catch (e) { /* ignore */ }
        const cfg = {
            owner: saved.owner || guess.owner, repo: saved.repo || guess.repo,
            branch: saved.branch || 'main', token: saved.token || ''
        };
        const status = h('p', { class: 'adm-status', role: 'status' });
        const say = (msg, ok) => { status.textContent = msg; status.className = 'adm-status ' + (ok ? 'ok' : 'err'); };

        const remember = h('input', { type: 'checkbox' });
        remember.checked = !!saved.token;

        const gh = h('div', { class: 'adm-gh' },
            h('div', { class: 'adm-row' },
                field('Tài khoản GitHub', cfg.owner, v => cfg.owner = v.trim()),
                field('Tên repository', cfg.repo, v => cfg.repo = v.trim()),
                field('Nhánh', cfg.branch, v => cfg.branch = v.trim())
            ),
            field('Token GitHub (quyền Contents: Read and write)', cfg.token, v => cfg.token = v.trim(), { type: 'password' }),
            h('label', { class: 'adm-check' }, remember, ' Nhớ token trong phiên này (xóa khi đóng tab)')
        );

        async function publish() {
            const err = validate(work);
            if (err) return say(err, false);
            if (!cfg.owner || !cfg.repo || !cfg.token) return say('Hãy nhập tài khoản, repository và token GitHub.', false);
            const api = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${DATA_PATH}`;
            const headers = {
                Authorization: `Bearer ${cfg.token}`,
                Accept: 'application/vnd.github+json'
            };
            say('Đang đăng…', true);
            try {
                let sha;
                const get = await fetch(`${api}?ref=${encodeURIComponent(cfg.branch)}`, { headers });
                if (get.ok) sha = (await get.json()).sha;
                else if (get.status !== 404) throw new Error(get.status === 401 || get.status === 403 ? 'Token không đúng hoặc không đủ quyền.' : `Lỗi GitHub (${get.status}).`);

                const put = await fetch(api, {
                    method: 'PUT',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'Cập nhật nội dung website qua trang Quản trị',
                        content: b64(toFileText(work)),
                        branch: cfg.branch,
                        ...(sha ? { sha } : {})
                    })
                });
                if (!put.ok) {
                    const j = await put.json().catch(() => ({}));
                    throw new Error(j.message || `Lỗi GitHub (${put.status}).`);
                }
                if (remember.checked) sessionStorage.setItem(SESSION_KEY, JSON.stringify(cfg));
                else sessionStorage.removeItem(SESSION_KEY);
                localStorage.removeItem('ktx-site-draft-v1');
                say('Đã đăng thành công. GitHub Pages cần khoảng 1–2 phút để cập nhật cho mọi người.', true);
            } catch (e) {
                say(e.message || 'Không kết nối được GitHub.', false);
            }
        }

        function download() {
            const err = validate(work);
            if (err) return say(err, false);
            const a = h('a', {
                href: URL.createObjectURL(new Blob([toFileText(work)], { type: 'text/javascript' })),
                download: 'site-data.js'
            });
            document.body.append(a); a.click(); a.remove();
            say('Đã tải site-data.js. Thay file này vào thư mục data/ rồi commit lên GitHub.', true);
        }

        const fileIn = h('input', { type: 'file', accept: '.js,.json', hidden: '' });
        fileIn.addEventListener('change', async () => {
            try {
                const d = parseFileText(await fileIn.files[0].text());
                if (!d.info || !Array.isArray(d.schedule) || !Array.isArray(d.workshops)) throw new Error('Thiếu dữ liệu.');
                work = d; K.setData(work); rebuild();
            } catch (e) { say('Không đọc được file: ' + e.message, false); }
        });

        return h('section', { class: 'adm-sec' },
            h('h3', {}, 'Lưu & đăng'),
            h('div', { class: 'adm-actions' },
                h('button', { type: 'button', class: 'adm-btn', onclick: () => {
                    const err = validate(work);
                    if (err) return say(err, false);
                    K.saveDraft(work); say('Đã lưu bản nháp trong trình duyệt này (chưa hiện với người khác).', true);
                } }, '💾 Lưu nháp'),
                h('button', { type: 'button', class: 'adm-btn', onclick: download }, '⬇️ Tải file'),
                h('button', { type: 'button', class: 'adm-btn', onclick: () => fileIn.click() }, '⬆️ Nhập file'),
                h('button', { type: 'button', class: 'adm-btn danger', onclick: () => {
                    if (!confirm('Bỏ mọi thay đổi và quay về bản đang đăng?')) return;
                    K.clearDraft(); work = K.getBase(); rebuild();
                } }, '↩️ Bỏ thay đổi'),
                fileIn
            ),
            h('h4', {}, 'Đăng lên GitHub để mọi người cùng thấy'),
            gh,
            h('button', { type: 'button', class: 'adm-btn primary', onclick: publish }, '🚀 Đăng lên website'),
            status
        );
    }

    /* ---------- panel ---------- */
    function rebuild() {
        const body = panel.querySelector('.adm-body');
        body.replaceChildren(infoSection(), scheduleSection(), workshopSection(), saveSection());
    }

    function close() {
        panel.hidden = true;
        document.body.classList.remove('adm-open');
    }

    function open() {
        if (!panel) {
            panel = h('aside', { class: 'adm-panel', role: 'dialog', 'aria-label': 'Trình chỉnh sửa nội dung' },
                h('div', { class: 'adm-head' },
                    h('strong', {}, '🔧 Chỉnh sửa nội dung'),
                    h('button', { type: 'button', class: 'adm-close', 'aria-label': 'Đóng', onclick: close }, '×')
                ),
                h('div', { class: 'adm-body' })
            );
            document.body.append(panel);
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
        }
        work = K.getData();
        if (!Array.isArray(work.schedule)) work.schedule = [];
        if (!Array.isArray(work.workshops)) work.workshops = [];
        rebuild();
        panel.hidden = false;
        document.body.classList.add('adm-open');
    }

    K.openAdmin = open;
})();

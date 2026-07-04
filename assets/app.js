/* =========================================================
   vitorHome — startpage pessoal, 100% local e personalizável
   - Config em localStorage  ·  mídias de fundo em IndexedDB
   ========================================================= */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = 'vitorhome:config';
const FALLBACK_GRADIENT = 'linear-gradient(135deg,#1b1030,#0a0a16 55%,#04121a)';

/* ---------- buscadores ---------- */
const ENGINES = {
	startpage:  { name: 'Startpage',   emoji: '🛡️', url: 'https://www.startpage.com/sp/search?query=' },
	google:     { name: 'Google',      emoji: '🔎', url: 'https://www.google.com/search?q='            },
	duckduckgo: { name: 'DuckDuckGo',  emoji: '🦆', url: 'https://duckduckgo.com/?q='                  },
	brave:      { name: 'Brave',       emoji: '🦁', url: 'https://search.brave.com/search?q='          },
	bing:       { name: 'Bing',        emoji: '🅱️', url: 'https://www.bing.com/search?q='               },
	youtube:    { name: 'YouTube',     emoji: '▶️', url: 'https://www.youtube.com/results?search_query=' },
	perplexity: { name: 'Perplexity',  emoji: '🧠', url: 'https://www.perplexity.ai/search?q='         },
};

const GRADIENTS = [
	'linear-gradient(135deg,#1b1030,#0a0a16 55%,#04121a)',
	'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
	'linear-gradient(135deg,#42275a,#734b6d)',
	'linear-gradient(135deg,#0b486b,#f56217)',
	'radial-gradient(120% 120% at 20% 10%,#3a1c71,#d76d77 50%,#ffaf7b)',
	'linear-gradient(135deg,#000428,#004e92)',
];

/* ---------- config padrão ---------- */
const DEFAULTS = {
	version: 1,
	greetingName: 'Vitor',
	search: {
		engine: 'startpage',
		openInNewTab: false,
		phrases: ['...', 'Olá Vitor,', 'O que deseja buscar hoje?'],
	},
	notes: [],
	appearance: {
		background: { kind: 'preset', value: 'main.jpg' },
		overlay: 0.38,
		blur: 0,
		accent: '#7c5cff',
		clock24: true,
		showSeconds: false,
	},
	apps: [
		{ name: 'Google Docs', url: 'https://docs.google.com/document/u/0/',   icon: '' },
		{ name: 'ChatGPT',     url: 'https://chat.openai.com/',                icon: '' },
		{ name: 'GitHub',      url: 'https://github.com/',                     icon: '' },
		{ name: 'Outlook',     url: 'https://outlook.office365.com/mail/',     icon: '' },
		{ name: 'Proton Mail', url: 'https://mail.proton.me/u/0/inbox',        icon: '' },
		{ name: 'Netflix',     url: 'https://www.netflix.com/browse',          icon: '' },
		{ name: 'Reddit',      url: 'https://www.reddit.com',                  icon: '' },
		{ name: 'MoeWalls',    url: 'https://moewalls.com/',                   icon: 'media/moewalls.png' },
		{ name: 'YouTube',     url: 'https://www.youtube.com',                 icon: '' },
	],
	portals: [
		{ name: 'WhatsApp', url: 'https://web.whatsapp.com',   desc: 'Mensagens', color: '#25d366' },
		{ name: 'Gmail',    url: 'https://mail.google.com',    desc: 'E-mail',    color: '#ea4335' },
		{ name: 'Drive',    url: 'https://drive.google.com',   desc: 'Arquivos',  color: '#1a73e8' },
		{ name: 'Spotify',  url: 'https://open.spotify.com',   desc: 'Música',    color: '#1db954' },
		{ name: 'Notion',   url: 'https://www.notion.so',      desc: 'Notas',     color: '#cfcfcf' },
		{ name: 'Canva',    url: 'https://www.canva.com',      desc: 'Design',    color: '#7d2ae8' },
	],
};

/* ========================================================= *
 * IndexedDB (mídias de fundo enviadas pelo usuário)
 * ========================================================= */
const IDB = {
	db: null,
	open() {
		return new Promise((res, rej) => {
			const r = indexedDB.open('vitorhome', 1);
			r.onupgradeneeded = () => r.result.createObjectStore('media');
			r.onsuccess = () => { this.db = r.result; res(r.result); };
			r.onerror = () => rej(r.error);
		});
	},
	async tx(mode) { return (this.db || await this.open()).transaction('media', mode).objectStore('media'); },
	async put(k, v) { const s = await this.tx('readwrite'); return new Promise((res, rej) => { const q = s.put(v, k); q.onsuccess = res; q.onerror = () => rej(q.error); }); },
	async get(k)    { const s = await this.tx('readonly');  return new Promise((res, rej) => { const q = s.get(k);   q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); },
	async del(k)    { const s = await this.tx('readwrite'); return new Promise((res) => { const q = s.delete(k); q.onsuccess = res; q.onerror = res; }); },
};

/* ========================================================= *
 * Estado
 * ========================================================= */
let state = {};
function deepMerge(base, over) {
	if (Array.isArray(over)) return over.slice();
	if (over && typeof over === 'object') {
		const out = { ...base };
		for (const k in over) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
		return out;
	}
	return over === undefined ? base : over;
}
const clone = (o) => (window.structuredClone ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

function load() {
	let saved = {};
	try { saved = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (_) {}
	state = deepMerge(clone(DEFAULTS), saved);
	(state.apps || []).forEach(a => a.id = a.id || uid());
	(state.portals || []).forEach(p => p.id = p.id || uid());
	if (!Array.isArray(state.notes)) state.notes = [];
	runMigrations(Object.keys(saved).length > 0);
}
const MIG = 2;
function runMigrations(hadSaved) {
	// ícones locais antigos -> automáticos (idempotente)
	const OLD_ICONS = ['media/proton.png', 'media/firefox.png'];
	[...state.apps, ...state.portals].forEach(it => { if (OLD_ICONS.includes(it.icon)) it.icon = ''; });
	// v2: aplica o novo texto base do typewriter e o wallpaper main.jpg em quem já tinha config salva
	if ((state._mig || 0) < 2 && hadSaved) {
		state.search.phrases = clone(DEFAULTS.search.phrases);
		state.appearance.background = clone(DEFAULTS.appearance.background);
	}
	if (state._mig !== MIG) { state._mig = MIG; save(); }
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

/* ========================================================= *
 * Ícones — biblioteca Simple Icons (logos vetoriais das marcas)
 * ========================================================= */
// hostname -> slug do Simple Icons (https://simpleicons.org)
const SI_MAP = {
	'docs.google.com': 'googledocs',
	'github.com': 'github',
	'mail.proton.me': 'protonmail', 'proton.me': 'protonmail',
	'netflix.com': 'netflix',
	'reddit.com': 'reddit',
	'youtube.com': 'youtube', 'youtu.be': 'youtube',
	'web.whatsapp.com': 'whatsapp', 'whatsapp.com': 'whatsapp',
	'mail.google.com': 'gmail',
	'drive.google.com': 'googledrive',
	'open.spotify.com': 'spotify', 'spotify.com': 'spotify',
	'notion.so': 'notion',
	'twitch.tv': 'twitch', 'instagram.com': 'instagram', 'x.com': 'x', 'twitter.com': 'x',
	'discord.com': 'discord', 'telegram.org': 'telegram', 'web.telegram.org': 'telegram',
	'figma.com': 'figma', 'trello.com': 'trello', 'gitlab.com': 'gitlab',
	'stackoverflow.com': 'stackoverflow', 'store.steampowered.com': 'steam',
	'google.com': 'google', 'gemini.google.com': 'googlegemini', 'claude.ai': 'anthropic',
};
const siUrl = (slug) => `https://cdn.simpleicons.org/${encodeURIComponent(slug)}/white`;

function isEmoji(s) { return !!s && !/[\w./:@-]/.test(s) && [...s].length <= 4; }
function hostOf(url) { try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname; } catch (_) { return ''; } }
function baseHost(h) { return h.replace(/^www\./, ''); }
function isVideoName(n) { return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(n || ''); }

// devolve {emoji} OU {list:[srcs em ordem de tentativa]}
function iconCandidates(item) {
	const raw = (item.icon || '').trim();
	if (isEmoji(raw)) return { emoji: raw };
	if (raw) {
		if (raw.startsWith('si:')) return { list: [siUrl(raw.slice(3).trim())] };
		return { list: [raw] };                       // link de imagem ou caminho local
	}
	const h = hostOf(item.url); if (!h) return { list: [] };
	const slug = SI_MAP[h] || SI_MAP[baseHost(h)];
	const list = [];
	if (slug) list.push(siUrl(slug));                 // 1º: logo da biblioteca
	list.push(`https://icons.duckduckgo.com/ip3/${h}.ico`);   // 2º: favicon
	list.push(`https://www.google.com/s2/favicons?domain=${h}&sz=64`); // 3º
	return { list };
}
function letterNode(name) {
	const s = document.createElement('span');
	s.className = 'letter';
	s.textContent = (name || '?').trim().charAt(0).toUpperCase() || '?';
	return s;
}
function iconNode(item) {
	const c = iconCandidates(item);
	if (c.emoji) { const s = document.createElement('span'); s.className = 'emoji'; s.textContent = c.emoji; return s; }
	if (!c.list || !c.list.length) return letterNode(item.name);
	const img = document.createElement('img');
	img.loading = 'lazy'; img.alt = item.name || '';
	let i = 0;
	const tryNext = () => { if (i >= c.list.length) { img.replaceWith(letterNode(item.name)); return; } img.src = c.list[i++]; };
	img.onerror = tryNext;
	tryNext();
	return img;
}

/* ========================================================= *
 * Fundo
 * ========================================================= */
let bgObjectUrl = null;
async function renderBackground() {
	const bg = state.appearance.background || { kind: 'preset', value: 'bg-2.mp4' };
	const vid = $('#bg-video'), img = $('#bg-image'), layer = $('#bg-layer');
	if (bgObjectUrl) { URL.revokeObjectURL(bgObjectUrl); bgObjectUrl = null; }

	const showVideo = (src) => { layer.style.background = ''; img.classList.remove('on'); img.removeAttribute('src'); vid.src = src; vid.classList.add('on'); vid.play().catch(() => {}); };
	const showImage = (src) => { layer.style.background = ''; try { vid.pause(); } catch (_) {} vid.classList.remove('on'); vid.removeAttribute('src'); img.src = src; img.classList.add('on'); };
	const showGrad  = (css) => { try { vid.pause(); } catch (_) {} vid.classList.remove('on'); img.classList.remove('on'); vid.removeAttribute('src'); img.removeAttribute('src'); layer.style.background = css; };

	try {
		if (bg.kind === 'gradient') return showGrad(bg.value || FALLBACK_GRADIENT);
		if (bg.kind === 'preset')  return isVideoName(bg.value) ? showVideo('media/' + bg.value) : showImage('media/' + bg.value);
		if (bg.kind === 'url')     return isVideoName(bg.value) ? showVideo(bg.value) : showImage(bg.value);
		if (bg.kind === 'media') {
			const blob = await IDB.get(bg.value);
			if (!blob) return showGrad(FALLBACK_GRADIENT);
			bgObjectUrl = URL.createObjectURL(blob);
			return (bg.mime || blob.type || '').startsWith('video') ? showVideo(bgObjectUrl) : showImage(bgObjectUrl);
		}
	} catch (_) { showGrad(FALLBACK_GRADIENT); }
}

function applyAppearance() {
	const ap = state.appearance, r = document.documentElement.style;
	r.setProperty('--accent', ap.accent || '#7c5cff');
	r.setProperty('--overlay', String(ap.overlay ?? 0.38));
	r.setProperty('--blur', (ap.blur || 0) + 'px');
	renderBackground();
}

/* ========================================================= *
 * Relógio + saudação
 * ========================================================= */
function tickClock() {
	const ap = state.appearance, now = new Date();
	let h = now.getHours(); const m = String(now.getMinutes()).padStart(2, '0'); const s = String(now.getSeconds()).padStart(2, '0');
	let ampm = '';
	if (!ap.clock24) { ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; }
	let html = `${ap.clock24 ? String(h).padStart(2, '0') : h}:${m}`;
	if (ap.showSeconds) html += `<span class="sec">${s}</span>`;
	if (ampm) html += `<span class="ampm">${ampm}</span>`;
	$('#clock').innerHTML = html;

	const hh = now.getHours();
	const greet = hh < 6 ? 'Boa madrugada' : hh < 12 ? 'Bom dia' : hh < 18 ? 'Boa tarde' : 'Boa noite';
	const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
	$('#greeting').innerHTML = `${greet}, <b>${escapeHtml(state.greetingName || '')}</b> · ${date}`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ========================================================= *
 * Efeito de digitação (typewriter) no campo de busca
 * ========================================================= */
let twTimer = null, twPhrase = 0, twChar = 0, twDeleting = false;
const twTextEl = () => $('#tw-text');
function twStop() { clearTimeout(twTimer); twTimer = null; }
function twTick() {
	const phrases = (state.search.phrases && state.search.phrases.length) ? state.search.phrases : DEFAULTS.search.phrases;
	const p = phrases[twPhrase % phrases.length] || '';
	if (!twDeleting) {
		twChar++;
		twTextEl().textContent = p.slice(0, twChar);
		if (twChar >= p.length) { twDeleting = true; twTimer = setTimeout(twTick, 1500); return; }
		twTimer = setTimeout(twTick, 70 + Math.random() * 60);
	} else {
		twChar--;
		twTextEl().textContent = p.slice(0, twChar);
		if (twChar <= 0) { twDeleting = false; twPhrase++; twTimer = setTimeout(twTick, 320); return; }
		twTimer = setTimeout(twTick, 38);
	}
}
function twStart() { if (!twTimer) twTick(); }
function updateTw() {
	const input = $('#search-input'), tw = $('#typewriter');
	const show = document.activeElement !== input && !input.value;
	tw.classList.toggle('show', show);
	show ? twStart() : twStop();
}

/* ========================================================= *
 * Busca
 * ========================================================= */
function looksLikeUrl(q) {
	if (/^https?:\/\//i.test(q)) return true;
	return !/\s/.test(q) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(q);
}
function navigate(url) { state.search.openInNewTab ? window.open(url, '_blank', 'noopener') : (window.location.href = url); }
function doSearch(q) {
	q = (q || '').trim(); if (!q) return;
	if (looksLikeUrl(q)) return navigate(/^https?:\/\//i.test(q) ? q : 'https://' + q);
	const eng = ENGINES[state.search.engine] || ENGINES.startpage;
	navigate(eng.url + encodeURIComponent(q));
}
function renderEngineBtn() { $('#engine-btn').textContent = (ENGINES[state.search.engine] || ENGINES.startpage).emoji; }
function toggleEngineMenu(force) {
	const menu = $('#engine-menu');
	const open = force ?? menu.hidden;
	if (!open) { menu.hidden = true; return; }
	menu.innerHTML = '';
	for (const [key, e] of Object.entries(ENGINES)) {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = key === state.search.engine ? 'active' : '';
		b.innerHTML = `<span class="em">${e.emoji}</span><span>${e.name}</span>`;
		b.onclick = () => { state.search.engine = key; save(); renderEngineBtn(); toggleEngineMenu(false); $('#search-input').focus(); };
		menu.appendChild(b);
	}
	menu.hidden = false;
}

/* ========================================================= *
 * Dock de apps + grade de portais
 * ========================================================= */
function renderApps() {
	const ul = $('#app-list'); ul.innerHTML = '';
	state.apps.filter(a => a.enabled !== false).forEach(a => {
		const li = document.createElement('li');
		const link = document.createElement('a');
		link.href = a.url; link.title = a.name; link.dataset.tip = a.name;
		if (/^https?:/.test(a.url)) link.rel = 'noopener';
		link.appendChild(iconNode(a));
		li.appendChild(link); ul.appendChild(li);
	});
	$('#app-dock').style.display = state.apps.some(a => a.enabled !== false) ? '' : 'none';
}
function renderPortals() {
	const grid = $('#portals-grid'); grid.innerHTML = '';
	const list = state.portals.filter(p => p.enabled !== false);
	if (!list.length) { grid.innerHTML = '<div class="empty">Nenhum portal ainda. Clique em “+ Adicionar”.</div>'; return; }
	list.forEach(p => {
		const a = document.createElement('a');
		a.href = p.url; a.className = 'portal'; a.rel = 'noopener';
		if (p.color) a.style.setProperty('--pc', p.color);
		const ico = document.createElement('div'); ico.className = 'ico'; ico.appendChild(iconNode(p));
		const meta = document.createElement('div'); meta.className = 'meta';
		const t = document.createElement('div'); t.className = 't'; t.textContent = p.name;
		const d = document.createElement('div'); d.className = 'd'; d.textContent = p.desc || hostOf(p.url) || '';
		meta.append(t, d);
		const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'edit'; edit.textContent = '✎';
		edit.title = 'Editar';
		edit.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openEdit('portal', p.id); });
		a.append(ico, meta, edit);
		grid.appendChild(a);
	});
}
function renderAll() { renderApps(); renderPortals(); renderEngineBtn(); tickClock(); updateTw(); }

/* ========================================================= *
 * Modal de edição (app / portal)
 * ========================================================= */
function openEdit(kind, id) {
	const list = kind === 'app' ? state.apps : state.portals;
	const item = id ? list.find(x => x.id === id) : null;
	const isPortal = kind === 'portal';
	const modal = $('#edit-modal'), back = $('#modal-backdrop');
	modal.innerHTML = `
		<h3>${item ? 'Editar' : 'Novo'} ${isPortal ? 'portal' : 'app'}</h3>
		<div class="field"><label>Nome</label><input class="inp" id="m-name" value="${item ? escapeHtml(item.name) : ''}" placeholder="Ex.: YouTube"></div>
		<div class="field"><label>Link (URL)</label><input class="inp" id="m-url" value="${item ? escapeHtml(item.url) : ''}" placeholder="https://..."></div>
		<div class="field"><label>Ícone <span class="hint" style="display:inline">— vazio = automático · emoji · <b>si:youtube</b> (biblioteca) · link de imagem</span></label><input class="inp" id="m-icon" value="${item ? escapeHtml(item.icon || '') : ''}" placeholder="si:spotify   ou   🎬   ou   https://.../logo.png"></div>
		${isPortal ? `
		<div class="field"><label>Descrição</label><input class="inp" id="m-desc" value="${item ? escapeHtml(item.desc || '') : ''}" placeholder="Ex.: Mensagens"></div>
		<div class="field row"><label style="margin:0">Cor de destaque</label><input type="color" id="m-color" value="${item && item.color ? item.color : '#7c5cff'}"></div>` : ''}
		<div class="modal-actions">
			${item ? '<button class="btn danger" id="m-del">Excluir</button>' : ''}
			<button class="btn" id="m-cancel">Cancelar</button>
			<button class="btn primary" id="m-save">Salvar</button>
		</div>`;
	showEl(back); showEl(modal);
	$('#m-name').focus();

	const close = () => { hideEl(modal); hideEl(back); };
	$('#m-cancel').onclick = close;
	back.onclick = close;
	if ($('#m-del')) $('#m-del').onclick = () => { const i = list.findIndex(x => x.id === id); if (i > -1) list.splice(i, 1); save(); renderAll(); refreshSettings(); close(); toast('Removido'); };
	$('#m-save').onclick = () => {
		const name = $('#m-name').value.trim(), url = $('#m-url').value.trim();
		if (!name || !url) { toast('Preencha nome e link'); return; }
		const data = { name, url, icon: $('#m-icon').value.trim() };
		if (isPortal) { data.desc = $('#m-desc').value.trim(); data.color = $('#m-color').value; }
		if (item) { Object.assign(item, data); } else { list.push({ id: uid(), enabled: true, ...data }); }
		save(); renderAll(); refreshSettings(); close(); toast('Salvo ✓');
	};
}

/* ========================================================= *
 * Painel de Ajustes
 * ========================================================= */
let curTab = 'aparencia';
const TABS = { aparencia: 'Aparência', busca: 'Busca', apps: 'Apps', portais: 'Portais', backup: 'Backup' };

// mostra/esconde controlando tanto o atributo hidden quanto o display inline
function showEl(el) { el.hidden = false; el.style.display = ''; }
function hideEl(el) { el.hidden = true; el.style.display = 'none'; }
function openSettings() { showEl($('#settings-backdrop')); showEl($('#settings-panel')); renderSettings(); }
function closeSettings() { hideEl($('#settings-panel')); hideEl($('#settings-backdrop')); }
function refreshSettings() { if (!$('#settings-panel').hidden) renderSettings(); }

function renderSettings() {
	const panel = $('#settings-panel');
	panel.innerHTML = `
		<div class="sp-head"><h2>Personalizar</h2><button class="sp-close" title="Fechar">✕</button></div>
		<div class="sp-tabs">${Object.entries(TABS).map(([k, v]) => `<button data-tab="${k}" class="${k === curTab ? 'active' : ''}">${v}</button>`).join('')}</div>
		<div class="sp-body" id="sp-body"></div>`;
	panel.querySelector('.sp-close').onclick = closeSettings;
	$$('.sp-tabs button', panel).forEach(b => b.onclick = () => { curTab = b.dataset.tab; renderSettings(); });
	({ aparencia: tabAppearance, busca: tabSearch, apps: () => tabList('app'), portais: () => tabList('portal'), backup: tabBackup }[curTab])();
}

function tabAppearance() {
	const ap = state.appearance, body = $('#sp-body');
	const bg = ap.background || {};
	body.innerHTML = `
		<div class="field">
			<label>Plano de fundo</label>
			<div class="chips" id="bg-presets">
				<button class="chip ${bg.kind==='preset'&&bg.value==='main.jpg'?'active':''}" data-preset="main.jpg">🖼️ main.jpg</button>
				<button class="chip ${bg.kind==='preset'&&bg.value==='bg-1.mp4'?'active':''}" data-preset="bg-1.mp4">🎞️ Vídeo 1</button>
				<button class="chip ${bg.kind==='preset'&&bg.value==='bg-2.mp4'?'active':''}" data-preset="bg-2.mp4">🎞️ Vídeo 2</button>
				<button class="chip ${bg.kind==='media'?'active':''}" data-upload>⬆️ Enviar arquivo</button>
			</div>
			<input type="file" id="bg-file" accept="image/*,video/*" hidden>
			<div class="hint">Imagem ou vídeo do seu computador. Fica salvo só neste navegador.</div>
		</div>
		<div class="field">
			<label>Ou cole um link de imagem/vídeo</label>
			<div class="row"><input class="inp" id="bg-url" placeholder="https://.../fundo.jpg" value="${bg.kind==='url'?escapeHtml(bg.value):''}"><button class="btn" id="bg-url-apply">Usar</button></div>
		</div>
		<div class="field">
			<label>Gradientes</label>
			<div class="chips" id="bg-grads">${GRADIENTS.map((g,i)=>`<button class="chip ${bg.kind==='gradient'&&bg.value===g?'active':''}" data-grad="${i}" style="background:${g};min-width:52px;height:34px" title="Gradiente ${i+1}"></button>`).join('')}</div>
		</div>
		<div class="field"><label>Escurecer fundo — <b>${Math.round((ap.overlay??.38)*100)}%</b></label><input type="range" id="ov" min="0" max="0.9" step="0.02" value="${ap.overlay??.38}"></div>
		<div class="field"><label>Desfoque (blur) — <b>${ap.blur||0}px</b></label><input type="range" id="bl" min="0" max="24" step="1" value="${ap.blur||0}"></div>
		<div class="field row"><label style="margin:0">Cor de destaque</label><input type="color" id="ac" value="${ap.accent||'#7c5cff'}"></div>
		<div class="field row" style="justify-content:space-between"><label style="margin:0">Relógio 24h</label>${switchHtml('c24', ap.clock24)}</div>
		<div class="field row" style="justify-content:space-between"><label style="margin:0">Mostrar segundos</label>${switchHtml('csec', ap.showSeconds)}</div>`;

	$$('#bg-presets [data-preset]', body).forEach(b => b.onclick = () => { ap.background = { kind: 'preset', value: b.dataset.preset }; save(); applyAppearance(); renderSettings(); });
	$('[data-upload]', body).onclick = () => $('#bg-file').click();
	$('#bg-file', body).onchange = async (e) => {
		const f = e.target.files[0]; if (!f) return;
		if (f.size > 120 * 1024 * 1024) { toast('Arquivo muito grande (máx. ~120MB)'); return; }
		toast('Salvando fundo…');
		try { await IDB.put('custom-bg', f); ap.background = { kind: 'media', value: 'custom-bg', mime: f.type }; save(); applyAppearance(); renderSettings(); toast('Fundo atualizado ✓'); }
		catch (_) { toast('Não foi possível salvar'); }
	};
	$('#bg-url-apply', body).onclick = () => { const u = $('#bg-url', body).value.trim(); if (!u) return; ap.background = { kind: 'url', value: u }; save(); applyAppearance(); renderSettings(); };
	$$('#bg-grads [data-grad]', body).forEach(b => b.onclick = () => { ap.background = { kind: 'gradient', value: GRADIENTS[+b.dataset.grad] }; save(); applyAppearance(); renderSettings(); });
	$('#ov', body).oninput = (e) => { ap.overlay = +e.target.value; document.documentElement.style.setProperty('--overlay', String(ap.overlay)); save(); const l = e.target.parentElement.querySelector('b'); if (l) l.textContent = Math.round(ap.overlay * 100) + '%'; };
	$('#bl', body).oninput = (e) => { ap.blur = +e.target.value; document.documentElement.style.setProperty('--blur', ap.blur + 'px'); save(); const l = e.target.parentElement.querySelector('b'); if (l) l.textContent = ap.blur + 'px'; };
	$('#ac', body).oninput = (e) => { ap.accent = e.target.value; document.documentElement.style.setProperty('--accent', ap.accent); save(); };
	bindSwitch('c24', v => { ap.clock24 = v; save(); tickClock(); });
	bindSwitch('csec', v => { ap.showSeconds = v; save(); tickClock(); });
}

function tabSearch() {
	const s = state.search, body = $('#sp-body');
	body.innerHTML = `
		<div class="field"><label>Seu nome (saudação)</label><input class="inp" id="gn" value="${escapeHtml(state.greetingName||'')}" placeholder="Vitor"></div>
		<div class="field"><label>Buscador padrão</label><select class="inp" id="eng">${Object.entries(ENGINES).map(([k,e])=>`<option value="${k}" ${k===s.engine?'selected':''}>${e.emoji} ${e.name}</option>`).join('')}</select></div>
		<div class="field row" style="justify-content:space-between"><label style="margin:0">Abrir resultados em nova aba</label>${switchHtml('nt', s.openInNewTab)}</div>
		<div class="field">
			<label>Frases do efeito de digitação (uma por linha)</label>
			<textarea class="inp" id="phr" rows="6" style="resize:vertical;font-family:inherit">${escapeHtml((s.phrases||[]).join('\n'))}</textarea>
			<div class="hint">Aparecem escrevendo/apagando letra por letra no campo de busca.</div>
		</div>
		<button class="btn primary block" id="phr-save">Salvar frases</button>`;
	$('#gn', body).oninput = (e) => { state.greetingName = e.target.value; save(); tickClock(); };
	$('#eng', body).onchange = (e) => { s.engine = e.target.value; save(); renderEngineBtn(); };
	bindSwitch('nt', v => { s.openInNewTab = v; save(); });
	$('#phr-save', body).onclick = () => { s.phrases = $('#phr', body).value.split('\n').map(x => x.trim()).filter(Boolean); if (!s.phrases.length) s.phrases = clone(DEFAULTS.search.phrases); save(); twPhrase = twChar = 0; twDeleting = false; toast('Frases salvas ✓'); };
}

function tabList(kind) {
	const isPortal = kind === 'portal';
	const list = isPortal ? state.portals : state.apps;
	const body = $('#sp-body');
	body.innerHTML = `
		<div class="hint" style="margin-bottom:12px">Ative/desative, edite, reordene ou remova ${isPortal ? 'os portais' : 'os apps do menu lateral'}.</div>
		<div class="edit-list" id="elist"></div>
		<button class="btn primary block" id="add">+ Adicionar ${isPortal ? 'portal' : 'app'}</button>`;
	const el = $('#elist', body);
	list.forEach((it, idx) => {
		const row = document.createElement('div');
		row.className = 'edit-item' + (it.enabled === false ? ' off' : '');
		const ico = document.createElement('div'); ico.className = 'ei-ico'; ico.appendChild(iconNode(it));
		const meta = document.createElement('div'); meta.className = 'ei-meta';
		const n = document.createElement('div'); n.className = 'n'; n.textContent = it.name;
		const u = document.createElement('div'); u.className = 'u'; u.textContent = it.url;
		meta.append(n, u);
		const act = document.createElement('div'); act.className = 'ei-act';
		act.innerHTML = `
			${switchHtml('sw-' + it.id, it.enabled !== false)}
			<button class="icon-btn" data-up title="Subir">▲</button>
			<button class="icon-btn" data-down title="Descer">▼</button>
			<button class="icon-btn" data-edit title="Editar">✎</button>
			<button class="icon-btn del" data-del title="Remover">🗑</button>`;
		row.append(ico, meta, act);
		el.appendChild(row);
		bindSwitch('sw-' + it.id, v => { it.enabled = v; save(); renderApps(); renderPortals(); row.classList.toggle('off', !v); });
		act.querySelector('[data-up]').onclick = () => { if (idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; save(); renderAll(); renderSettings(); } };
		act.querySelector('[data-down]').onclick = () => { if (idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; save(); renderAll(); renderSettings(); } };
		act.querySelector('[data-edit]').onclick = () => openEdit(kind, it.id);
		act.querySelector('[data-del]').onclick = () => { list.splice(idx, 1); save(); renderAll(); renderSettings(); };
	});
	$('#add', body).onclick = () => openEdit(kind);
}

function tabBackup() {
	const body = $('#sp-body');
	body.innerHTML = `
		<div class="hint" style="margin-bottom:14px">Exporte suas configurações (apps, portais, cores, frases) para um arquivo, ou restaure de um backup. <b>As mídias de fundo enviadas ficam só neste navegador</b> e não entram no arquivo.</div>
		<button class="btn primary block" id="exp">⬇️ Exportar configurações</button>
		<div style="height:10px"></div>
		<button class="btn block" id="imp">⬆️ Importar de um arquivo</button>
		<input type="file" id="imp-file" accept="application/json,.json" hidden>
		<div style="height:26px"></div>
		<button class="btn danger block" id="rst">↺ Restaurar padrão de fábrica</button>`;
	$('#exp', body).onclick = () => {
		const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
		const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vitorhome-config.json'; a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Exportado ✓');
	};
	$('#imp', body).onclick = () => $('#imp-file', body).click();
	$('#imp-file', body).onchange = (e) => {
		const f = e.target.files[0]; if (!f) return;
		const rd = new FileReader();
		rd.onload = () => { try { const data = JSON.parse(rd.result); state = deepMerge(clone(DEFAULTS), data); (state.apps||[]).forEach(a=>a.id=a.id||uid()); (state.portals||[]).forEach(p=>p.id=p.id||uid()); if(!Array.isArray(state.notes)) state.notes=[]; save(); applyAppearance(); renderAll(); renderNotes(); renderSettings(); toast('Importado ✓'); } catch (_) { toast('Arquivo inválido'); } };
		rd.readAsText(f);
	};
	$('#rst', body).onclick = () => { if (confirm('Restaurar tudo para o padrão? Suas personalizações serão perdidas.')) { localStorage.removeItem(LS_KEY); IDB.del('custom-bg'); load(); applyAppearance(); renderAll(); renderNotes(); renderSettings(); toast('Restaurado'); } };
}

/* ---- helpers de UI ---- */
function switchHtml(id, on) { return `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="track"></span></label>`; }
function bindSwitch(id, cb) { const e = document.getElementById(id); if (e) e.onchange = () => cb(e.checked); }

let toastTimer = null;
function toast(msg) {
	let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
	t.textContent = msg; t.classList.add('show');
	clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ========================================================= *
 * Anotações rápidas (post-its móveis)
 * ========================================================= */
const NOTE_COLORS = ['#ffe37a', '#ffb3ba', '#bffcc6', '#a0e7ff', '#f7c6ff', '#ffd8a8'];
let noteZ = 30;

function mountNote(n) {
	const layer = $('#notes-layer');
	const el = document.createElement('div');
	el.className = 'note'; el.dataset.id = n.id;
	const x = Math.max(0, Math.min(n.x ?? 60, innerWidth - 60));
	const y = Math.max(0, Math.min(n.y ?? 130, innerHeight - 40));
	el.style.left = x + 'px'; el.style.top = y + 'px';
	el.style.width = (n.w || 220) + 'px'; el.style.height = (n.h || 190) + 'px';
	el.style.background = n.color || NOTE_COLORS[0];
	el.style.zIndex = ++noteZ;
	el.innerHTML = `
		<div class="note-bar">
			<div class="dots">${NOTE_COLORS.map(c => `<span class="dot" data-c="${c}" style="background:${c}" title="Cor"></span>`).join('')}</div>
			<button class="note-del" title="Excluir anotação">✕</button>
		</div>
		<textarea class="note-body" placeholder="Anotação rápida…" spellcheck="false"></textarea>`;
	const ta = el.querySelector('.note-body'); ta.value = n.text || '';
	layer.appendChild(el);

	el.addEventListener('pointerdown', () => { el.style.zIndex = ++noteZ; }, true);

	let sT = null;
	ta.addEventListener('input', () => { n.text = ta.value; clearTimeout(sT); sT = setTimeout(save, 350); });

	el.querySelectorAll('.dot').forEach(d => d.addEventListener('click', () => { n.color = d.dataset.c; el.style.background = n.color; save(); }));
	el.querySelector('.note-del').addEventListener('click', () => { const i = state.notes.findIndex(x => x.id === n.id); if (i > -1) state.notes.splice(i, 1); save(); el.remove(); });

	// arrastar pela barra do topo
	const bar = el.querySelector('.note-bar');
	bar.addEventListener('pointerdown', (e) => {
		if (e.target.closest('.dot,.note-del')) return;
		e.preventDefault();
		const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
		bar.setPointerCapture(e.pointerId);
		const move = (ev) => {
			const nx = Math.max(0, Math.min(ox + ev.clientX - sx, innerWidth - 60));
			const ny = Math.max(0, Math.min(oy + ev.clientY - sy, innerHeight - 40));
			el.style.left = nx + 'px'; el.style.top = ny + 'px';
		};
		const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); n.x = el.offsetLeft; n.y = el.offsetTop; save(); };
		bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
	});

	// persistir tamanho ao redimensionar (canto inferior direito)
	if (window.ResizeObserver) {
		let rT = null;
		new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(() => { n.w = el.offsetWidth; n.h = el.offsetHeight; save(); }, 300); }).observe(el);
	}
	return el;
}
function renderNotes() { const layer = $('#notes-layer'); if (!layer) return; layer.innerHTML = ''; noteZ = 30; (state.notes || []).forEach(mountNote); }
function addNote() {
	const n = { id: uid(), text: '', x: 60 + Math.round(Math.random() * 60), y: 120 + Math.round(Math.random() * 60), w: 220, h: 190, color: NOTE_COLORS[0] };
	state.notes.push(n); save();
	mountNote(n).querySelector('.note-body').focus();
}

/* ========================================================= *
 * Eventos globais / init
 * ========================================================= */
function init() {
	load();
	applyAppearance();
	renderAll();
	renderNotes();
	tickClock(); setInterval(tickClock, 1000);

	// busca
	$('#search-form').addEventListener('submit', (e) => { e.preventDefault(); doSearch($('#search-input').value); });
	const input = $('#search-input');
	input.addEventListener('focus', updateTw);
	input.addEventListener('blur', updateTw);
	input.addEventListener('input', updateTw);

	// buscador
	$('#engine-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleEngineMenu(); });
	document.addEventListener('click', (e) => { if (!e.target.closest('#engine-menu, #engine-btn')) toggleEngineMenu(false); });

	// portais / ajustes
	$('[data-add-portal]').addEventListener('click', () => openEdit('portal'));
	$('#open-settings').addEventListener('click', openSettings);
	$('#settings-backdrop').addEventListener('click', closeSettings);
	$('#add-note').addEventListener('click', addNote);

	// atalhos de teclado
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') { toggleEngineMenu(false); if (!$('#edit-modal').hidden) { hideEl($('#edit-modal')); hideEl($('#modal-backdrop')); } else closeSettings(); return; }
		const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
		if (typing) return;
		if (e.key === '/' || (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)) {
			input.focus();
			if (e.key === '/') e.preventDefault();
		}
	});

	updateTw();
	// pausa o typewriter quando a aba fica oculta (economia)
	document.addEventListener('visibilitychange', () => document.hidden ? twStop() : updateTw());
}

document.addEventListener('DOMContentLoaded', init);

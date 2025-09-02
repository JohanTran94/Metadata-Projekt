const state = { page: 1, total: 0, pageSize: 20, lastQuery: '' };

const form = document.getElementById('searchForm');
const table = document.getElementById('resultTable');
const tbody = document.getElementById('resultBody');
const summary = document.getElementById('summary');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  state.page = 1;
  runSearch();
});

prevBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page--;
    runSearch(true);
  }
});
nextBtn.addEventListener('click', () => {
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  if (state.page < maxPage) {
    state.page++;
    runSearch(true);
  }
});


runSearch();

async function runSearch(keepQuery = false) {
  const params = buildQueryParams(keepQuery);
  const url = `/api/image/search?${params.toString()}`;

  summary.textContent = 'Loading...';
  table.hidden = true;
  pagination.hidden = true;

  const res = await fetch(url);
  if (!res.ok) {
    summary.textContent = 'Search failed.';
    return;
  }
  const data = await res.json();

  state.total = data.total || 0;
  state.pageSize = data.pageSize || Number(document.getElementById('pageSize').value || 20);

  renderResults(data);
}

function buildQueryParams(keepQuery) {
  const text = document.getElementById('text').value.trim();
  const make = document.getElementById('make').value.trim();
  const model = document.getElementById('model').value.trim();
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  const pageSize = document.getElementById('pageSize').value;

  const nearLat = document.getElementById('nearLat').value.trim();
  const nearLon = document.getElementById('nearLon').value.trim();
  const radius = document.getElementById('radius').value.trim();

  const params = keepQuery && state.lastQuery
    ? new URLSearchParams(state.lastQuery)
    : new URLSearchParams();


  params.set('type', 'image');
  params.set('page', String(state.page));
  params.set('pageSize', pageSize || '20');


  if (text) params.set('text', text); else params.delete('text');
  if (make) params.set('make', make); else params.delete('make');
  if (model) params.set('model', model); else params.delete('model');
  if (from) params.set('from', from); else params.delete('from');
  if (to) params.set('to', to); else params.delete('to');


  if (nearLat && nearLon && radius) {
    params.set('nearLat', nearLat);
    params.set('nearLon', nearLon);
    params.set('radius', radius);
  } else {
    params.delete('nearLat'); params.delete('nearLon'); params.delete('radius');
  }

  state.lastQuery = params.toString();
  return params;
}

function renderResults(data) {
  const rows = data.results || [];
  tbody.innerHTML = '';

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
          <td title="${r.file_path || ''}">${r.file_name || ''}</td>
          <td>${r.make || ''}</td>
          <td>${r.model || ''}</td>
          <td>${fmtDate(r.create_date)}</td>
          <td>${r.width ?? ''}</td>
          <td>${r.height ?? ''}</td>
          <td>${fmtNum(r.latitude)}</td>
          <td>${fmtNum(r.longitude)}</td>
          <td class="row-actions">
            ${r.file_path ? `<a href="${toStaticPath(r.file_path)}" target="_blank" rel="noopener">View</a>` : ''}
          </td>
        `;
    tbody.appendChild(tr);
  });

  table.hidden = rows.length === 0;

  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  summary.textContent = `Total: ${state.total} | Page ${state.page} of ${maxPage}`;
  pagination.hidden = rows.length === 0;
  pageInfo.textContent = `Page ${state.page} / ${maxPage}`;
}


function fmtNum(n) {
  return (n === null || n === undefined) ? '' : String(n);
}
function fmtDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? String(dt) : d.toISOString().slice(0, 19).replace('T', ' ');
}
function toStaticPath(filePath) {

  const parts = String(filePath || '').split(/[/\\]/);
  const filename = parts[parts.length - 1] || '';
  return `/files/${filename}`;
}
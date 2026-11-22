import { api } from '../api.js';
import { animateBars } from '../charts.js';
import { esc, toast } from '../dom.js';
import { state } from '../state.js';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 按能力同义词高亮 JD 原文；先切分再转义，避免把 HTML 实体打断。 */
function highlight(text, terms) {
  const words = terms
    .map((t) => t.alias)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!words.length) return esc(text);
  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  return text
    .split(pattern)
    .map((part, index) => (index % 2 === 1 ? `<mark>${esc(part)}</mark>` : esc(part)))
    .join('');
}

function abilityBars(abilities) {
  const maxWeight = Math.max(1, ...abilities.map((ability) => ability.weight));
  return abilities
    .map(
      (ability) => `
      <div class="cap" title="${esc(ability.desc || '')}">
        <div class="name">${esc(ability.name)}</div>
        <div class="cat"><span class="tag line">${esc(ability.categoryName)}</span></div>
        <div class="bar"><i data-w="${Math.round((ability.weight / maxWeight) * 100)}"></i></div>
        <div class="val">${ability.weight}%</div>
      </div>`
    )
    .join('');
}

function pipelineCard(job) {
  const stats = job.samples || {};
  return `
    <div class="card">
      <div class="section-title">
        <h3>解析流水线</h3>
        <span class="small muted">${stats.jdCount || job.jdCount} 条 JD · ${stats.chars || 0} 字 · ${stats.sentences || 0} 句</span>
      </div>
      <div class="grid g2" style="gap:12px">
        ${(job.steps || [])
          .map(
            (step, index) => `
          <div class="layer" style="align-items:flex-start">
            <span class="lv">${String(index + 1).padStart(2, '0')}</span>
            <div class="dd" style="margin-top:0;color:#374151">${esc(step)}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>`;
}

export async function renderJobs(root) {
  root.innerHTML = '<div class="loading">正在加载岗位库…</div>';

  const { items } = await api.get('/api/jobs');
  if (!items.length) {
    root.innerHTML = `
      <div class="card empty">
        <h2>岗位库还是空的</h2>
        <p class="sub">请先在「后台管理」中导入岗位 JD，系统会自动解析能力图谱。</p>
      </div>`;
    return;
  }

  if (!state.jobId || !items.some((job) => job.id === state.jobId)) {
    state.jobId = items[0].id;
  }

  let data;
  try {
    data = await api.get(`/api/jobs/${state.jobId}`);
  } catch (err) {
    state.jobId = items[0].id;
    data = await api.get(`/api/jobs/${state.jobId}`);
  }

  const { job, terms } = data;
  const abilities = job.abilities || [];

  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 01 · 岗位解析</div>
        <h1>把招聘要求，翻译成能练的能力项</h1>
        <p class="sub">
          解析 ${job.jdCount} 条「${esc(job.title)}」同类 JD，归并为 ${abilities.length} 项能力，
          并标注每项在面试中的相对权重。
        </p>
      </div>
      <div class="tag ok">数据来源：公开 JD · 已脱敏</div>
    </div>

    <div class="job-switch" id="jobSwitch">
      ${items
        .map(
          (item) => `
          <button class="job-chip ${item.id === job.id ? 'active' : ''}" data-job="${esc(item.id)}">
            <b>${esc(item.title)}</b>
            <span>${esc(item.city)} · ${esc(item.salary)} · ${item.jdCount} 条 JD</span>
          </button>`
        )
        .join('')}
    </div>

    <div class="grid g2">
      <div class="card">
        <div class="section-title">
          <h2>招聘原文</h2>
          <span class="tag line">${job.jdCount} 条合并样本</span>
        </div>
        <div class="jd">${highlight(job.text, terms)}</div>
        <div class="meta">
          <div>城市<b>${esc(job.city)}</b></div>
          <div>月薪<b>${esc(job.salary)}</b></div>
          <div>学历<b>${esc(job.education)}</b></div>
          <div>经验<b>${esc(job.experience)}</b></div>
          <div>能力项<b>${abilities.length}</b></div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">
          <h2>能力图谱</h2>
          <span class="tag">权重合计 100%</span>
        </div>
        <div id="caps">${abilityBars(abilities)}</div>
        <p class="small muted" style="margin-top:12px">
          权重 = 岗位覆盖率 55% + 提及密度 30% + 要求强度 15%，按四类能力归一化。
        </p>
        <div class="btn-row">
          <button class="btn btn-primary" id="startAssess">开始能力诊断 →</button>
        </div>
      </div>
    </div>

    ${pipelineCard(job)}
  `;

  animateBars(root);

  root.querySelector('#jobSwitch').addEventListener('click', async (event) => {
    const chip = event.target.closest('[data-job]');
    if (!chip || chip.dataset.job === state.jobId) return;
    state.jobId = chip.dataset.job;
    try {
      await renderJobs(root);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  root.querySelector('#startAssess').addEventListener('click', () => {
    window.location.hash = '#/assess';
  });
}

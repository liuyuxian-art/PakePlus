import { api } from '../api.js';
import { esc, toast, statusTag, fmtDate, levelBadge } from '../dom.js';
import { state, isStaff } from '../state.js';

let activeWeek = 1;

function weekRows(plan) {
  return plan.weeks
    .map((week) => {
      const statusClass = week.status === 'doing' ? 'now' : week.status === 'done' ? 'done' : '';
      const statusText = week.status === 'doing' ? '进行中' : week.status === 'done' ? '已完成' : '未开始';
      return `
        <div class="week ${week.week === activeWeek ? 'active' : ''}" data-week="${week.week}">
          <div class="no">W${week.week}</div>
          <div>
            <div class="t">${esc(week.title)}</div>
            <div class="d">${esc(week.abilityName)} · ${week.hours} 小时 · 产出：${esc(week.output)}</div>
          </div>
          <div class="st ${statusClass}">${statusText}</div>
        </div>`;
    })
    .join('');
}

function weekDetail(plan) {
  const week = plan.weeks.find((w) => w.week === activeWeek) || plan.weeks[0];
  if (!week) return '';
  return `
    <div class="card">
      <div class="section-title">
        <h3>这一周做什么</h3>
        ${levelBadge(week.evidenceLevel)}
      </div>
      <p class="sub" style="margin-top:0">${esc(week.label)} · ${esc(week.abilityName)}</p>
      <div class="row">
        <div class="n">任务</div>
        <div class="small" style="flex:1;line-height:1.7">${esc(week.title)}：${esc(week.goal)}</div>
      </div>
      <div class="row">
        <div class="n">产出</div>
        <div class="small" style="flex:1">${esc(week.output)}</div>
      </div>
      <div class="row">
        <div class="n">评分</div>
        <div class="small" style="flex:1">${esc(week.criteria)}</div>
      </div>
      <div class="row">
        <div class="n">状态</div>
        <div class="small" style="flex:1">${statusTag(week.status)}</div>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost btn-sm" data-status="doing" ${week.status === 'doing' ? 'disabled' : ''}>标记进行中</button>
        <button class="btn btn-primary btn-sm" data-status="done" ${week.status === 'done' ? 'disabled' : ''}>标记已完成</button>
      </div>
    </div>
    <div class="card">
      <h3>为什么不是「推荐课程」</h3>
      <p class="sub" style="margin-top:6px">
        课程解决「知道」，任务解决「做到」。企业招人看的是交付物，不是完课率——所以平台只记录作品与评价，
        每一周完成的任务都会沉淀为对应等级的能力证据。
      </p>
    </div>`;
}

function planView(plan) {
  const progress = plan.progress || { percent: 0, done: 0, total: plan.weeks.length };
  return `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 03 · 成长计划</div>
        <h1>4 周，把差距变成作品</h1>
        <p class="sub">
          按差距优先级匹配任务库，生成「任务 + 产出 + 评分标准」；完成即沉淀为能力证据。
        </p>
      </div>
      <div class="tag ok">目标：${plan.startScore} → ${plan.targetScore}</div>
    </div>
    <div class="grid g2">
      <div class="card">
        <div class="section-title">
          <h2>训练路径</h2>
          <span class="tag line">已完成 ${progress.done}/${progress.total}</span>
        </div>
        <div class="progress"><i style="width:${progress.percent}%"></i></div>
        <div class="small muted" style="margin-bottom:14px">计划完成度 ${progress.percent}%</div>
        <div class="plan" id="planList">${weekRows(plan)}</div>
      </div>
      <div id="weekDetail">${weekDetail(plan)}</div>
    </div>`;
}

function bindPlan(root, plan) {
  const list = root.querySelector('#planList');
  list.addEventListener('click', (event) => {
    const item = event.target.closest('[data-week]');
    if (!item) return;
    activeWeek = Number(item.dataset.week);
    root.innerHTML = planView(plan);
    bindPlan(root, plan);
  });

  root.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await api.patch(`/api/plans/${plan.id}/weeks/${activeWeek}`, { status: button.dataset.status });
        await renderPlan(root);
      } catch (err) {
        toast(err.message, 'error');
        button.disabled = false;
      }
    });
  });
}

async function renderPlanList(root) {
  const { items } = await api.get('/api/plans');
  const rows = items
    .map(
      (plan) => `
      <tr>
        <td>${esc(plan.userName)}</td>
        <td>${esc(plan.jobTitle)}</td>
        <td>${plan.startScore} → ${plan.targetScore}</td>
        <td>${plan.progress.done}/${plan.progress.total}</td>
        <td>${fmtDate(plan.createdAt)}</td>
        <td><button class="btn btn-ghost btn-sm" data-plan="${esc(plan.id)}">查看</button></td>
      </tr>`
    )
    .join('');
  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 03 · 成长计划</div>
        <h1>学生成长计划</h1>
        <p class="sub">教研可查看每位学生的 4 周训练路径与完成进度。</p>
      </div>
      <div class="tag">共 ${items.length} 份</div>
    </div>
    <div class="card">
      ${
        items.length
          ? `<table class="table"><thead><tr><th>学生</th><th>目标岗位</th><th>起点 → 目标</th><th>进度</th><th>生成时间</th><th></th></tr></thead>
             <tbody>${rows}</tbody></table>`
          : '<div class="empty">暂无成长计划</div>'
      }
    </div>`;
  root.querySelectorAll('[data-plan]').forEach((button) => {
    button.addEventListener('click', async () => {
      const { plan } = await api.get(`/api/plans/${button.dataset.plan}`);
      root.innerHTML = planView(plan);
      bindPlan(root, plan);
    });
  });
}

export async function renderPlan(root) {
  root.innerHTML = '<div class="loading">正在读取成长计划…</div>';

  if (isStaff()) {
    await renderPlanList(root);
    return;
  }

  const { plan } = await api.get('/api/plans/latest');
  if (!plan) {
    root.innerHTML = `
      <div class="screen-head">
        <div>
          <div class="kicker">Step 03 · 成长计划</div>
          <h1>4 周，把差距变成作品</h1>
          <p class="sub">成长计划由诊断结果生成，先完成一次能力诊断。</p>
        </div>
      </div>
      <div class="card empty">
        <h3>还没有成长计划</h3>
        <p class="sub" style="margin:8px 0 16px">完成诊断后，系统会按差距优先级生成 4 周训练路径。</p>
        <button class="btn btn-primary" id="goAssess">去做能力诊断</button>
      </div>`;
    root.querySelector('#goAssess').addEventListener('click', () => {
      window.location.hash = '#/assess';
    });
    return;
  }

  state.planId = plan.id;
  if (!plan.weeks.some((w) => w.week === activeWeek)) activeWeek = 1;
  root.innerHTML = planView(plan);
  bindPlan(root, plan);
}

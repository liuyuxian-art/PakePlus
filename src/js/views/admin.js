import { api } from '../api.js';
import { donutSvg, animateBars } from '../charts.js';
import { esc, fmtDate, toast, statusTag } from '../dom.js';
import { state, isStaff } from '../state.js';

let activeTab = 'overview';
let snapshot = null;

const ROLE_NAMES = { student: '学生', teacher: '教研', enterprise: '企业', admin: '管理员' };
const TASK_LEVELS = { basic: '基础补齐', project: '业务实战', express: '结论表达', enterprise: '企业真题' };

function overview(stats) {
  const levels = ['L0', 'L1', 'L2', 'L3'].map((level) => ({
    label: level,
    value: stats.evidences.byLevel[level] || 0
  }));
  const maxCategory = Math.max(1, ...stats.evidenceByCategory.map((item) => item.count));

  return `
    <div class="stat-grid">
      <div class="stat"><span>诊断次数</span><b>${stats.assessments.total}</b>
        <span class="small muted">待复核 ${stats.assessments.pending} 次</span></div>
      <div class="stat"><span>诊断完成率</span><b>${stats.completionRate}%</b>
        <span class="small muted">平均综合分 ${stats.assessments.avgFinal == null ? '—' : stats.assessments.avgFinal}</span></div>
      <div class="stat"><span>能力证据</span><b>${stats.evidences.total}</b>
        <span class="small muted">L2 及以上 ${(stats.evidences.byLevel.L2 || 0) + (stats.evidences.byLevel.L3 || 0)} 条</span></div>
      <div class="stat"><span>企业访问</span><b>${stats.shares.views}</b>
        <span class="small muted">有效链接 ${stats.shares.active} 个</span></div>
    </div>

    <div class="grid g2" style="margin-top:18px">
      <div class="card">
        <div class="section-title"><h3>证据等级分布</h3><span class="tag line">共 ${stats.evidences.total} 条</span></div>
        <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">
          ${donutSvg(levels)}
          <div style="flex:1;min-width:150px">
            ${levels
              .map(
                (item) => `
              <div class="row" style="border-bottom:0;padding:5px 0">
                <div class="n" style="width:60px">${item.label}</div>
                <div class="small muted" style="flex:1">${item.value} 条</div>
              </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-title"><h3>证据能力类别分布</h3><span class="small muted">知识 / 工具 / 方法 / 产出</span></div>
        ${stats.evidenceByCategory
          .map(
            (item) => `
          <div class="cap">
            <div class="name" style="width:70px">${esc(item.name)}</div>
            <div class="bar"><i data-w="${Math.round((item.count / maxCategory) * 100)}"></i></div>
            <div class="val">${item.count}</div>
          </div>`
          )
          .join('')}
        <p class="small muted" style="margin-top:12px">画像越均衡，说明能力证据没有集中在单一类别上。</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title"><h3>最近操作</h3><span class="small muted">审计日志</span></div>
      <table class="table">
        <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>详情</th></tr></thead>
        <tbody>
          ${stats.recentLogs
            .map(
              (log) => `<tr><td>${fmtDate(log.at, true)}</td><td>${esc(log.actor)}</td><td>${esc(log.action)}</td><td>${esc(log.detail)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function usersTable(users) {
  const canEdit = state.role === 'admin';
  return `
    <div class="card">
      <div class="section-title">
        <h3>学生授权与数据</h3>
        <span class="small muted">${canEdit ? '开关即时生效' : '仅管理员可修改授权'}</span>
      </div>
      <table class="table">
        <thead>
          <tr><th>姓名</th><th>角色</th><th>学校 / 专业</th><th>证据</th><th>诊断</th><th>企业可见</th></tr>
        </thead>
        <tbody>
          ${users
            .map(
              (user) => `
            <tr>
              <td>${esc(user.name)}<div class="small muted">${esc(user.account)}</div></td>
              <td>${esc(ROLE_NAMES[user.role] || user.role)}</td>
              <td>${esc(user.school || '—')}<div class="small muted">${esc(user.major || '')}</div></td>
              <td>${user.evidenceCount}</td>
              <td>${user.assessmentCount}</td>
              <td>
                <label class="switch" title="${canEdit ? '切换企业可见' : '无权限'}">
                  <input type="checkbox" data-user="${esc(user.id)}" ${user.openToEnterprise ? 'checked' : ''} ${canEdit ? '' : 'disabled'}>
                  <i></i>
                </label>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function tasksTable(tasks) {
  return `
    <div class="card">
      <div class="section-title"><h3>任务库</h3><span class="tag line">共 ${tasks.length} 个</span></div>
      <table class="table">
        <thead><tr><th>任务</th><th>能力项</th><th>类型</th><th>时长</th><th>产出</th></tr></thead>
        <tbody>
          ${tasks
            .slice(0, 12)
            .map(
              (task) => `
            <tr>
              <td>${esc(task.title)}</td>
              <td>${esc(task.abilityKey || '通用')}</td>
              <td><span class="tag line">${esc(TASK_LEVELS[task.level] || task.level)}</span></td>
              <td>${task.hours} 小时</td>
              <td class="small muted">${esc(task.output || '')}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function tabs() {
  const items = [
    ['overview', '运营概览'],
    ['users', '学生授权'],
    ['tasks', '任务库']
  ];
  return `<div class="tabs">
    ${items.map(([key, label]) => `<button class="tab ${activeTab === key ? 'active' : ''}" data-tab="${key}">${label}</button>`).join('')}
  </div>`;
}

export async function renderAdmin(root) {
  if (!isStaff()) {
    root.innerHTML = '<div class="card empty"><h2>无访问权限</h2><p class="sub">后台管理仅对教研与管理员开放。</p></div>';
    return;
  }
  root.innerHTML = '<div class="loading">正在加载后台数据…</div>';
  if (!snapshot) {
    const [stats, users, tasks] = await Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/users'),
      api.get('/api/admin/tasks')
    ]);
    snapshot = { stats, users: users.items, tasks: tasks.items };
  }
  const { stats, users, tasks } = snapshot;

  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">后台管理</div>
        <h1>平台运营与数据管理</h1>
        <p class="sub">岗位库、任务库、评分规则与学生授权的统一入口；统计口径与前台一致。</p>
      </div>
      <div class="tag ok">${esc(state.roleName)}视角</div>
    </div>
    ${tabs()}
    ${activeTab === 'overview' ? overview(stats) : activeTab === 'users' ? usersTable(users) : tasksTable(tasks)}
  `;

  animateBars(root);

  root.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      renderAdmin(root);
    });
  });

  root.querySelectorAll('input[data-user]').forEach((input) => {
    input.addEventListener('change', async () => {
      try {
        await api.patch(`/api/admin/users/${input.dataset.user}`, { openToEnterprise: input.checked });
        const user = users.find((item) => item.id === input.dataset.user);
        if (user) user.openToEnterprise = input.checked;
        toast(`${user ? user.name : '学生'}：企业可见已${input.checked ? '开启' : '关闭'}`);
      } catch (err) {
        input.checked = !input.checked;
        toast(err.message, 'error');
      }
    });
  });
}

/** 退出登录后清空缓存，避免切账号看到上一账号的后台数据。 */
export function resetAdminCache() {
  snapshot = null;
  activeTab = 'overview';
}

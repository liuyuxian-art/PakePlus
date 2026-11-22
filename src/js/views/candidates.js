import { api } from '../api.js';
import { esc, levelBadge, toast } from '../dom.js';

/** 企业端候选人列表：只展示学生主动生成分享链接的档案。 */
export async function renderCandidates(root) {
  root.innerHTML = '<div class="loading">正在读取授权候选人…</div>';
  const { items } = await api.get('/api/enterprise/candidates');

  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">企业视角 · 候选人</div>
        <h1>只看学生授权过的能力档案</h1>
        <p class="sub">企业无法直接检索学生信息；只有学生生成分享链接后，才会出现在这里。</p>
      </div>
      <div class="tag ok">${items.length} 位候选人</div>
    </div>
    <div class="grid g3">
      ${items
        .map(
          (item) => `
        <div class="card">
          <div class="section-title">
            <h3>${esc(item.name)}</h3>
            ${levelBadge(item.highestLevel)}
          </div>
          <div class="small muted">${esc(item.school || '学校未填写')} · ${esc(item.major || '专业未填')} · ${esc(item.grade || '')}</div>
          <div class="row" style="border-bottom:0;padding-bottom:0">
            <div class="n">目标岗位</div>
            <div class="small" style="flex:1">${esc(item.jobTitle)}</div>
          </div>
          <div class="row" style="border-bottom:0">
            <div class="n">证据分</div>
            <div class="small" style="flex:1">${item.profileScore == null ? '—' : item.profileScore} · 覆盖 ${item.coverage}%</div>
          </div>
          <div class="row" style="border-bottom:0">
            <div class="n">证据数量</div>
            <div class="small" style="flex:1">${item.evidenceCount} 条</div>
          </div>
          <div class="btn-row">
            <a class="btn btn-ghost btn-sm" href="/share.html?t=${esc(item.shareToken)}" target="_blank" rel="noopener">查看授权档案 →</a>
          </div>
        </div>`
        )
        .join('')}
      ${items.length ? '' : '<div class="card empty" style="grid-column:1/-1">暂无学生授权，邀请学生生成分享链接后再查看。</div>'}
    </div>
  `;

  root.querySelectorAll('a[href^="/share.html"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!window.navigator.onLine) {
        event.preventDefault();
        toast('当前处于离线状态', 'error');
      }
    });
  });
}

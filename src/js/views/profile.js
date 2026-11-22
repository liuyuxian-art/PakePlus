import { api } from '../api.js';
import { animateBars, donutSvg } from '../charts.js';
import { esc, fmtDate, levelBadge, toast } from '../dom.js';
import { state, isStaff } from '../state.js';

const LEVEL_NAMES = { L0: '自评', L1: '标准测试', L2: '真实任务作品', L3: '企业盲评' };

function evidenceCard(evidence) {
  return `
    <div class="ev">
      <div class="ev-head">
        <div>
          ${levelBadge(evidence.level)}
          <b style="margin-left:8px">${esc(evidence.title)}</b>
          <span class="tag line" style="margin-left:8px">${esc(evidence.abilityName)}</span>
        </div>
        <div class="small muted">
          ${evidence.score == null ? '' : `${evidence.score} 分 · `}${fmtDate(evidence.createdAt)}
        </div>
      </div>
      ${evidence.comment ? `<div class="quote">${esc(evidence.comment)}</div>` : ''}
      <div class="file">
        ${evidence.org ? `来源：${esc(evidence.org)} · ` : ''}
        ${evidence.verifiedBy ? '已核验' : evidence.level === 'L0' ? '未核验（不计分）' : '待核验'}
        ${evidence.files && evidence.files.length ? ` · 📎 ${evidence.files.map((f) => esc(f)).join(' · ')}` : ''}
      </div>
    </div>`;
}

function abilityCoverage(summary) {
  return summary.abilityRows
    .map(
      (row) => `
      <div class="row">
        <div class="n">${esc(row.name)}</div>
        <div class="track">
          <div class="base"></div>
          <div class="me" data-w="${row.effectiveScore == null ? 0 : row.effectiveScore}"></div>
          <div class="need" style="left:${row.req}%"></div>
        </div>
        <div class="num">
          ${row.level ? `${row.level} · ${row.rawScore}` : '暂无证据'}
          ${row.level ? `<span class="tag ${row.level === 'L3' ? 'ok' : row.level === 'L0' ? 'gray' : ''}" style="margin-left:4px">${LEVEL_NAMES[row.level]}</span>` : ''}
        </div>
      </div>`
    )
    .join('');
}

function sharePanel(shares) {
  const active = shares.filter((share) => new Date(share.expiresAt) > new Date());
  return `
    <div class="card">
      <div class="section-title">
        <h3>分享与授权</h3>
        <span class="tag ${active.length ? 'ok' : 'gray'}">${active.length} 个有效链接</span>
      </div>
      <p class="small muted">企业通过链接查看授权范围内的证据；联系方式默认隐藏，需学生单独授权。</p>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary btn-sm" id="newShare">生成分享链接</button>
      </div>
      <div id="shareList" style="margin-top:12px">
        ${
          shares.length
            ? shares
                .map(
                  (share) => `
              <div class="share-panel">
                ${esc(location.origin)}${esc(share.url)}
                <div class="small" style="margin-top:6px;color:#6b7280">
                  范围：${share.scope.join(' / ')} · 有效期至 ${fmtDate(share.expiresAt)} · 浏览 ${share.views || 0} 次
                  ${new Date(share.expiresAt) < new Date() ? ' · <b style="color:#c0392b">已过期</b>' : ''}
                </div>
              </div>`
                )
                .join('')
            : '<p class="small muted">尚未生成分享链接。</p>'
        }
      </div>
    </div>`;
}

export async function renderProfile(root) {
  root.innerHTML = '<div class="loading">正在生成能力档案…</div>';
  const data = await api.get('/api/profile/me');
  const { user, jobTitle, summary, next, shares } = data;
  const activeShares = shares.filter((share) => new Date(share.expiresAt) > new Date());
  const levelItems = ['L0', 'L1', 'L2', 'L3'].map((level) => ({ label: level, value: summary.levels[level] || 0 }));

  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 04 · 能力档案</div>
        <h1>不是一份简历，是一条证据链</h1>
        <p class="sub">L0 自评 &lt; L1 标准测试 &lt; L2 真实任务作品 &lt; L3 企业盲评。等级越高，企业越信。</p>
      </div>
      <div class="tag ${activeShares.length ? 'ok' : 'gray'}">已授权链接：${activeShares.length} 个</div>
    </div>

    <div class="card">
      <div class="profile-head">
        <div class="avatar">${esc((user.name || '职').slice(0, 1))}</div>
        <div style="flex:1;min-width:200px">
          <h2>${esc(user.name)}
            <span class="tag gray" style="margin-left:8px">${esc(user.major || '未填写专业')} · ${esc(user.grade || '年级未填')}</span>
          </h2>
          <div class="small muted" style="margin-top:4px">
            ${esc(user.school || '学校未填写')} · 目标岗位：${esc(jobTitle)}
          </div>
        </div>
        <div style="text-align:right">
          <div class="score" style="font-size:38px">${summary.profileScore == null ? '—' : summary.profileScore}<small> 证据分</small></div>
          <div class="small muted">证据覆盖 ${summary.coverage}% · 最高 ${summary.highestLevel}</div>
        </div>
      </div>

      <div class="grid g3" style="gap:12px;grid-template-columns:repeat(4,minmax(0,1fr))">
        ${levelItems
          .map(
            (item) => `
          <div class="stat" style="box-shadow:none">
            <span>${item.label} ${LEVEL_NAMES[item.label]}</span>
            <b>${item.value}</b>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <div class="grid g2" style="margin-top:18px">
      <div>
        <div class="section-title"><h2>证据卡片</h2><span class="tag line">共 ${summary.total} 条</span></div>
        <div class="card" style="padding:16px">
          ${summary.evidences.length ? summary.evidences.map(evidenceCard).join('') : '<div class="empty">还没有证据，完成一次诊断或上传作品即可生成。</div>'}
        </div>
      </div>
      <div>
        <div class="card">
          <div class="section-title"><h3>能力证据覆盖</h3><span class="small muted">单一能力取最高等级</span></div>
          ${abilityCoverage(summary)}
        </div>
        <div class="card">
          <div class="section-title"><h3>下一步</h3>${levelBadge(next.level)}</div>
          <p class="small muted">${esc(next.hint)}</p>
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" id="goPlan">查看成长计划</button>
            ${isStaff() ? '' : '<button class="btn btn-ghost btn-sm" id="goAssess">再做一次诊断</button>'}
          </div>
        </div>
        ${sharePanel(shares)}
      </div>
    </div>
  `;

  animateBars(root);

  const goPlan = root.querySelector('#goPlan');
  if (goPlan) goPlan.addEventListener('click', () => (window.location.hash = '#/plan'));
  const goAssess = root.querySelector('#goAssess');
  if (goAssess) goAssess.addEventListener('click', () => (window.location.hash = '#/assess'));

  const newShare = root.querySelector('#newShare');
  if (newShare) {
    newShare.addEventListener('click', async () => {
      newShare.disabled = true;
      try {
        const { share } = await api.post('/api/shares', { scope: ['L1', 'L2', 'L3'], showContact: false });
        const url = `${location.origin}${share.url}`;
        try {
          await navigator.clipboard.writeText(url);
          toast('分享链接已复制：' + url);
        } catch (err) {
          toast('分享链接已生成：' + url);
        }
        await renderProfile(root);
      } catch (err) {
        toast(err.message, 'error');
        newShare.disabled = false;
      }
    });
  }
}

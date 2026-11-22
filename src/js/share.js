import { esc, fmtDate, levelBadge, toast } from './dom.js';

const LEVEL_NAMES = { L0: '自评', L1: '标准测试', L2: '真实任务作品', L3: '企业盲评' };

async function load(token) {
  const response = await fetch(`/api/share/${encodeURIComponent(token)}`);
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.message || '无法打开该分享链接');
    error.code = payload.code;
    throw error;
  }
  return payload.data;
}

function evidenceCard(evidence) {
  return `
    <div class="ev">
      <div class="ev-head">
        <div>
          ${levelBadge(evidence.level)}
          <b style="margin-left:8px">${esc(evidence.title)}</b>
          <span class="tag line" style="margin-left:8px">${esc(evidence.abilityName)}</span>
        </div>
        <div class="small muted">${evidence.score == null ? '' : `${evidence.score} 分 · `}${fmtDate(evidence.createdAt)}</div>
      </div>
      ${evidence.comment ? `<div class="quote">${esc(evidence.comment)}</div>` : ''}
      <div class="file">${evidence.org ? `来源：${esc(evidence.org)}` : ''}
        ${evidence.files && evidence.files.length ? ` · 📎 ${evidence.files.map((f) => esc(f)).join(' · ')}` : ''}
      </div>
    </div>`;
}

function render(data) {
  const { student, summary, jobTitle, share, scope, contact } = data;
  document.title = `${student.name} 的能力档案 · 职镜`;

  return `
    <div class="card">
      <div class="profile-head">
        <div class="avatar">${esc(student.name.slice(0, 1))}</div>
        <div style="flex:1;min-width:200px">
          <h2>${esc(student.name)} <span class="tag gray">${esc(student.major || '')} · ${esc(student.grade || '')}</span></h2>
          <div class="small muted" style="margin-top:4px">${esc(student.school || '')} · 目标岗位：${esc(jobTitle)}</div>
        </div>
        <div style="text-align:right">
          <div class="score" style="font-size:36px">${summary.profileScore == null ? '—' : summary.profileScore}<small> 证据分</small></div>
          <div class="small muted">覆盖 ${summary.coverage}% · 最高 ${summary.highestLevel}</div>
        </div>
      </div>
      <div class="small muted">
        授权范围：${scope.map((s) => `${s} ${LEVEL_NAMES[s] || ''}`).join(' · ')}
        · 有效期至 ${fmtDate(share.expiresAt)} · 浏览 ${share.views} 次
      </div>
      ${
        contact
          ? `<div class="share-panel">联系方式（学生已授权）：${esc(contact.email || '—')} · ${esc(contact.phone || '—')}</div>`
          : '<div class="share-panel">联系方式已隐藏，需学生单独授权后可见。</div>'
      }
    </div>

    <div class="card">
      <div class="section-title"><h2>能力证据</h2><span class="tag line">共 ${summary.evidences.length} 条</span></div>
      ${
        summary.evidences.length
          ? summary.evidences.map(evidenceCard).join('')
          : '<div class="empty">该学生尚未在授权范围内提供证据。</div>'
      }
    </div>

    <div class="card">
      <div class="section-title"><h2>能力覆盖</h2><span class="small muted">同一能力取最高等级证据</span></div>
      ${summary.abilityRows
        .map(
          (row) => `
        <div class="row">
          <div class="n">${esc(row.name)}</div>
          <div class="track">
            <div class="base"></div>
            <div class="me" style="width:${row.rawScore == null ? 0 : row.rawScore}%"></div>
            <div class="need" style="left:${row.req}%"></div>
          </div>
          <div class="num">${row.level ? `${row.level} · ${row.rawScore}` : '暂无证据'}</div>
        </div>`
        )
        .join('')}
    </div>`;
}

async function main() {
  const view = document.getElementById('shareView');
  const token = new URLSearchParams(location.search).get('t');
  if (!token) {
    view.innerHTML = '<div class="card empty"><h2>链接不完整</h2><p class="sub">请向学生索取完整的分享链接。</p></div>';
    return;
  }
  try {
    const data = await load(token);
    view.innerHTML = render(data);
  } catch (err) {
    view.innerHTML = `<div class="card empty">
      <h2>无法打开该档案</h2>
      <p class="sub">${esc(err.message)}</p>
      <p class="small muted">链接可能已过期、被撤回，或学生关闭了分享授权。</p>
    </div>`;
    toast(err.message, 'error');
  }
}

main();

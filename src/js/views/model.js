import { api } from '../api.js';
import { esc } from '../dom.js';

export async function renderModel(root) {
  root.innerHTML = '<div class="loading">正在读取能力模型…</div>';
  const data = await api.get('/api/model');

  const trust = [
    { label: 'L0 自评', value: data.evidenceWeights.L0, width: 2 },
    { label: 'L1 测试', value: data.evidenceWeights.L1, width: 60 },
    { label: 'L2 作品', value: data.evidenceWeights.L2, width: 80 },
    { label: 'L3 盲评', value: data.evidenceWeights.L3, width: 100 }
  ];

  const calibration = data.calibration;
  root.innerHTML = `
    <div class="screen-head">
      <div>
        <div class="kicker">Step 05 · 能力模型</div>
        <h1>四层结构，一条公式</h1>
        <p class="sub">岗位决定考什么，能力决定怎么分，评价决定打几分，证据决定信几分。</p>
      </div>
      <div class="tag ok">模型 ${esc(data.version)}</div>
    </div>

    <div class="grid g2">
      <div class="card">
        <div class="section-title"><h2>四层结构</h2><span class="tag line">${data.dictionarySize} 个能力词条</span></div>
        <div class="layers">
          ${data.layers
            .map(
              (layer) => `
            <div class="layer">
              <span class="lv">${esc(layer.level)}</span>
              <div>
                <div class="tt">${esc(layer.title)}</div>
                <div class="dd">${esc(layer.desc)}</div>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>
      <div>
        <div class="card">
          <h3>评分公式</h3>
          <div class="formula">${esc(data.formula)}</div>
          <p class="sub">t 为测试分，p 为作品分，w 为岗位解析得到的能力权重；按权重加权，不做简单平均。</p>
        </div>
        <div class="card">
          <h3>证据采信权重</h3>
          <div class="trust">
            ${trust
              .map(
                (item) => `
              <div>
                <span>${esc(item.label)}</span>
                <i style="width:${item.width}%"></i>
                <b>${item.value}</b>
              </div>`
              )
              .join('')}
          </div>
          <p class="sub">同一项能力取最高等级证据；L0 只用于自我认知，不计分。</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        <h3>评分一致性校准</h3>
        <span class="tag ${calibration.status === 'good' ? 'ok' : calibration.status === 'risk' ? 'warn' : 'gray'}">
          ${calibration.n} 组样本
        </span>
      </div>
      <div class="calib">
        <div>
          <div class="value">${calibration.r == null ? '—' : calibration.r}</div>
          <div class="small muted">皮尔逊相关系数 r</div>
        </div>
        <p class="sub" style="flex:1;min-width:220px;margin:0">${esc(calibration.text)}</p>
      </div>
      ${
        calibration.samples.length
          ? `<table class="table" style="margin-top:14px">
              <thead><tr><th>能力项</th><th>平台评分</th><th>第三方评分</th><th>证据等级</th></tr></thead>
              <tbody>${calibration.samples
                .map(
                  (item) => `<tr><td>${esc(item.ability)}</td><td>${item.platform}</td><td>${item.thirdParty}</td><td>${esc(item.level)}</td></tr>`
                )
                .join('')}</tbody>
            </table>`
          : '<p class="small muted" style="margin-top:12px">积累 3 组以上平台评分与企业/教研评分后，系统会自动计算相关系数。</p>'
      }
    </div>
  `;
}

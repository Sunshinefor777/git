const sensors = [
  { name: "3106 回风巷", type: "顶板离层", value: 41.2, unit: "mm", level: "orange" },
  { name: "3106 运输巷", type: "围岩应力", value: 18.6, unit: "MPa", level: "yellow" },
  { name: "断层 F12 北翼", type: "微震能量", value: 3.8, unit: "kJ", level: "orange" },
  { name: "岩溶发育区 K3", type: "光纤应变", value: 1260, unit: "με", level: "blue" },
  { name: "3104 采空区边界", type: "表面位移", value: 22.4, unit: "mm", level: "yellow" }
];

const alerts = [
  { title: "橙色 | 3106 工作面回风巷", body: "顶板离层加速，应力变化率连续 3 个窗口升高。", level: "orange" },
  { title: "黄色 | 断层 F12 北翼", body: "微震频次异常增加，建议专家复核支护参数。", level: "yellow" },
  { title: "蓝色 | 岩溶发育区 K3", body: "光纤应变高于日均值，保持观察。", level: "blue" }
];

const workflows = [
  ["数据上传", "传感器与边缘节点完成实时上传"],
  ["模型研判", "规则阈值、多源融合与时序预测联合判断"],
  ["预警发布", "按蓝黄橙红推送至责任人"],
  ["责任派发", "企业端生成处置任务和时限"],
  ["现场处置", "加密支护、撤人或限制作业"],
  ["反馈消警", "上传处置结果并申请消警"],
  ["复盘优化", "智库端复核样本并更新模型"]
];

const levelText = {
  blue: "关注",
  yellow: "警示",
  orange: "危险",
  red: "紧急"
};

let layer = "stress";
let role = "enterprise";
let tick = 0;
let workflowIndex = 2;
let risk = 0.68;
let live = true;

const mineCanvas = document.querySelector("#mineCanvas");
const mineCtx = mineCanvas.getContext("2d");
const trendCanvas = document.querySelector("#trendCanvas");
const trendCtx = trendCanvas.getContext("2d");

function renderAlerts() {
  const stack = document.querySelector("#alertStack");
  stack.innerHTML = alerts.map(alert => `
    <article class="alert-item ${alert.level}">
      <strong>${alert.title}</strong>
      <span>${alert.body}</span>
    </article>
  `).join("");
}

function renderSensors() {
  const table = document.querySelector("#sensorTable");
  table.innerHTML = sensors.map(sensor => `
    <div class="sensor-row">
      <strong>${sensor.name}</strong>
      <span>${sensor.type}</span>
      <span>${sensor.value.toFixed(sensor.value > 100 ? 0 : 1)} ${sensor.unit}</span>
      <span class="badge ${sensor.level}">${levelText[sensor.level]}</span>
    </div>
  `).join("");
}

function renderWorkflow() {
  const wrap = document.querySelector("#workflowSteps");
  wrap.innerHTML = workflows.map((step, index) => {
    const state = index < workflowIndex ? "done" : index === workflowIndex ? "active" : "";
    return `
      <article class="step ${state}">
        <strong>${index + 1}. ${step[0]}</strong>
        <span>${step[1]}</span>
      </article>
    `;
  }).join("");
}

function updateScores() {
  const pulse = Math.sin(tick / 20) * 0.025;
  const current = Math.max(0.18, Math.min(0.96, risk + pulse));
  document.querySelector("#riskIndex").textContent = current.toFixed(2);
  document.querySelector("#ruleScore").textContent = (current + 0.04).toFixed(2);
  document.querySelector("#fusionScore").textContent = current.toFixed(2);
  document.querySelector("#forecastScore").textContent = (current - 0.06).toFixed(2);
  document.querySelector("#riskBar").style.width = `${Math.round(current * 100)}%`;
  document.querySelector("#highestLevel").textContent = current >= 0.9 ? "红色" : current >= 0.7 ? "橙色" : current >= 0.5 ? "黄色" : "蓝色";
  document.querySelector("#clock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function drawMine() {
  const ctx = mineCtx;
  const w = mineCanvas.width;
  const h = mineCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#11110f");
  gradient.addColorStop(1, "#25221a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, w, h);
  drawStrata(ctx, w, h);
  drawTunnels(ctx);
  drawHeat(ctx);
  drawSensors(ctx);
  drawLegend(ctx);
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 60; x < w; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 50);
    ctx.lineTo(x - 80, h - 40);
    ctx.stroke();
  }
  for (let y = 70; y < h; y += 58) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y - 18);
    ctx.stroke();
  }
}

function drawStrata(ctx, w, h) {
  const colors = ["#3a3428", "#4a4333", "#2f332b", "#47382e"];
  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.moveTo(0, h - 80 - index * 54);
    for (let x = 0; x <= w; x += 90) {
      const y = h - 86 - index * 54 + Math.sin(x / 100 + index) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawTunnels(ctx) {
  const tunnels = [
    [[120, 360], [320, 310], [520, 330], [800, 250]],
    [[180, 430], [380, 390], [600, 410], [860, 350]],
    [[430, 160], [480, 265], [520, 330], [560, 430]]
  ];

  tunnels.forEach((points, index) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = index === 2 ? 26 : 34;
    ctx.strokeStyle = "#070706";
    strokePath(ctx, points);
    ctx.lineWidth = index === 2 ? 18 : 24;
    ctx.strokeStyle = "#5a5242";
    strokePath(ctx, points);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(245,242,233,0.35)";
    strokePath(ctx, points);
  });

  ctx.fillStyle = "#11110f";
  ctx.strokeStyle = "#f28c38";
  ctx.lineWidth = 3;
  ctx.fillRect(675, 213, 110, 48);
  ctx.strokeRect(675, 213, 110, 48);
  ctx.fillStyle = "#f5f2e9";
  ctx.font = "16px Microsoft YaHei";
  ctx.fillText("3106 工作面", 686, 244);
}

function strokePath(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function drawHeat(ctx) {
  const heatColor = layer === "stress" ? "242,140,56" : layer === "displacement" ? "78,161,255" : "233,79,79";
  const spots = [
    [700, 245, 130, 0.72],
    [520, 330, 105, 0.58],
    [360, 388, 88, 0.42],
    [485, 230, 72, 0.35]
  ];

  spots.forEach(([x, y, radius, alpha], index) => {
    const dynamic = Math.sin(tick / 18 + index) * 10;
    const grad = ctx.createRadialGradient(x, y, 5, x, y, radius + dynamic);
    grad.addColorStop(0, `rgba(${heatColor},${alpha})`);
    grad.addColorStop(0.48, `rgba(${heatColor},${alpha * 0.28})`);
    grad.addColorStop(1, `rgba(${heatColor},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius + dynamic, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSensors(ctx) {
  const points = [
    [700, 245, "orange"], [520, 330, "orange"], [370, 390, "yellow"],
    [300, 315, "blue"], [820, 350, "yellow"], [480, 230, "blue"]
  ];
  points.forEach(([x, y, levelName], index) => {
    const colors = { blue: "#4ea1ff", yellow: "#f2c94c", orange: "#f28c38", red: "#e94f4f" };
    const pulse = 4 + Math.sin(tick / 8 + index) * 2;
    ctx.fillStyle = colors[levelName];
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors[levelName];
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 14 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

function drawLegend(ctx) {
  const labels = {
    stress: "图层：应力场热力分布",
    displacement: "图层：位移场变化趋势",
    microseismic: "图层：微震事件能量"
  };
  ctx.fillStyle = "rgba(17,17,15,0.78)";
  ctx.fillRect(24, 24, 250, 72);
  ctx.strokeStyle = "rgba(245,242,233,0.18)";
  ctx.strokeRect(24, 24, 250, 72);
  ctx.fillStyle = "#f5f2e9";
  ctx.font = "18px Microsoft YaHei";
  ctx.fillText(labels[layer], 42, 54);
  ctx.fillStyle = "#aaa598";
  ctx.font = "13px Microsoft YaHei";
  ctx.fillText("风险区域、传感器与采掘空间同步映射", 42, 78);
}

function drawTrend() {
  const ctx = trendCtx;
  const w = trendCanvas.width;
  const h = trendCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#11110f";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(42, y);
    ctx.lineTo(w - 24, y);
    ctx.stroke();
  }

  const values = Array.from({ length: 28 }, (_, i) => {
    const base = 0.42 + i * 0.012;
    return Math.min(0.95, base + Math.sin(i / 2 + tick / 24) * 0.08 + (i > 20 ? 0.1 : 0));
  });

  ctx.beginPath();
  values.forEach((value, i) => {
    const x = 44 + (i / (values.length - 1)) * (w - 78);
    const y = h - 34 - value * (h - 62);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = "#35b5a6";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = "#f28c38";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  const warningY = h - 34 - 0.7 * (h - 62);
  ctx.moveTo(42, warningY);
  ctx.lineTo(w - 24, warningY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#aaa598";
  ctx.font = "13px Microsoft YaHei";
  ctx.fillText("综合风险指数", 44, 24);
  ctx.fillText("橙色阈值 0.70", w - 128, warningY - 8);
}

function updateData() {
  if (!live) return;
  sensors.forEach((sensor, index) => {
    const delta = Math.sin(tick / 12 + index) * (sensor.value > 100 ? 8 : 0.16);
    sensor.value = Math.max(0, sensor.value + delta * 0.04);
  });
  renderSensors();
}

function applyRole(nextRole) {
  role = nextRole;
  const roleCopy = {
    enterprise: ["现场处置", "企业端：关注任务派发、处置反馈和消警确认。"],
    expert: ["专家会诊", "智库端：关注模型解释、样本复核和支护建议。"],
    regulator: ["远程督办", "监管端：关注高风险矿井排名、超时处置和统计分析。"]
  };
  alerts[0].title = `${roleCopy[role][0]} | 3106 工作面回风巷`;
  alerts[0].body = roleCopy[role][1];
  renderAlerts();
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.section}`).scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll(".role-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".role-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    applyRole(button.dataset.role);
  });
});

document.querySelectorAll("[data-layer]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-layer]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    layer = button.dataset.layer;
    drawMine();
  });
});

document.querySelector("#simulateAlert").addEventListener("click", () => {
  risk = risk >= 0.88 ? 0.64 : 0.9;
  alerts.unshift({
    title: risk >= 0.9 ? "红色 | 3106 工作面紧急撤人" : "橙色 | 3106 工作面回风巷",
    body: risk >= 0.9 ? "综合预警指数超过 0.90，触发撤人和停采联动。" : "已恢复橙色风险，继续执行限时处置。",
    level: risk >= 0.9 ? "red" : "orange"
  });
  alerts.splice(4);
  workflowIndex = 2;
  renderAlerts();
  renderWorkflow();
  updateScores();
});

document.querySelector("#completeStep").addEventListener("click", () => {
  workflowIndex = workflowIndex >= workflows.length ? 0 : workflowIndex + 1;
  renderWorkflow();
});

document.querySelector("#liveToggle").addEventListener("change", event => {
  live = event.target.checked;
});

document.querySelector("#windowRange").addEventListener("input", event => {
  document.querySelector("#windowLabel").textContent = `${event.target.value}h`;
  drawTrend();
});

function loop() {
  tick += 1;
  updateData();
  updateScores();
  drawMine();
  drawTrend();
  requestAnimationFrame(loop);
}

renderAlerts();
renderSensors();
renderWorkflow();
applyRole(role);
loop();

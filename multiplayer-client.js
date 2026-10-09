const BACKEND_URL = "https://lntl-multiplayer.thanhnguyenxuan917.workers.dev";
const $ = (selector) => document.querySelector(selector);
const modeToggle = $("#multiplayer-mode");
const controls = $("#multiplayer-controls");
const nicknameInput = $("#mp-nickname");
const roomCodeInput = $("#mp-room-code");
const statusNode = $("#mp-status");
const roomInfo = $("#mp-room-info");
const joinRow = $("#mp-join-row");
const disconnectButton = $("#mp-disconnect");
const scoreboard = $("#team-scoreboard");
const teamsPanel = $("#mp-teams");
const teamStatus = $("#mp-team-status");
function updateScoreboard(teamKills = {}) {
  for (let team = 1; team <= 4; team++) {
    const score = $("#" + "team-score-" + team);
    if (score) score.textContent = String(Number(teamKills[team]) || 0);
  }
}
function renderTeamPanel(players = []) {
  if (!teamsPanel) return;
  teamsPanel.hidden = !connected || players.length === 0;
  const me = players.find((player) => player.id === myPlayerId);
  for (let team = 1; team <= 4; team++) {
    const members = players.filter((player) => Number(player.team) === team);
    const card = teamsPanel.querySelector('[data-team="' + team + '"]');
    const count = $("#" + "mp-team-" + team);
    const names = $("#" + "mp-team-" + team + "-names");
    if (count) count.textContent = members.length + "/3";
    if (names) names.textContent = members.length ? members.map((p) => p.nickname).join(" · ") : "Trống";
    if (card) {
      card.classList.toggle("selected", Number(me?.team) === team);
      card.classList.toggle("full", members.length >= 3 && Number(me?.team) !== team);
      card.disabled = members.length >= 3 && Number(me?.team) !== team;
    }
  }
  if (teamStatus) {
    teamStatus.textContent = me?.team
      ? "Bạn đang ở PHE " + me.team + ". Có thể đổi phe trước khi sẵn sàng."
      : "Chọn một phe để tham gia.";
  }
}
function showScoreboard(show) {
  if (scoreboard) scoreboard.hidden = !show;
}
const enterButton = $("#enter");
let socket = null;
let myPlayerId = null;
let activeRoom = null;
let connected = false;
let lastSentState = null;
let lastStateSentAt = 0;

nicknameInput.value = localStorage.getItem("lntl-mp-nickname") || "";
function updateEnterButton() {
  if (modeToggle.checked) {
    const me = activeRoom?.players?.find((player) => player.id === myPlayerId);
    enterButton.textContent = me?.ready ? "ĐÃ SẴN SÀNG ✓" : "SẴN SÀNG";
  } else {
    enterButton.innerHTML = "BẮT ĐẦU TUẦN TRA &nbsp; ↗";
  }
}
modeToggle.addEventListener("change", () => {
  controls.hidden = !modeToggle.checked;
  updateEnterButton();
  if (modeToggle.checked) {
    $("#bot-training").checked = false;
    $("#bot-training").disabled = true;
    $("#bot-mode-label").textContent = "KHÔNG";
  } else {
    $("#bot-training").disabled = false;
    disconnect();
  }
});

$("#mp-join-toggle").addEventListener("click", () => { joinRow.hidden = !joinRow.hidden; });
$("#mp-room-code").addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
$("#mp-create").addEventListener("click", async () => {
  try {
    const nickname = getNickname();
    setStatus("Đang tạo phòng...");
    const response = await fetch(BACKEND_URL + "/api/rooms", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không tạo được phòng.");
    roomCodeInput.value = data.code;
    await connect(data.code, nickname);
  } catch (error) { setStatus(error.message || "Không tạo được phòng.", true); }
});
$("#mp-join").addEventListener("click", async () => {
  try {
    const nickname = getNickname();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("Mã phòng phải gồm 6 ký tự.");
    setStatus("Đang tham gia phòng...");
    await connect(code, nickname);
  } catch (error) { setStatus(error.message || "Không tham gia được phòng.", true); }
});
function getNickname() {
  const nickname = nicknameInput.value.trim().replace(/\s+/g, " ").slice(0, 20);
  if (!nickname) throw new Error("Nhập nickname từ 1–20 ký tự.");
  localStorage.setItem("lntl-mp-nickname", nickname);
  return nickname;
}
function setStatus(message, error = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("mp-error", error);
}
function connect(code, nickname) {
  disconnect();
  lastSentState = null;
  lastStateSentAt = 0;
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + "/api/rooms/" + code + "/ws");
    url.protocol = "wss:";
    url.searchParams.set("nickname", nickname);
    const candidate = new WebSocket(url);
    let welcomed = false;
    candidate.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === "welcome") {
        welcomed = true; connected = true; socket = candidate;
        myPlayerId = message.playerId; activeRoom = message.room;
        showScoreboard(true);
        updateScoreboard(activeRoom.teamKills || {});
        renderTeamPanel(activeRoom.players || []);
        roomInfo.hidden = false; disconnectButton.hidden = false;
        setStatus("Đã kết nối phòng " + code + ". Nhấn BẮT ĐẦU TUẦN TRA để vào trận.");
        updateRoomInfo();
        window.dispatchEvent(new CustomEvent("lntl:multiplayer", { detail: { connected: true, playerId: myPlayerId, room: activeRoom } }));
        // Hydrate remote models from the server snapshot immediately, even before they move.
        for (const player of activeRoom.players || []) {
          if (player.id !== myPlayerId && player.state) {
            window.dispatchEvent(new CustomEvent("lntl:remote-state", {
              detail: { type: "player:state", playerId: player.id, nickname: player.nickname, team: player.team, state: player.state }
            }));
          }
        }
        resolve();
      } else if (message.type === "room:update") {
        activeRoom = message.room; updateRoomInfo();
        renderTeamPanel(activeRoom.players || []);
        const self = activeRoom.players?.find((player) => player.id === myPlayerId);
        if (self?.state) {
          window.dispatchEvent(new CustomEvent("lntl:multiplayer-spawn", { detail: { state: self.state, team: self.team } }));
        }
        for (const player of activeRoom.players || []) {
          if (player.id !== myPlayerId && player.state) {
            window.dispatchEvent(new CustomEvent("lntl:remote-state", {
              detail: { type: "player:state", playerId: player.id, nickname: player.nickname, team: player.team, state: player.state }
            }));
          }
        }
      } else if (message.type === "player:damage") {
        updateScoreboard(message.teamKills || {});
        window.dispatchEvent(new CustomEvent("lntl:player-damage", { detail: message }));
      } else if (message.type === "player:respawn") {
        window.dispatchEvent(new CustomEvent("lntl:player-respawn", { detail: message }));
      } else if (message.type === "score:update") {
        updateScoreboard(message.teamKills || {});
      } else if (message.type === "game:start") {
        setStatus("Tất cả đã sẵn sàng. Đang vào trận!");
        window.dispatchEvent(new CustomEvent("lntl:game-start", { detail: message }));
      } else if (message.type === "player:state") {
        window.dispatchEvent(new CustomEvent("lntl:remote-state", { detail: message }));
      } else if (message.type === "player:left") {
        window.dispatchEvent(new CustomEvent("lntl:remote-left", { detail: message }));
      } else if (message.type === "error") setStatus(message.error || "Lỗi backend.", true);
    });
    candidate.addEventListener("error", () => { if (!welcomed) reject(new Error("Không kết nối được backend. Kiểm tra Worker đã deploy chưa.")); });
    candidate.addEventListener("close", () => {
      if (socket === candidate || !welcomed) {
        connected = false; socket = null;
        showScoreboard(false); updateScoreboard({}); activeRoom = null; myPlayerId = null;
        roomInfo.hidden = true; disconnectButton.hidden = true;
        window.dispatchEvent(new CustomEvent("lntl:multiplayer", { detail: { connected: false } }));
        if (welcomed) setStatus("Đã ngắt kết nối.");
      }
    });
  });
}
function updateRoomInfo() {
  const players = activeRoom?.players || [];
  const readyCount = players.filter((player) => player.ready).length;
  roomInfo.textContent = "MÃ PHÒNG: " + (activeRoom?.code || "—") + " · NGƯỜI CHƠI: " + players.length + "/" + (activeRoom?.maxPlayers || 12) + " · SẴN SÀNG: " + readyCount + "/" + players.length + " · " + players.map(p => p.nickname + " [PHE " + (p.team || "?") + "]" + (p.ready ? " ✓" : "")).join(", ");
  updateEnterButton();
  if (modeToggle.checked && connected && players.length > 0) {
    setStatus(readyCount === players.length && players.length >= 2
      ? "Tất cả đã sẵn sàng. Đang bắt đầu trận..."
      : "Đã sẵn sàng " + readyCount + "/" + players.length + ". Chờ các thành viên còn lại.");
  }
}
function disconnect() {
  if (socket) { const old = socket; socket = null; old.close(1000, "Leave room"); }
  connected = false; activeRoom = null; myPlayerId = null;
  lastSentState = null;
  lastStateSentAt = 0;
  if (teamsPanel) teamsPanel.hidden = true;
  window.dispatchEvent(new CustomEvent("lntl:multiplayer", { detail: { connected: false } }));
}
$("#mp-disconnect").addEventListener("click", disconnect);
document.querySelectorAll(".mp-team-card").forEach((button) => {
  button.addEventListener("click", () => {
    const team = Number(button.dataset.team);
    if (!Number.isInteger(team)) return;
    if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "team:select", team }));
  });
});
window.addEventListener("lntl:ready-toggle", () => {
  if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return;
  const me = activeRoom?.players?.find((player) => player.id === myPlayerId);
  socket.send(JSON.stringify({ type: "ready", ready: !me?.ready }));
});
window.addEventListener('lntl:player-hit', (event) => {
  if (
    !connected ||
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {
    console.warn(
      '[LNTL PvP] Socket not ready'
    );
    return;
  }

  const {
    victimId,
    bodyPart,
    distance
  } = event.detail || {};

  console.log(
    '[LNTL PvP] HIT',
    {
      attacker: myPlayerId,
      victim: victimId,
      bodyPart,
      distance
    }
  );

  if (!victimId) {
    console.warn(
      '[LNTL PvP] Missing victimId'
    );
    return;
  }

  socket.send(
    JSON.stringify({
      type: "player:hit",
      victimId,
      bodyPart: typeof bodyPart === "string" ? bodyPart : "THÂN",
      distance: Number.isFinite(Number(distance)) ? Number(distance) : 0
    })
  );
});
window.addEventListener("lntl:send-state", (event) => {
  if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return;
  const state = event.detail || {};
  const nextState = {
    x: Number(state.x) || 0,
    y: Number(state.y) || 0,
    z: Number(state.z) || 0,
    yaw: Number(state.yaw) || 0,
    pitch: Number(state.pitch) || 0,
    lean: Number(state.lean) || 0,
    weaponSlot: state.weaponSlot || "primary",
    weaponName: state.weaponName || "",
    weaponCategory: state.weaponCategory || "",
    meleeType: state.meleeType || "",
    firing: Boolean(state.firing),
    aiming: Boolean(state.aiming),
    moving: Boolean(state.moving),
    crouched: Boolean(state.crouched),
  };

  const now = performance.now();
  const previous = lastSentState;
  const moved = !previous || Math.hypot(
    nextState.x - previous.x,
    nextState.y - previous.y,
    nextState.z - previous.z
  ) >= 0.04;
  const looked = !previous ||
    Math.abs(nextState.yaw - previous.yaw) >= 0.025 ||
    Math.abs(nextState.pitch - previous.pitch) >= 0.025 ||
    Math.abs(nextState.lean - previous.lean) >= 0.025;
  const actionChanged = !previous ||
    nextState.weaponSlot !== previous.weaponSlot ||
    nextState.weaponName !== previous.weaponName ||
    nextState.weaponCategory !== previous.weaponCategory ||
    nextState.meleeType !== previous.meleeType ||
    nextState.firing !== previous.firing ||
    nextState.aiming !== previous.aiming ||
    nextState.moving !== previous.moving ||
    nextState.crouched !== previous.crouched;
  const heartbeatDue = now - lastStateSentAt >= 500;

  // Skip duplicate idle snapshots, but send meaningful changes immediately.
  // The 500 ms heartbeat lets peers recover from a dropped state packet.
  if (!moved && !looked && !actionChanged && !heartbeatDue) return;

  lastSentState = nextState;
  lastStateSentAt = now;
  socket.send(JSON.stringify({
    type: "player:state",
    state: { ...nextState, clientAt: now }
  }));
});
window.lntlMultiplayer = { isConnected: () => connected, getPlayerId: () => myPlayerId };

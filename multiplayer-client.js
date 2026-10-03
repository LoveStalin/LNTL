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
const enterButton = $("#enter");
let socket = null;
let myPlayerId = null;
let activeRoom = null;
let connected = false;

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
        for (const player of activeRoom.players || []) {
          if (player.id !== myPlayerId && player.state) {
            window.dispatchEvent(new CustomEvent("lntl:remote-state", {
              detail: { type: "player:state", playerId: player.id, nickname: player.nickname, state: player.state }
            }));
          }
        }
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
        connected = false; socket = null; activeRoom = null; myPlayerId = null;
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
  window.dispatchEvent(new CustomEvent("lntl:multiplayer", { detail: { connected: false } }));
}
$("#mp-disconnect").addEventListener("click", disconnect);
window.addEventListener("lntl:ready-toggle", () => {
  if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return;
  const me = activeRoom?.players?.find((player) => player.id === myPlayerId);
  socket.send(JSON.stringify({ type: "ready", ready: !me?.ready }));
});
window.addEventListener("lntl:send-state", (event) => {
  if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "player:state", state: event.detail }));
});
window.lntlMultiplayer = { isConnected: () => connected, getPlayerId: () => myPlayerId };

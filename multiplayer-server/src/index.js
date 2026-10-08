const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS = 12;

const MAX_TEAM_SIZE = 3;
// Three.js uses forward = (-sin(yaw), 0, -cos(yaw)).
  // Each faction starts behind its house and faces toward the center of the map.
  const FACTION_BASES = [
    { team: 1, yaw: -Math.PI / 2, slots: [
      { x: -20.2, y: 0.1, z: -2.2 }, { x: -20.2, y: 0.1, z: 0 }, { x: -20.2, y: 0.1, z: 2.2 },
    ] },
    { team: 2, yaw: Math.PI / 2, slots: [
      { x: 20.2, y: 0.1, z: -2.2 }, { x: 20.2, y: 0.1, z: 0 }, { x: 20.2, y: 0.1, z: 2.2 },
    ] },
    { team: 3, yaw: Math.PI, slots: [
      { x: -2.2, y: 0.1, z: -20.2 }, { x: 0, y: 0.1, z: -20.2 }, { x: 2.2, y: 0.1, z: -20.2 },
    ] },
    { team: 4, yaw: 0, slots: [
      { x: -2.2, y: 0.1, z: 20.2 }, { x: 0, y: 0.1, z: 20.2 }, { x: 2.2, y: 0.1, z: 20.2 },
    ] },
  ];

const WEAPON_DAMAGE = {
  CARBINE: 24, S1897: 38, S686: 46, UMP45: 20, UZI: 15, M416: 25, AKM: 34,
  M24: 82, Kar98k: 72, AWM: 100, M249: 20, PKM: 22,
  P1911: 28, P92: 23, P18C: 16, "Desert Eagle": 75, "Sawed-off": 75,
  Dao: 50, "Búa": 60, Katana: 78, "Chảo": 55,
};

function getSpawnForTeam(room, team) {
  const base = FACTION_BASES.find((entry) => entry.team === team);
  if (!base) return null;
  const members = room.players.filter((entry) => entry.team === team);
  if (members.length >= MAX_TEAM_SIZE) return null;
  const used = new Set(members.map((entry) => entry.spawnSlot).filter(Number.isInteger));
  const slotIndex = base.slots.findIndex((_, index) => !used.has(index));
  if (slotIndex < 0) return null;
  return { ...base.slots[slotIndex], yaw: base.yaw, spawnSlot: slotIndex };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "access-control-max-age": "86400",
  };
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function makeRoomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join("");
}

function validRoomCode(code) {
  return new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(code);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return withCors(json({ ok: true, service: "lntl-multiplayer", phase: "room-lobby" }));
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return withCors(json({ error: "Invalid JSON body." }, 400));
      }

      const nickname = String(body?.nickname ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
      if (nickname.length < 1) {
        return withCors(json({ error: "Enter a nickname (1–20 characters)." }, 400));
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = makeRoomCode();
        const id = env.ROOMS.idFromName(code);
        const stub = env.ROOMS.get(id);
        const response = await stub.fetch("https://room.internal/internal/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (response.status === 201) {
          return withCors(json({ code, nickname, maxPlayers: MAX_PLAYERS }, 201));
        }
        if (response.status !== 409) {
          return withCors(json({ error: "Could not create room. Try again." }, 500));
        }
      }

      return withCors(json({ error: "Could not allocate a unique room code. Try again." }, 503));
    }

    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/ws$/);
    if (match && request.method === "GET") {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return withCors(json({ error: "WebSocket upgrade required." }, 426));
      }

      const code = match[1];
      if (!validRoomCode(code)) {
        return withCors(json({ error: "Invalid room code." }, 400));
      }

      const nickname = (url.searchParams.get("nickname") ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 20);
      if (!nickname) {
        return withCors(json({ error: "Enter a nickname (1–20 characters)." }, 400));
      }

      const id = env.ROOMS.idFromName(code);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    return withCors(json({ error: "Not found." }, 404));
  },
};

export class RoomDurableObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/internal/create" && request.method === "POST") {
      const { code } = await request.json().catch(() => ({}));
      if (!validRoomCode(code)) return json({ error: "Invalid room code." }, 400);

      const existing = await this.ctx.storage.get("room");
      if (existing) return json({ error: "Room already exists." }, 409);

      const room = {
        code,
        createdAt: Date.now(),
        players: [],
        teamKills: { 1: 0, 2: 0, 3: 0, 4: 0 },
      };
      await this.ctx.storage.put("room", room);
      return json({ ok: true }, 201);
    }

    if (url.pathname.endsWith("/ws") && request.method === "GET") {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return json({ error: "WebSocket upgrade required." }, 426);
      }

      const room = await this.ctx.storage.get("room");
      if (!room) return json({ error: "Room not found. Check the code." }, 404);

      const nickname = (url.searchParams.get("nickname") ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
      if (!nickname) return json({ error: "Enter a nickname." }, 400);

      const activeSockets = this.ctx.getWebSockets();
      if (activeSockets.length >= MAX_PLAYERS) {
        return json({ error: `Room is full (${MAX_PLAYERS}/${MAX_PLAYERS} players).` }, 409);
      }

      // A new arrival starts a fresh lobby countdown; everyone must ready up again.
      room.gameStarted = false;
      for (const existingPlayer of room.players) existingPlayer.ready = false;

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const playerId = crypto.randomUUID();
      const teamCounts = FACTION_BASES.map((base) => ({
        team: base.team,
        count: room.players.filter((entry) => entry.team === base.team).length,
      }));
      const minCount = Math.min(...teamCounts.map((entry) => entry.count));
      const candidates = teamCounts.filter((entry) => entry.count === minCount && entry.count < MAX_TEAM_SIZE);
      if (!candidates.length) return json({ error: "All factions are full." }, 409);
      const selectedTeam = candidates[Math.floor(Math.random() * candidates.length)].team;
      const spawn = getSpawnForTeam(room, selectedTeam);
      if (!spawn) return json({ error: "No spawn slot available for this faction." }, 409);

      const player = {
        id: playerId,
        nickname,
        team: selectedTeam,
        spawnSlot: spawn.spawnSlot,
        spawn: { x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw, pitch: -0.025 },
        health: 100,
        alive: true,
        ready: false,
        joinedAt: Date.now(),
        state: { x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw, pitch: -0.025, at: Date.now(), weaponSlot: "primary", weaponName: "CARBINE", weaponCategory: "Rifles", meleeType: "", firing: false, aiming: false, moving: false, crouched: false },
      };

      server.serializeAttachment({ playerId });
      this.ctx.acceptWebSocket(server);

      room.players.push(player);
      await this.ctx.storage.put("room", room);
      server.send(JSON.stringify({
        type: "welcome",
        playerId,
        room: this.publicRoom(room),
      }));
      this.broadcast(room, { type: "room:update", room: this.publicRoom(room) });

      return new Response(null, { status: 101, webSocket: client });
    }

    return json({ error: "Not found." }, 404);
  }

  publicRoom(room) {
    return {
      code: room.code,
      createdAt: room.createdAt,
      maxPlayers: MAX_PLAYERS,
      players: room.players.map(({ id, nickname, team, ready, state, health, alive }) => ({ id, nickname, team, ready, state, health: health ?? 100, alive: alive ?? true })),
      teamKills: room.teamKills || { 1: 0, 2: 0, 3: 0, 4: 0 },
      hostId: room.players[0]?.id ?? null,
    };
  }

  broadcast(room, payload) {
    const message = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(message);
      } catch {
        // A closing connection will be removed by webSocketClose/webSocketError.
      }
    }
  }

  async webSocketMessage(socket, rawMessage) {
    let message;
    try {
      message = JSON.parse(rawMessage);
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "Invalid message format." }));
      return;
    }

    const attachment = socket.deserializeAttachment();
    const playerId = attachment?.playerId;
    if (!playerId) return;

    const room = await this.ctx.storage.get("room");
    if (!room) return;

    if (message.type === "team:select" && Number.isInteger(message.team)) {
      if (room.gameStarted) return;
      const requestedTeam = Number(message.team);
      if (requestedTeam < 1 || requestedTeam > 4) return;
      const player = room.players.find((entry) => entry.id === playerId);
      if (!player) return;
      if (player.team === requestedTeam) return;

      const spawn = getSpawnForTeam(room, requestedTeam);
      if (!spawn) {
        socket.send(JSON.stringify({ type: "error", error: "Phe này đã đủ 3 người." }));
        return;
      }

      player.team = requestedTeam;
      player.spawnSlot = spawn.spawnSlot;
      player.spawn = { x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw, pitch: -0.025 };
      player.state = { ...player.spawn, at: Date.now(), weaponSlot: player.state?.weaponSlot || "primary", weaponName: player.state?.weaponName || "CARBINE", weaponCategory: player.state?.weaponCategory || "Rifles", meleeType: player.state?.meleeType || "", firing: false, aiming: false, moving: false, crouched: false };
      player.ready = false;

      await this.ctx.storage.put("room", room);
      this.broadcast(room, { type: "room:update", room: this.publicRoom(room) });
      return;
    }

    if (message.type === "ready" && typeof message.ready === "boolean") {
      const player = room.players.find((entry) => entry.id === playerId);
      if (!player) return;
      player.ready = message.ready;
      if (!message.ready) room.gameStarted = false;
      await this.ctx.storage.put("room", room);
      this.broadcast(room, { type: "room:update", room: this.publicRoom(room) });

      const allReady = room.players.length >= 2 && room.players.every((entry) => entry.ready);
      if (allReady && !room.gameStarted) {
        room.gameStarted = true;
        await this.ctx.storage.put("room", room);
        this.broadcast(room, { type: "game:start", room: this.publicRoom(room), at: Date.now() });
      }
      return;
    }

    if (message.type === "player:hit" && typeof message.victimId === "string") {
      const attacker = room.players.find((entry) => entry.id === playerId);
      const victim = room.players.find((entry) => entry.id === message.victimId);

      if (!attacker || !victim) return;
      if (attacker.id === victim.id) return;
      if (attacker.team === victim.team) return;
      if (attacker.alive === false || victim.alive === false) return;

      const weaponName = String(attacker.state?.weaponName || "CARBINE");
      const weaponSlot = attacker.state?.weaponSlot || "primary";
      const damage = Math.max(1, Math.min(100, Number(WEAPON_DAMAGE[weaponName]) || 24));

      // Server is authoritative: the client does NOT decide who the victim is beyond the target ID,
      // and it cannot inflate damage by sending a larger number.
      const previousHealth = Number(victim.health ?? 100);
      victim.health = Math.max(0, previousHealth - damage);
      const killed = victim.health === 0;

      if (killed) {
        victim.alive = false;
        room.teamKills ||= { 1: 0, 2: 0, 3: 0, 4: 0 };
        room.teamKills[attacker.team] = (room.teamKills[attacker.team] || 0) + 1;
      }

      await this.ctx.storage.put("room", room);
      this.broadcast(room, {
        type: "player:damage",
        attackerId: attacker.id,
        attackerNickname: attacker.nickname,
        victimId: victim.id,
        attackerTeam: attacker.team,
        victimTeam: victim.team,
        weaponSlot,
        weaponName,
        damage,
        previousHealth,
        health: victim.health,
        alive: victim.alive,
        teamKills: room.teamKills || { 1: 0, 2: 0, 3: 0, 4: 0 },
      });

      if (killed) {
        const victimId = victim.id;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const latest = await this.ctx.storage.get("room");
        const respawning = latest?.players?.find((entry) => entry.id === victimId);
        if (respawning && respawning.alive === false) {
          respawning.health = 100;
          respawning.alive = true;
          respawning.state = {
            ...(respawning.spawn || {}),
            at: Date.now(),
            weaponSlot: respawning.state?.weaponSlot || "primary",
            weaponName: respawning.state?.weaponName || "CARBINE",
            weaponCategory: respawning.state?.weaponCategory || "Rifles",
            meleeType: respawning.state?.meleeType || "",
            firing: false,
            aiming: false,
            moving: false,
            crouched: false
          };
          await this.ctx.storage.put("room", latest);
          this.broadcast(latest, { type: "player:respawn", player: { id: victimId, health: 100, alive: true, state: respawning.state } });
          this.broadcast(latest, { type: "room:update", room: this.publicRoom(latest) });
        }
      }
      return;
    }

    // Legacy client-side kill messages are intentionally ignored.
    // Kills are awarded only inside the authoritative player:hit path above.

    if (message.type === "player:state" && message.state && typeof message.state === "object") {
      const state = message.state;
      const x = Number(state.x);
      const y = Number(state.y);
      const z = Number(state.z);
      const yaw = Number(state.yaw);
      const pitch = Number(state.pitch);
       const lean = Number(state.lean ?? 0);
      if (![x, y, z, yaw, pitch, lean].every(Number.isFinite)) return;
      // Basic sanity bounds
      if ( 
      Math.abs(x) > 30 || 
      Math.abs(z) > 30 ||
      y < -2 || 
      y > 12
       ) { 
        return;
       }
      const player = room.players.find(
        (entry) => entry.id === playerId
      );
      if (!player) return;
      // player.state = { x, y, z, yaw, pitch, at: Date.now() };
      // await this.ctx.storage.put("room", room);
      // this.broadcast(room, {
      // type: "player:state",
       // playerId,
       // nickname: player.nickname,
       // team: player.team,
       // state: player.state,
     // });
     // return;
     const weaponSlot =
        state.weaponSlot === "primary" ||
        state.weaponSlot === "pistol" ||
        state.weaponSlot === "melee"
          ? state.weaponSlot
          : "primary";

    const weaponName =
      typeof state.weaponName === "string"
         ? state.weaponName.slice(0, 40)
         : "";
    
    const weaponCategory = 
      typeof state.weaponCategory === "string"
         ? state.weaponCategory.slice(0, 40)
         : "";
        
     const meleeType = 
       typeof state.meleeType === "string"
          ? state.meleeType.slice(0, 20)
          : "";
     const serverAt = Date.now();

     player.state = {
      x,
      y,
      z,
      yaw,
      pitch,
      lean,

      weaponSlot,
      weaponName,
      weaponCategory,
      meleeType,

      firing: Boolean(state.firing),
      aiming: Boolean(state.aiming),
      moving: Boolean(state.moving),
      crouched: Boolean(state.crouched),

      at: serverAt
     };

     await this.ctx.storage.put("room", room);

     this.broadcast(room, {
      type: "player:state",

      playerId: player.id,
      nickname: player.nickname,
      team: player.team,
      state: player.state,
      });
      return;
    }

    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", at: Date.now() }));
      return;
    }
    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", at: Date.now() }));
      return;
    }

    socket.send(JSON.stringify({ type: "error", error: "Unsupported message type." }));
  }

  async webSocketClose(socket) {
    await this.removeSocketPlayer(socket);
  }

  async webSocketError(socket) {
    await this.removeSocketPlayer(socket);
  }

  async removeSocketPlayer(socket) {
    const attachment = socket.deserializeAttachment();
    const playerId = attachment?.playerId;
    if (!playerId) return;

    const room = await this.ctx.storage.get("room");
    if (!room) return;

    const before = room.players.length;
    room.players = room.players.filter((player) => player.id !== playerId);
    if (room.players.length !== before) {
      await this.ctx.storage.put("room", room);
      this.broadcast(room, { type: "player:left", playerId });
      this.broadcast(room, { type: "room:update", room: this.publicRoom(room) });
    }
  }
}

export type RoomEntityType = "whiteboard" | "browser";
export type RoomEntityLayoutMode = "hidden" | "docked" | "expanded";

export interface RoomEntityAccess {
  canView: boolean;
  canInteract: boolean;
}

export interface RoomEntityState {
  entityId: string;
  entityType: RoomEntityType;
  displayName: string;
  commandTarget: string;
  enabled: boolean;
  layoutMode: RoomEntityLayoutMode;
  available: boolean;
  accessByEmail: Record<string, RoomEntityAccess>;
  updatedAt: number;
}

type RoomEntityRegistry = Record<RoomEntityType, RoomEntityState>;

const roomEntities = new Map<string, RoomEntityRegistry>();

function now() {
  return Date.now();
}

function createEntity(
  entityType: RoomEntityType,
  available: boolean
): RoomEntityState {
  return {
    entityId: `entity-${entityType}`,
    entityType,
    displayName: entityType === "whiteboard" ? "Whiteboard" : "Browser",
    commandTarget: entityType === "whiteboard" ? "@whiteboard" : "@browser",
    enabled: false,
    layoutMode: "hidden",
    available,
    accessByEmail: {},
    updatedAt: now(),
  };
}

function createRegistry(browserAvailable: boolean): RoomEntityRegistry {
  return {
    whiteboard: createEntity("whiteboard", true),
    browser: createEntity("browser", browserAvailable),
  };
}

export function getRoomEntityRegistry(
  meetingId: string,
  browserAvailable: boolean
): RoomEntityRegistry {
  let registry = roomEntities.get(meetingId);
  if (!registry) {
    registry = createRegistry(browserAvailable);
    roomEntities.set(meetingId, registry);
  } else {
    registry.browser.available = browserAvailable;
    if (!browserAvailable) {
      registry.browser.enabled = false;
      registry.browser.layoutMode = "hidden";
    }
  }
  return registry;
}

export function listRoomEntities(
  meetingId: string,
  browserAvailable: boolean
): RoomEntityState[] {
  const registry = getRoomEntityRegistry(meetingId, browserAvailable);
  return [registry.whiteboard, registry.browser].map(cloneEntity);
}

export function getRoomEntity(
  meetingId: string,
  entityType: RoomEntityType,
  browserAvailable: boolean
): RoomEntityState {
  return getRoomEntityRegistry(meetingId, browserAvailable)[entityType];
}

export function setRoomEntityEnabled(
  meetingId: string,
  entityType: RoomEntityType,
  enabled: boolean,
  browserAvailable: boolean
): RoomEntityState {
  const entity = getRoomEntity(meetingId, entityType, browserAvailable);
  if (!entity.available && entityType === "browser") {
    throw new Error("Browser entity is not available for this deployment");
  }
  entity.enabled = enabled;
  entity.layoutMode = enabled ? "docked" : "hidden";
  entity.updatedAt = now();
  return cloneEntity(entity);
}

export function setRoomEntityLayoutMode(
  meetingId: string,
  entityType: RoomEntityType,
  layoutMode: RoomEntityLayoutMode,
  browserAvailable: boolean
): RoomEntityState {
  const entity = getRoomEntity(meetingId, entityType, browserAvailable);
  if (!entity.enabled && layoutMode !== "hidden") {
    throw new Error(`${entity.displayName} is not enabled in this room`);
  }
  entity.layoutMode = layoutMode;
  entity.updatedAt = now();
  return cloneEntity(entity);
}

export function setRoomEntityAccess(
  meetingId: string,
  entityType: RoomEntityType,
  email: string,
  access: Partial<RoomEntityAccess>,
  browserAvailable: boolean
): RoomEntityState {
  const entity = getRoomEntity(meetingId, entityType, browserAvailable);
  const key = String(email || "").trim().toLowerCase();
  if (!key) throw new Error("Participant email is required");
  const current = entity.accessByEmail[key] || { canView: true, canInteract: true };
  entity.accessByEmail[key] = {
    canView: access.canView ?? current.canView,
    canInteract: access.canInteract ?? current.canInteract,
  };
  if (!entity.accessByEmail[key].canView) {
    entity.accessByEmail[key].canInteract = false;
  }
  entity.updatedAt = now();
  return cloneEntity(entity);
}

export function getEffectiveRoomEntityAccess(
  entity: RoomEntityState,
  email: string,
  isAdmin: boolean
): RoomEntityAccess {
  if (isAdmin) return { canView: true, canInteract: true };
  const key = String(email || "").trim().toLowerCase();
  const access = (key && entity.accessByEmail[key]) || null;
  return {
    canView: access ? !!access.canView : true,
    canInteract: access ? !!access.canInteract : true,
  };
}

function cloneEntity(entity: RoomEntityState): RoomEntityState {
  return {
    ...entity,
    accessByEmail: { ...entity.accessByEmail },
  };
}

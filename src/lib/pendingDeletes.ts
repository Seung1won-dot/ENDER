/**
 * 삭제 유예(되돌리기 5초) 중인 항목 id.
 * 그 사이 재조회나 Realtime 이 행을 되살리지 않도록 useItems 가 참조한다.
 */
export const pendingDeletes = new Set<string>()

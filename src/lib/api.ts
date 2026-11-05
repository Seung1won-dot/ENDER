import type { ItemPatch, ItemRow } from './items'

/**
 * 상자 화면이 쓰는 저장소 동작. 실제 앱은 Supabase 구현(supabaseApi.ts)을,
 * 개발용 미리보기 페이지는 메모리 구현을 넘긴다. 이 파일은 supabase 를 import 하지 않는다.
 */
export interface ChestApi {
  addText(text: string, opts: { source: string; expiresAt: string | null }): Promise<ItemRow>
  addFile(file: File, opts: { source: string; expiresAt: string | null }): Promise<ItemRow>
  update(id: string, patch: ItemPatch): Promise<ItemRow>
  remove(item: ItemRow): Promise<void>
  /** 미리보기용 서명 주소 (1시간) */
  viewUrl(path: string): Promise<string>
  /** 받으면 파일 이름으로 저장되는 서명 주소 */
  downloadUrl(path: string, fileName: string): Promise<string>
}

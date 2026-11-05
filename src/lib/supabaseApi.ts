import type { ChestApi } from './api'
import { addFileItem, addTextItem, deleteItem, getDownloadUrl, getSignedUrl, updateItem } from './items'

export function createSupabaseApi(userId: string): ChestApi {
  return {
    addText: (text, o) => addTextItem({ text, source: o.source, expiresAt: o.expiresAt }),
    addFile: (file, o) => addFileItem(file, { userId, source: o.source, expiresAt: o.expiresAt }),
    update: updateItem,
    remove: deleteItem,
    viewUrl: getSignedUrl,
    downloadUrl: getDownloadUrl,
  }
}

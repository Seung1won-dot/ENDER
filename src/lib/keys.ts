/** 안내 문구에 쓰는 단축키 표기. 맥·iOS 는 ⌘, 그 외는 Ctrl. */
export const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
export const PASTE_KEY = IS_APPLE ? '⌘V' : 'Ctrl+V'

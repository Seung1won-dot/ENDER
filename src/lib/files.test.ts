import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  clipboardFileName,
  fileExt,
  formatSize,
  isBlockedFile,
  isImageMime,
  sanitizeFileName,
  validateFile,
} from './files'

describe('fileExt', () => {
  it('소문자 확장자', () => {
    expect(fileExt('Report.PDF')).toBe('pdf')
    expect(fileExt('archive.tar.gz')).toBe('gz')
  })
  it('없으면 빈 문자열', () => {
    expect(fileExt('README')).toBe('')
    expect(fileExt('.bashrc')).toBe('')
  })
})

describe('isBlockedFile', () => {
  it('실행 파일 차단', () => {
    for (const n of ['a.exe', 'a.MSI', 'a.bat', 'a.cmd', 'a.com', 'a.scr', 'a.vbs', 'a.jar', 'a.apk', 'a.dmg', 'a.pkg']) {
      expect(isBlockedFile(n), n).toBe(true)
    }
  })
  it('스크립트 텍스트와 일반 파일은 허용', () => {
    for (const n of ['a.sh', 'a.ps1', 'a.js', 'a.pdf', 'a.png', 'README']) {
      expect(isBlockedFile(n), n).toBe(false)
    }
  })
})

describe('sanitizeFileName', () => {
  it('한글·공백·특수문자를 _ 로', () => {
    expect(sanitizeFileName('회의 자료 (최종).pdf')).toBe('_.pdf')
  })
  it('ASCII 는 유지, 연속 _ 는 하나로', () => {
    expect(sanitizeFileName('my  file__v2.PNG')).toBe('my_file_v2.PNG')
  })
  it('경로 구분자 제거', () => {
    expect(sanitizeFileName('C:\\Users\\me\\a.txt')).toBe('a.txt')
    expect(sanitizeFileName('/tmp/a.txt')).toBe('a.txt')
  })
  it('선행 . 제거, 100자 제한, 빈 결과는 file', () => {
    expect(sanitizeFileName('..hidden')).toBe('hidden')
    expect(sanitizeFileName('x'.repeat(150)).length).toBe(100)
    expect(sanitizeFileName('한글만')).toBe('file')
  })
})

describe('formatSize', () => {
  it('단위 변환', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(10 * 1024 * 1024)).toBe('10.0 MB')
    expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB')
  })
})

describe('isImageMime', () => {
  it('image/* 만 true', () => {
    expect(isImageMime('image/png')).toBe(true)
    expect(isImageMime('application/pdf')).toBe(false)
    expect(isImageMime(null)).toBe(false)
    expect(isImageMime(undefined)).toBe(false)
  })
})

describe('validateFile', () => {
  it('정상 파일은 null', () => {
    expect(validateFile({ name: 'a.pdf', size: 1024 })).toBeNull()
  })
  it('차단 확장자', () => {
    expect(validateFile({ name: 'setup.exe', size: 10 })).toContain('실행 파일')
  })
  it('50MB 초과', () => {
    expect(validateFile({ name: 'big.zip', size: MAX_FILE_BYTES + 1 })).toContain('50MB')
    expect(validateFile({ name: 'ok.zip', size: MAX_FILE_BYTES })).toBeNull()
  })
  it('빈 파일', () => {
    expect(validateFile({ name: 'empty.txt', size: 0 })).toContain('비어')
  })
})

describe('clipboardFileName', () => {
  const now = new Date(2026, 8, 25, 14, 5, 9) // 2026-09-25 14:05:09 로컬
  it('기본 이름 image.png 는 pasted-타임스탬프로', () => {
    expect(clipboardFileName('image.png', 'image/png', now)).toBe('pasted-20260925-140509.png')
  })
  it('빈 이름도 타임스탬프, 확장자는 MIME 에서', () => {
    expect(clipboardFileName('', 'image/jpeg', now)).toBe('pasted-20260925-140509.jpg')
  })
  it('다른 이름은 그대로', () => {
    expect(clipboardFileName('screenshot.png', 'image/png', now)).toBe('screenshot.png')
  })
})

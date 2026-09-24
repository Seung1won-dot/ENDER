import { useEffect, useState } from 'react'

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

export function useDropzone(onFiles: (files: File[]) => void): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let depth = 0

    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setActive(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) onFiles(files)
    }

    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [onFiles])

  return active
}

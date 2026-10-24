import { useState } from 'react'
import { useT } from '../../i18n'
import { useRoomStore } from '../../store/roomStore'

interface PhotoButtonProps {
  personId: string
  personName: string
  hasPhoto: boolean
}

/** Upload (or remove) a person's photo; it is resized to 256×256 WebP before uploading. */
export function PhotoButton({ personId, personName, hasPhoto }: PhotoButtonProps) {
  const t = useT()
  const setPersonPhoto = useRoomStore((s) => s.setPersonPhoto)
  const [busy, setBusy] = useState(false)

  const change = async (image: Blob | null) => {
    setBusy(true)
    try {
      await setPersonPhoto(personId, image)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="flex shrink-0 items-center">
      <label
        title={hasPhoto ? t.photos.change(personName) : t.photos.add(personName)}
        className={`relative cursor-pointer rounded px-1 text-xs hover:bg-slate-100 ${busy ? 'animate-pulse' : ''} ${
          hasPhoto ? 'text-sky-600' : 'text-slate-400'
        }`}
      >
        {busy ? '…' : '📷'}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={t.photos.input(personName)}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void change(file)
          }}
        />
      </label>
      {hasPhoto && !busy && (
        <button
          type="button"
          title={t.photos.remove(personName)}
          onClick={() => void change(null)}
          className="rounded px-0.5 text-[10px] text-slate-400 hover:text-rose-600"
        >
          ⌫
        </button>
      )}
    </span>
  )
}

import { EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'

interface Props {
  /** 같은 화면에 여러 개가 있어도 라디오 그룹이 섞이지 않도록 고유한 이름 */
  name: string
  value: ExpiryPreset
  onChange: (p: ExpiryPreset) => void
  label?: string
  /** 바깥에 라벨이 따로 있으면 false */
  showLabel?: boolean
  disabled?: boolean
}

/** 만료 선택 세그먼트. 네이티브 라디오라 키보드 화살표 이동이 그냥 된다. */
export function ExpirySegment({ name, value, onChange, label = '만료', showLabel = true, disabled = false }: Props) {
  return (
    <fieldset className="seg">
      <legend className="sr-only">{label}</legend>
      {showLabel && (
        <span className="seg-label" aria-hidden="true">
          {label}
        </span>
      )}
      <div className="seg-group">
        {EXPIRY_PRESETS.map((p) => (
          <label key={p.value} className="seg-opt">
            <input
              type="radio"
              name={name}
              value={p.value}
              checked={value === p.value}
              disabled={disabled}
              onChange={() => onChange(p.value)}
            />
            <span>{p.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

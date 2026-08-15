/** Hours + minutes inputs (stored as total minutes) */
export function DurationInput({
    totalMinutes,
    onChange,
    disabled,
    id,
}: {
    totalMinutes: number;
    onChange: (totalMinutes: number) => void;
    disabled?: boolean;
    id?: string;
}) {
    const hours = Math.min(23, Math.floor(totalMinutes / 60));   // BUG-09: cap at 23h
    const minutes = totalMinutes % 60;

    const update = (h: number, m: number) => {
        onChange(Math.max(0, Math.min(23, h) * 60 + Math.min(59, m)));
    };

    const hrId = id ? `${id}-hours` : undefined;
    const minId = id ? `${id}-minutes` : undefined;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
                id={hrId}
                type="number"
                min={0}
                max={23}
                disabled={disabled}
                aria-label="Hours"
                style={{ width: '54px', padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                className="duration-input"
                value={hours}
                onChange={(e) => update(parseInt(e.target.value, 10) || 0, minutes)}
            />
            <span className="field-hint" aria-hidden="true">h</span>
            <input
                id={minId}
                type="number"
                min={0}
                max={59}
                disabled={disabled}
                aria-label="Minutes"
                style={{ width: '54px', padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                className="duration-input"
                value={minutes}
                onChange={(e) => update(hours, parseInt(e.target.value, 10) || 0)}
            />
            <span className="field-hint" aria-hidden="true">m</span>
        </div>
    );
}

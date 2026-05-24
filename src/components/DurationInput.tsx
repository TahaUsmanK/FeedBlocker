interface DurationInputProps {
    totalMinutes: number;
    onChange: (totalMinutes: number) => void;
    disabled?: boolean;
}

/** Hours + minutes inputs (stored as total minutes) */
export function DurationInput({ totalMinutes, onChange, disabled }: DurationInputProps) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const update = (h: number, m: number) => {
        onChange(Math.max(0, h * 60 + m));
    };

    return (
        <div className="flex items-center gap-1.5">
            <input
                type="number"
                min={0}
                max={23}
                disabled={disabled}
                className="w-14 p-2 border border-gray-300 rounded-lg text-right font-mono text-sm disabled:opacity-50"
                value={hours}
                onChange={(e) => update(parseInt(e.target.value, 10) || 0, minutes)}
            />
            <span className="text-xs text-gray-500">h</span>
            <input
                type="number"
                min={0}
                max={59}
                disabled={disabled}
                className="w-14 p-2 border border-gray-300 rounded-lg text-right font-mono text-sm disabled:opacity-50"
                value={minutes}
                onChange={(e) => update(hours, parseInt(e.target.value, 10) || 0)}
            />
            <span className="text-xs text-gray-500">m</span>
        </div>
    );
}

export interface Segment {
  value: string;
  label: string;
}

interface SegmentedProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ segments, value, onChange }: SegmentedProps) {
  return (
    <div className="ds-seg" role="tablist">
      {segments.map((segment, index) => {
        const classes = [
          'ds-seg__btn',
          value === segment.value ? 'ds-seg__btn--active' : '',
          index === 0 ? 'ds-seg__btn--first' : '',
          index === segments.length - 1 ? 'ds-seg__btn--last' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={value === segment.value}
            className={classes}
            onClick={() => onChange(segment.value)}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}

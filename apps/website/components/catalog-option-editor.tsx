'use client';
import { useEffect, useId, useState } from 'react';
import {
  fieldsFor,
  type OptionSpec,
  type RecipeKey,
  type RecipeOptions,
} from '../lib/catalog-options';

function NumberField({
  recipe,
  name,
  spec,
  value,
  onCommit,
}: {
  recipe: RecipeKey;
  name: string;
  spec: Extract<OptionSpec, { kind: 'number' }>;
  value: number | string | undefined;
  onCommit(value: number | undefined): void;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => {
    setDraft(value === undefined ? '' : String(value));
    setError('');
  }, [value]);
  return (
    <label>
      {recipe}.{name}
      <input
        type="number"
        aria-label={`${recipe}.${name}`}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        placeholder={`Default: ${spec.default}`}
        value={draft}
        aria-invalid={Boolean(error)}
        aria-describedby={id}
        onChange={(event) => {
          setDraft(event.target.value);
          setError('');
        }}
        onBlur={() => {
          if (draft === '') {
            onCommit(undefined);
            return;
          }
          const parsed = Number(draft);
          if (
            !Number.isFinite(parsed) ||
            parsed < spec.min ||
            parsed > spec.max
          ) {
            setError(
              `Use ${spec.min}–${spec.max}; the previous value remains active.`,
            );
            return;
          }
          onCommit(parsed);
        }}
      />
      <span className="caption" id={id} aria-live="polite">
        {error ||
          `${spec.unit}. Default ${spec.default}; editor range ${spec.min}–${spec.max}. Leave empty to omit. Commit by leaving the field.`}
      </span>
    </label>
  );
}
export function CatalogOptionEditor({
  recipe,
  options,
  onChange,
}: {
  recipe: RecipeKey;
  options: RecipeOptions;
  onChange(options: RecipeOptions): void;
}) {
  const selected: Readonly<Record<string, number | string>> =
    options[recipe] ?? {};
  function commit(name: string, value: number | string | undefined) {
    const next = { ...selected };
    if (value === undefined) delete next[name];
    else next[name] = value;
    const all = { ...options };
    if (Object.keys(next).length) Object.assign(all, { [recipe]: next });
    else delete all[recipe];
    onChange(all);
  }
  return (
    <fieldset className="catalog-options">
      <legend>{recipe} options</legend>
      {Object.entries(fieldsFor(recipe)).map(([name, spec]) =>
        spec.kind === 'number' ? (
          <NumberField
            key={name}
            recipe={recipe}
            name={name}
            spec={spec}
            value={selected[name]}
            onCommit={(value) => commit(name, value)}
          />
        ) : (
          <label key={name}>
            {recipe}.{name}
            <select
              value={selected[name] ?? ''}
              onChange={(event) =>
                commit(name, event.target.value || undefined)
              }
            >
              <option value="">Default: {spec.default}</option>
              {spec.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ),
      )}
    </fieldset>
  );
}

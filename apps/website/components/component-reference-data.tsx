import type { catalog } from '../lib/catalog';
import { componentControls } from '../lib/component-controls';
import { AnimationReference } from './animation-reference';

type Component = (typeof catalog)[number];

export function ComponentControls({ item }: { item: Component }) {
  const controls = componentControls(item);
  return (
    <section className="catalog-props" aria-label="Public controls table">
      <table>
        <thead>
          <tr>
            <th scope="col">Control</th>
            <th scope="col">Type / purpose</th>
            <th scope="col">Omitted default</th>
          </tr>
        </thead>
        <tbody>
          {controls.map(([name, type, value]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{type}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ComponentAnimations({
  item,
  heading = true,
}: {
  item: Component;
  heading?: boolean;
}) {
  return (
    <AnimationReference
      heading={heading}
      recipes={[
        ...item.idles,
        ...item.reveals,
        ...(item.family === 'typing'
          ? []
          : item.family === 'region'
            ? ['customReveal']
            : ['customIdle', 'customReveal']),
      ]}
    />
  );
}

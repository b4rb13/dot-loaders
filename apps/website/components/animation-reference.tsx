import { fieldsFor, isRecipeKey } from '../lib/catalog-options';
export function AnimationReference({
  recipes,
  heading = true,
}: {
  recipes: readonly string[];
  heading?: boolean;
}) {
  return (
    <div className="animation-reference">
      {heading && <h3>Typed factory options</h3>}
      <p>
        Pass an optional typed options object to the named factory, then pass
        its result to the matching animation phase. Omitted fields use the
        defaults below. The editor admits only these bounded values; external
        callers still go through the public factory’s validation. The editor’s
        4,000ms dissolve limit is a website limit, not a factory ceiling. The
        loading owner’s explicit total duration replaces the whole handoff.
      </p>
      {recipes.filter(isRecipeKey).map((recipe) => (
        <details key={recipe}>
          <summary>{recipe}(options)</summary>
          <div className="catalog-props">
            <table>
              <caption>{recipe} option defaults and editor limits</caption>
              <thead>
                <tr>
                  <th scope="col">Option</th>
                  <th scope="col">Default</th>
                  <th scope="col">Units / editor values</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(fieldsFor(recipe)).map(([name, spec]) => (
                  <tr key={name}>
                    <th scope="row">
                      <code>{name}</code>
                    </th>
                    <td>{spec.default}</td>
                    <td>
                      {spec.unit};{' '}
                      {spec.kind === 'number'
                        ? `${spec.min}–${spec.max}`
                        : spec.values.join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

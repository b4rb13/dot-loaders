import Link from 'next/link';
import { Panel } from '../panel';
export default function Page() {
  return (
    <>
      <Panel key="other" name="Other account" initialState="ready">
        <p id="other-detail">Second server-rendered outcome</p>
      </Panel>
      <Link id="navigate" href="/" prefetch={false}>
        Home account
      </Link>
    </>
  );
}

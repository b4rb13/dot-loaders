import Link from 'next/link';
import { Account } from '../policy';
export default function Other() {
  return (
    <main>
      <h1>Another server account</h1>
      <Account key="other" initialState="ready">
        <p id="other-detail">Available account detail</p>
      </Account>
      <Link href="/" prefetch={false}>
        Back to the first account
      </Link>
    </main>
  );
}
